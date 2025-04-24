import { pool } from './db';
import { hashPassword } from './auth';

const init = async () => {
  try {
    console.log('Starting user table rebuild...');
    
    // Create a connection
    const client = await pool.connect();
    
    try {
      // Hash the default password "justtesting"
      const hashedPassword = await hashPassword('justtesting');
      
      // Start a transaction
      await client.query('BEGIN');
      
      // Drop and recreate the users table
      console.log('Dropping users table...');
      await client.query('DROP TABLE IF EXISTS users CASCADE');
      
      console.log('Creating users table...');
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          "fullName" VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          role VARCHAR(255) NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      // Insert default users for each role
      console.log('Creating default users...');
      
      // CEO
      await client.query(`
        INSERT INTO users (username, password, "fullName", email, role)
        VALUES ('ceo', $1, 'CEO User', 'ceo@firmos.ai', 'ceo')
      `, [hashedPassword]);
      
      // COO
      await client.query(`
        INSERT INTO users (username, password, "fullName", email, role)
        VALUES ('coo', $1, 'COO User', 'coo@firmos.ai', 'coo')
      `, [hashedPassword]);
      
      // Hiring Manager
      await client.query(`
        INSERT INTO users (username, password, "fullName", email, role)
        VALUES ('hiringmanager', $1, 'Hiring Manager', 'hiring@firmos.ai', 'hiringManager')
      `, [hashedPassword]);
      
      // Project Manager
      await client.query(`
        INSERT INTO users (username, password, "fullName", email, role)
        VALUES ('projectmanager', $1, 'Project Manager', 'project@firmos.ai', 'projectManager')
      `, [hashedPassword]);
      
      // Admin (keeping the admin role for backward compatibility)
      await client.query(`
        INSERT INTO users (username, password, "fullName", email, role)
        VALUES ('admin', $1, 'Admin User', 'admin@firmos.ai', 'admin')
      `, [hashedPassword]);
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log('User table rebuilt successfully!');
      console.log('Default password for all users: "justtesting"');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error rebuilding users table:', error);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    // Close the pool - comment this out if running in a server context
    // await pool.end();
    process.exit(0);
  }
};

init();