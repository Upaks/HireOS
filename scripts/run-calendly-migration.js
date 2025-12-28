// Script to add Calendly columns to users table
// This can be run if drizzle-kit push fails due to certificate issues

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function runMigration() {
  try {
    console.log('📦 Adding Calendly columns to users table...');
    
    const sql = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS calendly_token TEXT,
      ADD COLUMN IF NOT EXISTS calendly_webhook_id TEXT;
    `;
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify columns were added
    const verifyResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('calendly_token', 'calendly_webhook_id')
      ORDER BY column_name;
    `);
    
    if (verifyResult.rows.length === 2) {
      console.log('✅ Verified: Both columns exist');
      verifyResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('⚠️  Warning: Expected 2 columns but found', verifyResult.rows.length);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

