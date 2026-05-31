const fs = require('fs');
const path = require('path');

const initDb = async () => {
  // We require the pool here to ensure db.js exports it first
  const { pool } = require('./db');
  
  console.log('Initializing Supabase database schema...');
  
  const client = await pool.connect();
  try {
    // 1. Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        brand TEXT NOT NULL,
        thickness TEXT,
        size TEXT,
        "pricingType" TEXT NOT NULL DEFAULT 'area',
        length NUMERIC,
        breadth NUMERIC,
        "purchasePrice" NUMERIC NOT NULL,
        "sellingPrice" NUMERIC NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    
    // 2. Create bills table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        items JSONB NOT NULL,
        subtotal NUMERIC NOT NULL,
        gst NUMERIC NOT NULL,
        "deliveryFee" NUMERIC NOT NULL,
        "totalAmount" NUMERIC NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    
    console.log('Database tables successfully verified/created.');

    // 3. Check if products table is empty
    const { rows: prodRows } = await client.query('SELECT COUNT(*) FROM products');
    const productCount = parseInt(prodRows[0].count, 10);
    
    if (productCount === 0) {
      console.log('Products table is empty. Checking for MongoDB backup to restore...');
      
      const backupPath = '/Users/anantsharma/.gemini/antigravity-ide/brain/1724cb14-1a38-4bc5-9b0d-7909a9cbbc9a/scratch/mongodb_dump.json';
      
      if (fs.existsSync(backupPath)) {
        console.log(`Found backup file at ${backupPath}. Starting data restoration...`);
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        
        // Restore products
        if (Array.isArray(backupData.products) && backupData.products.length > 0) {
          console.log(`Restoring ${backupData.products.length} products...`);
          for (const prod of backupData.products) {
            await client.query(`
              INSERT INTO products (
                id, name, category, brand, thickness, size, "pricingType", 
                length, breadth, "purchasePrice", "sellingPrice", quantity, "createdAt", "updatedAt"
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              ON CONFLICT (id) DO NOTHING
            `, [
              prod._id,
              prod.name,
              prod.category,
              prod.brand,
              prod.thickness || null,
              prod.size || null,
              prod.pricingType || 'area',
              prod.length !== undefined ? prod.length : null,
              prod.breadth !== undefined ? prod.breadth : null,
              prod.purchasePrice,
              prod.sellingPrice,
              prod.quantity,
              prod.createdAt || new Date(),
              prod.updatedAt || new Date()
            ]);
          }
          console.log('Products successfully restored.');
        }
        
        // Restore bills
        if (Array.isArray(backupData.bills) && backupData.bills.length > 0) {
          console.log(`Restoring ${backupData.bills.length} bills...`);
          for (const bill of backupData.bills) {
            await client.query(`
              INSERT INTO bills (
                id, items, subtotal, gst, "deliveryFee", "totalAmount", "createdAt", "updatedAt"
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (id) DO NOTHING
            `, [
              bill._id,
              JSON.stringify(bill.items || []),
              bill.subtotal,
              bill.gst,
              bill.deliveryFee,
              bill.totalAmount,
              bill.createdAt || new Date(),
              bill.updatedAt || new Date()
            ]);
          }
          console.log('Bills successfully restored.');
        }
        
        console.log('🎉 MongoDB data has been completely restored to Supabase!');
      } else {
        console.log('No MongoDB backup file found. Skipping auto-migration.');
      }
    } else {
      console.log(`Products table contains ${productCount} existing items. Skipping auto-migration.`);
    }
  } catch (error) {
    console.error('Error initializing/migrating database schema:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = initDb;
