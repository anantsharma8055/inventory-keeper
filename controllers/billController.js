const { pool } = require('../config/db');

const GST_RATE = 0.18;

// Helper to generate a unique ID for bills
const generateBillId = () => {
  return 'bill_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// Helper to map PostgreSQL row key "id" to MongoDB-compatible "_id"
const mapBill = (row) => {
  if (!row) return null;
  const { id, ...rest } = row;
  return {
    _id: id,
    ...rest
  };
};

const createBill = async (req, res, next) => {
  const { items, deliveryFee = 0, applyGst = false } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: 'Items are required and must be a non-empty array'
    });
  }

  // Establish client connection from the pool to handle standard SQL transactions
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let totalPrice = 0;
    const billItems = [];

    for (const item of items) {
      const { productId, quantity, rate, price } = item;

      if (!productId || !quantity || quantity <= 0) {
        throw new Error('Each item must have valid productId and quantity greater than 0');
      }

      // SELECT ... FOR UPDATE locks the target product row to prevent concurrent stock issues
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [productId]);
      const product = prodRes.rows[0];

      if (!product) {
        throw new Error(`Product not found for ID: ${productId}`);
      }

      if (product.quantity < quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}`);
      }

      const isArea = product.pricingType !== 'unit';
      let itemTotal = 0;
      let area = 0;

      if (isArea) {
        if (!rate || rate <= 0) {
          throw new Error(`Item ${product.name} must have a valid rate greater than 0`);
        }
        area = Number(product.length) * Number(product.breadth);
        itemTotal = area * Number(rate) * Number(quantity);
      } else {
        if (!price || price <= 0) {
          throw new Error(`Item ${product.name} must have a valid price greater than 0`);
        }
        itemTotal = Number(price) * Number(quantity);
      }

      totalPrice += itemTotal;

      // Update product quantity in database
      const newQty = product.quantity - quantity;
      await client.query('UPDATE products SET quantity = $1, "updatedAt" = NOW() WHERE id = $2', [newQty, productId]);

      billItems.push({
        productId: product.id,
        name: product.name,
        pricingType: product.pricingType,
        length: product.length ? Number(product.length) : undefined,
        breadth: product.breadth ? Number(product.breadth) : undefined,
        quantity: Number(quantity),
        rate: isArea ? Number(rate) : undefined,
        price: isArea ? undefined : Number(price),
        area: isArea ? Number(area) : undefined,
        itemTotal: Number(itemTotal)
      });
    }

    const subtotal = totalPrice;
    const gst = applyGst ? subtotal * GST_RATE : 0;
    const grandTotal = subtotal + gst + Number(deliveryFee);
    const billId = generateBillId();

    // Insert new bill with JSONB items array
    const billRes = await client.query(
      `INSERT INTO bills (id, items, subtotal, gst, "deliveryFee", "totalAmount")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [billId, JSON.stringify(billItems), subtotal, gst, Number(deliveryFee), grandTotal]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Bill created successfully',
      data: mapBill(billRes.rows[0])
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.message.includes('Insufficient stock') || error.message.includes('not found')) {
      return res.status(400).json({ message: error.message });
    }

    next(error);
  } finally {
    client.release();
  }
};

const getBills = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM bills ORDER BY "createdAt" DESC');
    const mappedBills = result.rows.map(mapBill);

    res.status(200).json({
      message: 'Bills fetched successfully',
      data: mappedBills
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBill,
  getBills
};
