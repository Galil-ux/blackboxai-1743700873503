const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../config/db');
const getProductModel = require('../models/product');
const Product = getProductModel(db.sequelize);
const basicAuth = require('express-basic-auth');

// Admin authentication
router.use(basicAuth({
  users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'password123' },
  challenge: true,
  realm: 'Checkout System Admin'
}));

// Get all products with low stock
router.get('/products/low-stock', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        stock: {
          [Op.lt]: 10
        }
      }
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new product
router.post('/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update product
router.put('/products/:id', async (req, res) => {
  try {
    const [updated] = await Product.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const product = await Product.findByPk(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const deleted = await Product.destroy({
      where: { id: req.params.id }
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all products (admin view)
router.get('/products', async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;