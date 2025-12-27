// Disable TLS certificate validation for Supabase connections
// This is needed because Supabase uses self-signed certificates in some cases
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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
  // Force SSL config for Supabase - rejectUnauthorized: false allows self-signed certs
  // This is required for Supabase's SSL certificates
  ssl: isSupabase ? { 
    rejectUnauthorized: false
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