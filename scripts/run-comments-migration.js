import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Running comments table migration...');

    const migrationSQL = readFileSync(
      join(__dirname, '..', 'migrations', 'add-comments-table.sql'),
      'utf-8'
    );

    await pool.query(migrationSQL);

    console.log('✅ Comments table migration completed successfully!');
    console.log('   - Created comments table');
    console.log('   - Added indexes for performance');
  } catch (error) {
    console.error('❌ Comments table migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

