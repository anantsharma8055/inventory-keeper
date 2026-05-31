const { pool } = require('../config/db');

// Helper to generate a unique ID similar in length to MongoDB ObjectId
const generateId = () => {
  return 'prod_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// Helper to map PostgreSQL row key "id" to MongoDB-compatible "_id"
const mapProduct = (row) => {
  if (!row) return null;
  const { id, ...rest } = row;
  return {
    _id: id,
    ...rest
  };
};

const addProduct = async (req, res, next) => {
  try {
    const id = generateId();
    const {
      name,
      category,
      brand,
      thickness,
      size,
      pricingType = 'area',
      length,
      breadth,
      purchasePrice,
      sellingPrice,
      quantity
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products (
        id, name, category, brand, thickness, size, "pricingType", 
        length, breadth, "purchasePrice", "sellingPrice", quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        name,
        category,
        brand,
        thickness || null,
        size || null,
        pricingType,
        length !== undefined ? Number(length) : null,
        breadth !== undefined ? Number(breadth) : null,
        Number(purchasePrice),
        Number(sellingPrice),
        Number(quantity)
      ]
    );

    res.status(201).json({
      message: 'Product added successfully',
      data: mapProduct(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY "createdAt" DESC');
    const mappedProducts = result.rows.map(mapProduct);

    res.status(200).json({
      message: 'Products fetched successfully',
      count: mappedProducts.length,
      data: mappedProducts
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = [];
    const values = [];
    let index = 1;

    // Permitted fields to be updated
    const allowedFields = [
      'name',
      'category',
      'brand',
      'thickness',
      'size',
      'pricingType',
      'length',
      'breadth',
      'purchasePrice',
      'sellingPrice',
      'quantity'
    ];

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        // Enclose camelCase field names in double quotes for PostgreSQL
        const columnName = (key === 'pricingType' || key === 'purchasePrice' || key === 'sellingPrice')
          ? `"${key}"`
          : key;
        
        fields.push(`${columnName} = $${index}`);
        
        // Handle number conversions or defaults
        if (key === 'length' || key === 'breadth') {
          values.push(req.body[key] !== null ? Number(req.body[key]) : null);
        } else if (key === 'purchasePrice' || key === 'sellingPrice' || key === 'quantity') {
          values.push(Number(req.body[key]));
        } else {
          values.push(req.body[key]);
        }
        
        index++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Set updatedAt
    fields.push(`"updatedAt" = $${index}`);
    values.push(new Date());
    index++;

    // Push the ID parameter at the end
    values.push(id);
    const idIndex = index;

    const query = `
      UPDATE products 
      SET ${fields.join(', ')} 
      WHERE id = $${idIndex} 
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({
      message: 'Product updated successfully',
      data: mapProduct(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct
};
