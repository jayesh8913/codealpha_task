// Orders page JavaScript
const API_URL = '/api';

// Load orders
async function loadOrders() {
    if (!isAuthenticated()) {
        document.getElementById('orders-list').style.display = 'none';
        document.getElementById('no-orders').style.display = 'block';
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load orders');
        }

        const orders = await response.json();
        displayOrders(orders);
        updateCartCount();
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('orders-list').style.display = 'none';
        document.getElementById('no-orders').style.display = 'block';
    }
}

// Display orders
function displayOrders(orders) {
    const ordersList = document.getElementById('orders-list');
    const noOrders = document.getElementById('no-orders');

    if (!orders || orders.length === 0) {
        ordersList.style.display = 'none';
        noOrders.style.display = 'block';
        return;
    }

    ordersList.style.display = 'block';
    noOrders.style.display = 'none';

    ordersList.innerHTML = orders.map(order => {
        const orderDate = new Date(order.createdAt).toLocaleDateString();
        const orderTime = new Date(order.createdAt).toLocaleTimeString();
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">Order #${order._id.slice(-8)}</div>
                        <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                            ${orderDate} at ${orderTime}
                        </div>
                    </div>
                    <span class="order-status ${order.status}">${order.status.toUpperCase()}</span>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <img src="${item.product?.image || 'https://via.placeholder.com/80'}" 
                                 alt="${item.product?.name || 'Product'}" 
                                 class="order-item-image"
                                 onerror="this.src='https://via.placeholder.com/80'">
                            <div style="flex: 1;">
                                <div style="font-weight: bold;">${item.product?.name || 'Product'}</div>
                                <div style="color: #666; margin-top: 0.5rem;">
                                    Quantity: ${item.quantity} × $${item.price.toFixed(2)}
                                </div>
                            </div>
                            <div style="font-weight: bold; color: #667eea;">
                                $${(item.price * item.quantity).toFixed(2)}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">
                    Total: $${order.totalAmount.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
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
    loadOrders();
    updateCartCount();
});
