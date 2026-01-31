# E-Commerce Site

A full-stack e-commerce application with shopping cart and order processing.

**Author:** Jayesh Patil

## Features

- User registration and login
- Product listings and details
- Shopping cart
- Order processing
- Order history

## Tech Stack

- **Backend:** Node.js, Express.js, MongoDB
- **Frontend:** HTML, CSS, JavaScript

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up MongoDB (make sure it's running)

3. Create `.env` file:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/ecommerce
   JWT_SECRET=your-secret-key
   ```

4. Seed database (optional):
   ```bash
   npm run seed
   ```

5. Start server:
   ```bash
   npm start
   ```

6. Open `http://localhost:3000` in browser

## Usage

1. Register/Login to create account
2. Browse products on home page
3. Click product to see details
4. Add products to cart (requires login)
5. Go to Cart to manage items
6. Checkout with shipping address
7. View orders in Orders page

## License

ISC
