const express = require('express');
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const router = express.Router();

// In-memory cart storage (in production, use Redis or database)
let carts = {};

// Export carts for use in other modules
module.exports.carts = carts;

// Get cart
router.get('/', auth, (req, res) => {
  const userId = req.user._id.toString();
  const cart = carts[userId] || { items: [], total: 0 };
  res.json(cart);
});

// Add to cart
router.post('/add', auth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'Invalid product or quantity' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    if (!carts[userId]) {
      carts[userId] = { items: [], total: 0 };
    }

    const existingItemIndex = carts[userId].items.findIndex(
      item => item.productId === productId
    );

    if (existingItemIndex > -1) {
      carts[userId].items[existingItemIndex].quantity += quantity;
    } else {
      carts[userId].items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: quantity
      });
    }

    // Calculate total
    carts[userId].total = carts[userId].items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    res.json(carts[userId]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update cart item
router.put('/update', auth, (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { productId, quantity } = req.body;

    if (!carts[userId]) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = carts[userId].items.findIndex(
      item => item.productId === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      carts[userId].items.splice(itemIndex, 1);
    } else {
      carts[userId].items[itemIndex].quantity = quantity;
    }

    // Calculate total
    carts[userId].total = carts[userId].items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    res.json(carts[userId]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove from cart
router.delete('/remove/:productId', auth, (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { productId } = req.params;

    if (!carts[userId]) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    carts[userId].items = carts[userId].items.filter(
      item => item.productId !== productId
    );

    // Calculate total
    carts[userId].total = carts[userId].items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    res.json(carts[userId]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Clear cart
router.delete('/clear', auth, (req, res) => {
  const userId = req.user._id.toString();
  carts[userId] = { items: [], total: 0 };
  res.json({ message: 'Cart cleared', cart: carts[userId] });
});

module.exports = router;
