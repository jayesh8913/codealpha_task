// Main app JavaScript
const API_URL = '/api';

// Load products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('products-grid').innerHTML = 
            '<p>Error loading products. Please try again later.</p>';
    }
}

// Display products
function displayProducts(products) {
    const grid = document.getElementById('products-grid');
    
    if (products.length === 0) {
        grid.innerHTML = '<p>No products available.</p>';
        return;
    }

    grid.innerHTML = products.map(product => `
        <div class="product-card" onclick="viewProduct('${product._id}')">
            <img src="${product.image}" alt="${product.name}" class="product-image" 
                 onerror="this.src='https://via.placeholder.com/300'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">$${product.price.toFixed(2)}</p>
                <p class="product-description">${product.description}</p>
                <p class="product-stock ${product.stock < 10 ? 'low' : ''}">
                    ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </p>
            </div>
        </div>
    `).join('');
}

// View product details
function viewProduct(productId) {
    window.location.href = `product-details.html?id=${productId}`;
}

// Update cart count
async function updateCartCount() {
    if (!isAuthenticated()) {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) cartCount.textContent = '0';
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const cart = await response.json();
            const cartCount = document.getElementById('cart-count');
            if (cartCount) {
                const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
                cartCount.textContent = totalItems;
            }
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartCount();
    
    // Update cart count periodically
    setInterval(updateCartCount, 5000);
});
