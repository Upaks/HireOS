const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running Slack integration migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add-slack-integration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('✅ Slack integration migration completed successfully!');
    console.log('   Added columns:');
    console.log('   - slack_webhook_url');
    console.log('   - slack_notification_scope');
    console.log('   - slack_notification_roles');
    console.log('   - slack_notification_events');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

