// SECURITY FIX: Only disable TLS validation in development for local testing
// In production, proper SSL certificates must be used
// Supabase uses valid SSL certificates - we should validate them in production
if (process.env.NODE_ENV !== 'production' && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  console.warn('⚠️  WARNING: TLS certificate validation disabled in development mode only');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
} else if (process.env.NODE_ENV === 'production') {
  // Force TLS validation in production
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  console.log('✅ TLS certificate validation enabled for production');
}

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Validate DATABASE_URL format
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl.includes('supabase.co') && !dbUrl.includes('neon.tech') && !dbUrl.includes('postgresql://')) {
  console.warn("⚠️  Warning: DATABASE_URL doesn't look like a valid PostgreSQL connection string");
}

// Always use SSL for Supabase connections, but don't reject self-signed certs
const isSupabase = dbUrl.includes('supabase.co') || dbUrl.includes('pooler.supabase.com');

export const pool = new Pool({ 
  connectionString: dbUrl,
  // SECURITY FIX: Validate SSL certificates in production
  // Supabase uses valid SSL certificates - we should validate them
  ssl: isSupabase ? { 
    rejectUnauthorized: process.env.NODE_ENV === 'production' // Validate in production
  } : (dbUrl.includes('sslmode=require') ? true : undefined),
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10
});

export const db = drizzle(pool, { schema });

// Test connection on startup (non-blocking - app will start even if this fails)
// Use connect() method which handles connection better than query()
setTimeout(() => {
  pool.connect()
    .then((client) => {
      client.query('SELECT 1').then(() => {
        console.log('✅ Database connection successful');
        client.release();
      }).catch((err) => {
        client.release();
        throw err;
      });
    })
    .catch((error) => {
      // Don't block startup - just log the error
      console.warn('⚠️  Initial database connection test failed:', error.message);
      console.warn('   The app will continue - database queries will connect when needed.');
      if (error.message.includes('ENOTFOUND')) {
        console.warn('   Note: DNS resolution issue - queries may work when actually executed.');
      }
    });
}, 2000); // Wait 2 seconds before testing