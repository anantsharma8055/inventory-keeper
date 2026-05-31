require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const billRoutes = require('./routes/billRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Initialize DB and catch any startup errors so they don't crash Node/Vercel serverless processes
connectDB().catch((err) => {
  console.error('⚠️ Database connection failed to initialize on startup:', err.message);
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Plywood Inventory API is running' });
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
