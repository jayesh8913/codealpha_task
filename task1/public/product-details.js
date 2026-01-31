// Product details page JavaScript
const API_URL = '/api';

// Get product ID from URL
function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Load product details
async function loadProductDetails() {
    const productId = getProductId();
    
    if (!productId) {
        document.getElementById('product-details').innerHTML = 
            '<p>Product not found.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        
        if (!response.ok) {
            throw new Error('Product not found');
        }

        const product = await response.json();
        displayProductDetails(product);
    } catch (error) {
        console.error('Error loading product:', error);
        document.getElementById('product-details').innerHTML = 
            '<p>Error loading product. Please try again later.</p>';
    }
}

// Display product details
function displayProductDetails(product) {
    const container = document.getElementById('product-details');
    
    container.innerHTML = `
        <div class="product-details-content">
            <img src="${product.image}" alt="${product.name}" class="product-details-image"
                 onerror="this.src='https://via.placeholder.com/500'">
            <div class="product-details-info">
                <h1>${product.name}</h1>
                <p class="product-details-price">$${product.price.toFixed(2)}</p>
                <p class="product-details-description">${product.description}</p>
                <p class="product-stock ${product.stock < 10 ? 'low' : ''}">
                    ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </p>
                <div class="quantity-selector">
                    <label for="quantity">Quantity:</label>
                    <input type="number" id="quantity" min="1" max="${product.stock}" value="1">
                </div>
                <button class="btn btn-primary btn-large" onclick="addToCart('${product._id}')" 
                        ${product.stock === 0 ? 'disabled' : ''}>
                    ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `;
}

// Add to cart
async function addToCart(productId) {
    if (!isAuthenticated()) {
        alert('Please login to add items to cart');
        openModal('login-modal');
        return;
    }

    const quantityInput = document.getElementById('quantity');
    const quantity = parseInt(quantityInput.value) || 1;

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, quantity })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to add to cart');
        }

        alert('Product added to cart!');
        updateCartCount();
    } catch (error) {
        alert(error.message);
    }
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
    loadProductDetails();
    updateCartCount();
});

// Make addToCart available globally
window.addToCart = addToCart;
