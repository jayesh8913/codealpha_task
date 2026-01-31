// Main app JavaScript
const API_URL = '/api';
let socket = null;

// Initialize WebSocket connection
function initSocket() {
    if (!isAuthenticated()) return;

    const token = getToken();
    socket = io({
        auth: {
            token: token
        }
    });

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    socket.on('notification', (notification) => {
        updateNotificationCount();
        showNotificationToast(notification);
    });

    window.socket = socket;
}

// Load projects
async function loadProjects() {
    if (!isAuthenticated()) {
        document.getElementById('auth-required').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
        return;
    }

    document.getElementById('auth-required').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/projects`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load projects');
        }

        const projects = await response.json();
        displayProjects(projects);
        updateNotificationCount();
    } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('projects-grid').innerHTML = 
            '<p>Error loading projects. Please try again later.</p>';
    }
}

// Display projects
function displayProjects(projects) {
    const grid = document.getElementById('projects-grid');
    
    if (projects.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No projects yet. Create your first project!</p></div>';
        return;
    }

    grid.innerHTML = projects.map(project => `
        <div class="project-card" onclick="openProject('${project._id}')">
            <h3 class="project-name">${escapeHtml(project.name)}</h3>
            <p class="project-description">${escapeHtml(project.description || 'No description')}</p>
            <div class="project-meta">
                <span>👥 ${project.members.length} members</span>
                <span>${new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');
}

// Open project board
function openProject(projectId) {
    window.location.href = `board.html?project=${projectId}`;
}

// Create project
async function createProject(name, description) {
    if (!isAuthenticated()) {
        openModal('login-modal');
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, description })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to create project');
        }

        const data = await response.json();
        closeModal('create-project-modal');
        document.getElementById('create-project-form').reset();
        loadProjects();
    } catch (error) {
        const errorEl = document.getElementById('create-project-error');
        if (errorEl) {
            errorEl.textContent = error.message;
        }
    }
}

// Update notification count
async function updateNotificationCount() {
    if (!isAuthenticated()) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/notifications/unread/count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const countEl = document.getElementById('notification-count');
            if (countEl) {
                countEl.textContent = data.count;
                countEl.style.display = data.count > 0 ? 'inline' : 'none';
            }
        }
    } catch (error) {
        console.error('Error updating notification count:', error);
    }
}

// Load notifications
async function loadNotifications() {
    if (!isAuthenticated()) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/notifications`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load notifications');
        }

        const notifications = await response.json();
        displayNotifications(notifications);
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Display notifications
function displayNotifications(notifications) {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    if (notifications.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No notifications</p>';
        return;
    }

    list.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" 
             onclick="handleNotificationClick('${notif._id}', '${notif.project ? notif.project._id : ''}', '${notif.task ? notif.task._id : ''}')">
            <div class="notification-title">${escapeHtml(notif.title)}</div>
            <div class="notification-message">${escapeHtml(notif.message)}</div>
            <div class="notification-time">${getTimeAgo(new Date(notif.createdAt))}</div>
        </div>
    `).join('');
}

// Handle notification click
async function handleNotificationClick(notifId, projectId, taskId) {
    // Mark as read
    try {
        const token = getToken();
        await fetch(`${API_URL}/notifications/${notifId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }

    // Navigate to project if available
    if (projectId) {
        window.location.href = `board.html?project=${projectId}${taskId ? `&task=${taskId}` : ''}`;
    } else {
        closeModal('notifications-modal');
        updateNotificationCount();
        loadNotifications();
    }
}

// Show notification toast
function showNotificationToast(notification) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #667eea;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s;
    `;
    toast.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 0.3rem;">${escapeHtml(notification.title)}</div>
        <div style="font-size: 0.9rem;">${escapeHtml(notification.message)}</div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated()) {
        initSocket();
        loadProjects();
    }

    // Create project button
    const createProjectBtn = document.getElementById('create-project-btn');
    if (createProjectBtn) {
        createProjectBtn.addEventListener('click', () => {
            if (!isAuthenticated()) {
                openModal('login-modal');
                return;
            }
            openModal('create-project-modal');
        });
    }

    // Create project form
    const createProjectForm = document.getElementById('create-project-form');
    if (createProjectForm) {
        createProjectForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('project-name').value.trim();
            const description = document.getElementById('project-description').value.trim();
            if (name) {
                createProject(name, description);
            }
        });
    }

    // Notifications button
    const notificationsBtn = document.getElementById('notifications-btn');
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => {
            if (!isAuthenticated()) {
                openModal('login-modal');
                return;
            }
            openModal('notifications-modal');
            loadNotifications();
        });
    }

    // Mark all read button
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            try {
                const token = getToken();
                await fetch(`${API_URL}/notifications/read-all`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                updateNotificationCount();
                loadNotifications();
            } catch (error) {
                console.error('Error marking all as read:', error);
            }
        });
    }
});

// Make functions available globally
window.loadProjects = loadProjects;
window.openProject = openProject;
window.createProject = createProject;
window.handleNotificationClick = handleNotificationClick;
