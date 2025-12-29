import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, UserRoles } from "@shared/schema";
import { authRateLimiter } from "./security/rate-limit";
import { SecureLogger } from "./security/logger";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// SECURITY: Validate password strength
const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export function setupAuth(app: Express) {
  // SECURITY: Validate SESSION_SECRET
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret === "hireos-development-secret") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to a strong random value in production");
    }
    SecureLogger.warn("Using default SESSION_SECRET - this is insecure for production!");
  }
  if (sessionSecret && sessionSecret.length < 32) {
    SecureLogger.warn("SESSION_SECRET should be at least 32 characters for security");
  }

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret || "hireos-development-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true, // SECURITY: Prevent XSS access to cookies
      sameSite: 'strict', // SECURITY: Prevent CSRF attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // SECURITY: Add rate limiting to authentication endpoints
  app.post("/api/register", authRateLimiter, async (req, res, next) => {
    try {
      // Validate required fields
      if (!req.body.username || !req.body.password || !req.body.email || !req.body.fullName) {
        return res.status(400).json({ 
          message: "Missing required fields: username, password, email, and fullName are required" 
        });
      }

      // SECURITY: Validate password strength
      try {
        passwordSchema.parse(req.body.password);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Password does not meet security requirements",
            errors: error.errors.map(err => err.message)
          });
        }
        return res.status(400).json({ message: "Invalid password format" });
      }

      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists (by trying to get all users and checking email)
      // Note: This is a simple check. For better performance, add getUserByEmail method to storage
      const allUsers = await storage.getAllUsers();
      const existingUserByEmail = allUsers.find(u => u.email === req.body.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Add default role if not specified
      if (!req.body.role) {
        req.body.role = UserRoles.HIRING_MANAGER;
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      // SECURITY: Log registration (sanitized)
      SecureLogger.info("User registered", { userId: user.id, username: user.username, email: user.email });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      // SECURITY: Don't log sensitive data
      SecureLogger.error("Registration error", { error: error.message });
      
      // Handle database constraint violations (unique constraints)
      if (error.code === '23505') { // PostgreSQL unique violation
        if (error.constraint?.includes('username')) {
          return res.status(400).json({ message: "Username already exists" });
        }
        if (error.constraint?.includes('email')) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }
      next(error);
    }
  });

  // SECURITY: Add rate limiting to login endpoint
  app.post("/api/login", authRateLimiter, (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string } | undefined) => {
      if (err) {
        SecureLogger.error("Login error", { error: err.message });
        return next(err);
      }
      if (!user) {
        // SECURITY: Log failed login attempts (but don't log password)
        SecureLogger.warn("Failed login attempt", { username: req.body.username, ip: req.ip });
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      // SECURITY: Log successful login (sanitized)
      SecureLogger.info("User logged in", { userId: user.id, username: user.username });

      req.login(user, (err: Error | null) => {
        if (err) return next(err);
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err: Error | null) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });

  // Middleware to check authorization
  
  // Admin routes - accessible by ADMIN, CEO, and COO
  app.use("/api/admin", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userRole = req.user?.role as string;
    if (![UserRoles.ADMIN, UserRoles.CEO, UserRoles.COO].includes(userRole as any)) {
      return res.sendStatus(403);
    }
    next();
  });

  // COO routes - accessible by COO, CEO, DIRECTOR, and ADMIN 
  app.use("/api/coo", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userRole = req.user?.role as string;
    if (![UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN].includes(userRole as any)) {
      return res.sendStatus(403);
    }
    next();
  });
  
  // CEO routes - accessible by CEO, DIRECTOR, and ADMIN only
  app.use("/api/ceo", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userRole = req.user?.role as string;
    if (![UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN].includes(userRole as any)) {
      return res.sendStatus(403);
    }
    next();
  });
  
  // User management routes - accessible by COO, CEO, DIRECTOR, and ADMIN only
  app.use("/api/users", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userRole = req.user?.role as string;
    if (![UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN].includes(userRole as any)) {
      return res.sendStatus(403);
    }
    next();
  });
}
