// Database seed script to add sample products
const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const sampleProducts = [
    {
        name: 'Wireless Headphones',
        description: 'Premium wireless headphones with noise cancellation and 30-hour battery life. Perfect for music lovers and professionals.',
        price: 199.99,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        category: 'Electronics',
        stock: 50
    },
    {
        name: 'Smart Watch',
        description: 'Feature-rich smartwatch with fitness tracking, heart rate monitor, and smartphone notifications. Water-resistant design.',
        price: 299.99,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        category: 'Electronics',
        stock: 30
    },
    {
        name: 'Laptop Backpack',
        description: 'Durable laptop backpack with padded compartments, USB charging port, and water-resistant material. Fits up to 15.6" laptops.',
        price: 79.99,
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
        category: 'Accessories',
        stock: 75
    },
    {
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking, long battery life, and comfortable grip. Compatible with all devices.',
        price: 29.99,
        image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500',
        category: 'Electronics',
        stock: 100
    },
    {
        name: 'Mechanical Keyboard',
        description: 'RGB backlit mechanical keyboard with Cherry MX switches. Perfect for gaming and typing enthusiasts.',
        price: 149.99,
        image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=500',
        category: 'Electronics',
        stock: 40
    },
    {
        name: 'USB-C Hub',
        description: 'Multi-port USB-C hub with HDMI, USB 3.0, SD card reader, and power delivery. Expand your laptop connectivity.',
        price: 49.99,
        image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=500',
        category: 'Accessories',
        stock: 60
    },
    {
        name: 'Desk Lamp',
        description: 'LED desk lamp with adjustable brightness and color temperature. Eye-friendly lighting for work and study.',
        price: 39.99,
        image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500',
        category: 'Furniture',
        stock: 45
    },
    {
        name: 'Phone Stand',
        description: 'Adjustable phone stand made from premium aluminum. Perfect for video calls, watching videos, and hands-free use.',
        price: 19.99,
        image: 'https://images.unsplash.com/photo-1601972602237-8c79241e468b?w=500',
        category: 'Accessories',
        stock: 80
    },
    {
        name: 'Webcam',
        description: '1080p HD webcam with auto-focus and built-in microphone. Ideal for video conferencing and streaming.',
        price: 89.99,
        image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=500',
        category: 'Electronics',
        stock: 35
    },
    {
        name: 'Monitor Stand',
        description: 'Ergonomic monitor stand with storage space and cable management. Elevate your workspace organization.',
        price: 59.99,
        image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=500',
        category: 'Furniture',
        stock: 25
    }
];

async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Clear existing products
        await Product.deleteMany({});
        console.log('Cleared existing products');

        // Insert sample products
        await Product.insertMany(sampleProducts);
        console.log(`Successfully seeded ${sampleProducts.length} products`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
