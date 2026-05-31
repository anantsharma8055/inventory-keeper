const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && !process.env.VERCEL) {
  console.error('DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

// Cache initialization status to prevent redundant schema checks and tables creation on every serverless function cold start
let isInitialized = false;

const connectDB = async () => {
  if (isInitialized) {
    return;
  }

  const activeDbUrl = process.env.DATABASE_URL;

  if (!activeDbUrl) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  if (activeDbUrl.includes('[YOUR-PASSWORD]')) {
    throw new Error('DATABASE_URL contains the default "[YOUR-PASSWORD]" placeholder. Please set your actual database password in Vercel settings.');
  }

  try {
    const client = await pool.connect();
    console.log('Supabase PostgreSQL connected successfully');
    client.release();

    // Trigger tables initialization and auto-migration
    const initDb = require('./initDb');
    await initDb();
    
    isInitialized = true;
  } catch (error) {
    console.error('Supabase PostgreSQL connection error:', error.message);
    
    // In Vercel serverless environments, calling process.exit(1) crashes the entire invocation container,
    // which results in FUNCTION_INVOCATION_FAILED. Instead, we throw the error to let Express handle it nicely.
    if (process.env.VERCEL) {
      throw error;
    } else {
      process.exit(1);
    }
  }
};

// Expose both default and pool properties to preserve perfect compatibility
connectDB.pool = pool;
module.exports = connectDB;
