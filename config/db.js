const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

const connectDB = async () => {
  try {
    if (databaseUrl.includes('[YOUR-PASSWORD]')) {
      throw new Error('Please replace "[YOUR-PASSWORD]" in your .env file with your actual Supabase database password');
    }

    const client = await pool.connect();
    console.log('Supabase PostgreSQL connected successfully');
    client.release();

    // Trigger tables initialization and auto-migration
    const initDb = require('./initDb');
    await initDb();
  } catch (error) {
    console.error('Supabase PostgreSQL connection error:', error.message);
    if (databaseUrl.includes('[YOUR-PASSWORD]') || error.message.includes('password') || error.message.includes('authentication')) {
      console.error('\n⚠️  ACTION REQUIRED: Please open the ".env" file in your project and replace "[YOUR-PASSWORD]" with your actual Supabase database password!\n');
    }
    process.exit(1);
  }
};

// Expose both default and pool properties to preserve perfect compatibility
connectDB.pool = pool;
module.exports = connectDB;
