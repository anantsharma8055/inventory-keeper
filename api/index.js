require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('../config/db');
const productRoutes = require('../routes/productRoutes');
const billRoutes = require('../routes/billRoutes');
const errorHandler = require('../middleware/errorHandler');

const path = require('path');

const app = express();

// Initialize DB and catch any startup errors so they don't crash Node/Vercel serverless processes
connectDB().catch((err) => {
  console.error('⚠️ Database connection failed to initialize on startup:', err.message);
});

app.use(cors());
app.use(express.json());

// Serve all static frontend assets (HTML, CSS, JS, etc.) directly from the root directory
// In local development, they are located in parent directory relative to this function
app.use(express.static(path.join(__dirname, '..')));

// Route the root URL directly to your Plywood Inventory Dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'inventory.html'));
});

app.use('/', productRoutes);
app.use('/', billRoutes);

app.use(errorHandler);

// In Vercel serverless environment, Vercel acts as the HTTP listener and routes requests to the exported app.
// Running app.listen() directly inside Vercel will cause FUNCTION_INVOCATION_FAILED.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express app instance so Vercel can wrap and execute it as a Serverless Function
module.exports = app;
