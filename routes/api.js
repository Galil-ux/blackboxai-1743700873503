const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../config/db');
const getProductModel = require('../models/product');
const Product = getProductModel(db.sequelize);
const { v4: uuidv4 } = require('uuid');

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Checkout endpoint
router.post('/checkout', async (req, res) => {
  try {
    const { items, paymentMethod } = req.body;
    
    // Process inventory and validate stock
    await Product.processInventory(items);
    
    // Generate payment response
    const paymentResponse = {
      success: true,
      transactionId: paymentMethod === 'mpesa' 
        ? `MPESA-${uuidv4().substring(0, 6)}`
        : paymentMethod === 'card'
          ? `CARD-${uuidv4().substring(0, 8)}`
          : uuidv4(),
      ...(paymentMethod === 'mpesa' && { phone: req.body.phone })
    };

    res.json({
      success: true,
      payment: paymentResponse,
      timestamp: new Date()
    });
  } catch (err) {
    if (err.message.includes('Insufficient stock') || err.message.includes('Product')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;