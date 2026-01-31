// Authentication functions
const API_URL = '/api';

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Set token in localStorage
function setToken(token) {
    localStorage.setItem('token', token);
}

// Remove token from localStorage
function removeToken() {
    localStorage.removeItem('token');
}

// Get user info from localStorage
function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Set user info in localStorage
function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// Remove user info from localStorage
function removeUser() {
    localStorage.removeItem('user');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Update UI based on auth status
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    const user = getUser();

    if (isAuthenticated() && user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            userInfo.style.alignItems = 'center';
            userInfo.style.gap = '1rem';
        }
        if (userName) userName.textContent = user.name || user.username;
        if (userAvatar) {
            userAvatar.src = user.avatar || 'https://via.placeholder.com/150';
            userAvatar.style.display = 'block';
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
    }
}

// Register function
async function register(username, name, email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        setToken(data.token);
        setUser(data.user);
        updateAuthUI();
        return data;
    } catch (error) {
        throw error;
    }
}

// Login function
async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        setToken(data.token);
        setUser(data.user);
        updateAuthUI();
        return data;
    } catch (error) {
        throw error;
    }
}

// Logout function
function logout() {
    removeToken();
    removeUser();
    updateAuthUI();
    window.location.href = 'index.html';
}

// Setup auth event listeners
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');

            try {
                await login(email, password);
                closeModal('login-modal');
                loginForm.reset();
                if (errorEl) errorEl.textContent = '';
                
                // Reload page content
                if (typeof loadFeed === 'function') {
                    loadFeed();
                }
                if (typeof loadProfile === 'function') {
                    loadProfile();
                }
            } catch (error) {
                if (errorEl) errorEl.textContent = error.message;
            }
        });
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const errorEl = document.getElementById('register-error');

            try {
                await register(username, name, email, password);
                closeModal('register-modal');
                registerForm.reset();
                if (errorEl) errorEl.textContent = '';
                
                // Reload page content
                if (typeof loadFeed === 'function') {
                    loadFeed();
                }
                if (typeof loadProfile === 'function') {
                    loadProfile();
                }
            } catch (error) {
                if (errorEl) errorEl.textContent = error.message;
            }
        });
    }

    // Login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            openModal('login-modal');
        });
    }

    // Register button
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            openModal('register-modal');
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
        });
    }

    // Profile link
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (isAuthenticated()) {
                window.location.href = 'profile.html';
            } else {
                openModal('login-modal');
            }
        });
    }

    // Close modal on X click
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
});

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Make functions available globally
window.register = register;
window.login = login;
window.logout = logout;
window.isAuthenticated = isAuthenticated;
window.getToken = getToken;
window.getUser = getUser;
window.updateAuthUI = updateAuthUI;
window.openModal = openModal;
window.closeModal = closeModal;
