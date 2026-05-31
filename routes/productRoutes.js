const express = require('express');
const {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

const router = express.Router();

router.post('/products', addProduct);
router.get('/products', getProducts);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

module.exports = router;
