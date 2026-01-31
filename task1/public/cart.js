// Cart page JavaScript
const API_URL = '/api';

// Load cart
async function loadCart() {
    if (!isAuthenticated()) {
        document.getElementById('cart-content').style.display = 'none';
        document.getElementById('empty-cart').style.display = 'block';
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load cart');
        }

        const cart = await response.json();
        displayCart(cart);
        updateCartCount();
    } catch (error) {
        console.error('Error loading cart:', error);
        document.getElementById('cart-content').style.display = 'none';
        document.getElementById('empty-cart').style.display = 'block';
    }
}

// Display cart
function displayCart(cart) {
    const cartItems = document.getElementById('cart-items');
    const cartSummary = document.getElementById('cart-summary');
    const emptyCart = document.getElementById('empty-cart');
    const cartContent = document.getElementById('cart-content');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (!cart.items || cart.items.length === 0) {
        cartContent.style.display = 'none';
        emptyCart.style.display = 'block';
        return;
    }

    cartContent.style.display = 'grid';
    emptyCart.style.display = 'none';

    // Display cart items
    cartItems.innerHTML = cart.items.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image"
                 onerror="this.src='https://via.placeholder.com/120'">
            <div class="cart-item-info">
                <h3 class="cart-item-name">${item.name}</h3>
                <p class="cart-item-price">$${item.price.toFixed(2)}</p>
                <div class="cart-item-actions">
                    <label>Quantity:</label>
                    <input type="number" value="${item.quantity}" min="1" 
                           onchange="updateCartItem('${item.productId}', this.value)"
                           class="quantity-input" style="width: 80px; padding: 0.5rem; border: 2px solid #ddd; border-radius: 5px;">
                    <button class="btn btn-danger" onclick="removeCartItem('${item.productId}')">
                        Remove
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Display summary
    document.getElementById('cart-subtotal').textContent = `$${cart.total.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `$${cart.total.toFixed(2)}`;
    document.getElementById('checkout-total').textContent = `$${cart.total.toFixed(2)}`;
    
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
    }
}

// Update cart item quantity
async function updateCartItem(productId, quantity) {
    if (!isAuthenticated()) {
        alert('Please login to update cart');
        return;
    }

    quantity = parseInt(quantity);
    if (quantity < 1) {
        removeCartItem(productId);
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/cart/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, quantity })
        });

        if (!response.ok) {
            throw new Error('Failed to update cart');
        }

        const cart = await response.json();
        displayCart(cart);
        updateCartCount();
    } catch (error) {
        alert(error.message);
        loadCart(); // Reload cart on error
    }
}

// Remove cart item
async function removeCartItem(productId) {
    if (!isAuthenticated()) {
        alert('Please login to remove items from cart');
        return;
    }

    if (!confirm('Remove this item from cart?')) {
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/cart/remove/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to remove item');
        }

        const cart = await response.json();
        displayCart(cart);
        updateCartCount();
    } catch (error) {
        alert(error.message);
        loadCart(); // Reload cart on error
    }
}

// Checkout
function openCheckout() {
    if (!isAuthenticated()) {
        alert('Please login to checkout');
        openModal('login-modal');
        return;
    }

    openModal('checkout-modal');
}

// Place order
async function placeOrder(shippingAddress) {
    if (!isAuthenticated()) {
        alert('Please login to place order');
        return;
    }

    try {
        const token = getToken();
        
        // Get current cart
        const cartResponse = await fetch(`${API_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!cartResponse.ok) {
            throw new Error('Failed to load cart');
        }

        const cart = await cartResponse.json();

        if (!cart.items || cart.items.length === 0) {
            throw new Error('Cart is empty');
        }

        // Create order
        const orderResponse = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                items: cart.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                })),
                shippingAddress
            })
        });

        const data = await orderResponse.json();

        if (!orderResponse.ok) {
            throw new Error(data.message || 'Failed to place order');
        }

        alert('Order placed successfully!');
        closeModal('checkout-modal');
        window.location.href = 'orders.html';
    } catch (error) {
        const errorEl = document.getElementById('checkout-error');
        if (errorEl) {
            errorEl.textContent = error.message;
        } else {
            alert(error.message);
        }
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
    loadCart();
    updateCartCount();

    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', openCheckout);
    }

    // Checkout form
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const shippingAddress = {
                street: document.getElementById('street').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zipCode: document.getElementById('zipCode').value,
                country: document.getElementById('country').value
            };
            placeOrder(shippingAddress);
        });
    }
});

// Make functions available globally
window.updateCartItem = updateCartItem;
window.removeCartItem = removeCartItem;
window.openCheckout = openCheckout;
window.placeOrder = placeOrder;
