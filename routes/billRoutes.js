const express = require('express');
const { createBill, getBills } = require('../controllers/billController');

const router = express.Router();

router.post('/bill', createBill);
router.get('/bills', getBills);

module.exports = router;
