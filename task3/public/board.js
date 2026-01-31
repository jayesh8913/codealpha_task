// Board JavaScript
const API_URL = '/api';
let socket = null;
let currentProject = null;
let currentTasks = [];
let draggedTask = null;
let draggedFromColumn = null;

// Get project ID from URL
function getProjectId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('project');
}

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
        const projectId = getProjectId();
        if (projectId) {
            socket.emit('join-project', projectId);
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    socket.on('project-updated', (project) => {
        if (project._id === currentProject?._id) {
            currentProject = project;
            updateProjectInfo();
        }
    });

    socket.on('task-created', (task) => {
        if (task.project._id === currentProject?._id) {
            addTaskToBoard(task);
        }
    });

    socket.on('task-updated', (task) => {
        if (task.project._id === currentProject?._id) {
            updateTaskOnBoard(task);
        }
    });

    socket.on('task-moved', (task) => {
        if (task.project._id === currentProject?._id) {
            moveTaskOnBoard(task);
        }
    });

    socket.on('task-deleted', (data) => {
        if (data.projectId === currentProject?._id) {
            removeTaskFromBoard(data.taskId);
        }
    });

    socket.on('comment-added', (data) => {
        updateTaskCommentsCount(data.taskId);
    });

    socket.on('comment-deleted', (data) => {
        updateTaskCommentsCount(data.taskId);
    });

    socket.on('notification', (notification) => {
        updateNotificationCount();
    });

    window.socket = socket;
}

// Load board
async function loadBoard() {
    if (!isAuthenticated()) {
        document.getElementById('board-content').innerHTML = 
            '<div class="auth-required"><h2>Please login to view project board</h2></div>';
        return;
    }

    const projectId = getProjectId();
    if (!projectId) {
        document.getElementById('board-content').innerHTML = 
            '<div class="empty-state"><p>Project not found</p></div>';
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/projects/${projectId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load project');
        }

        const data = await response.json();
        currentProject = data.project;
        currentTasks = data.tasks || [];

        displayBoard(data.project, data.tasks);
        updateNotificationCount();
    } catch (error) {
        console.error('Error loading board:', error);
        document.getElementById('board-content').innerHTML = 
            '<div class="empty-state"><p>Error loading board. Please try again later.</p></div>';
    }
}

// Display board
function displayBoard(project, tasks) {
    const container = document.getElementById('board-content');
    
    const columns = project.columns || [
        { name: 'To Do', order: 0 },
        { name: 'In Progress', order: 1 },
        { name: 'Done', order: 2 }
    ].sort((a, b) => a.order - b.order);

    container.innerHTML = `
        <div class="board-header">
            <div>
                <h1 class="board-title">${escapeHtml(project.name)}</h1>
                <p style="color: #666; margin-top: 0.5rem;">${escapeHtml(project.description || '')}</p>
            </div>
            <div class="board-actions">
                <button class="btn btn-outline" onclick="openProjectSettings()">⚙️ Settings</button>
                <button class="btn btn-primary" onclick="openCreateTaskModal()">+ New Task</button>
            </div>
        </div>
        <div class="columns-container" id="columns-container">
            ${columns.map(column => createColumnHTML(column, tasks)).join('')}
        </div>
    `;

    // Attach event listeners
    attachBoardListeners();
}

// Create column HTML
function createColumnHTML(column, tasks) {
    const columnTasks = tasks.filter(t => t.column === column.name) || [];
    const sortedTasks = columnTasks.sort((a, b) => (a.order || 0) - (b.order || 0));

    return `
        <div class="column" data-column="${column.name}">
            <div class="column-header">
                <span class="column-name">${escapeHtml(column.name)}</span>
                <span class="column-count">${columnTasks.length}</span>
            </div>
            <div class="tasks-list" 
                 ondrop="handleDrop(event, '${column.name}')" 
                 ondragover="handleDragOver(event)"
                 ondragenter="handleDragEnter(event)">
                ${sortedTasks.map(task => createTaskCardHTML(task)).join('')}
                <button class="add-task-btn" onclick="openCreateTaskModal('${column.name}')">
                    + Add Task
                </button>
            </div>
        </div>
    `;
}

// Create task card HTML
function createTaskCardHTML(task) {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date() && task.column !== 'Done';
    const assignedUser = task.assignedTo;

    return `
        <div class="task-card" 
             draggable="true"
             ondragstart="handleDragStart(event, '${task._id}', '${task.column}')"
             onclick="openTaskDetails('${task._id}')">
            <div class="task-title">${escapeHtml(task.title)}</div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
                <span class="task-priority ${task.priority || 'medium'}">${(task.priority || 'medium').toUpperCase()}</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${assignedUser ? `
                        <div class="task-assigned">
                            <img src="${assignedUser.avatar || 'https://via.placeholder.com/150'}" 
                                 alt="${assignedUser.name}" 
                                 class="task-assigned-avatar"
                                 onerror="this.src='https://via.placeholder.com/150'">
                        </div>
                    ` : ''}
                    ${dueDate ? `
                        <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                            📅 ${dueDate.toLocaleDateString()}
                        </span>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Attach board event listeners
function attachBoardListeners() {
    // Drag and drop handlers are in global functions
}

// Drag and drop handlers
function handleDragStart(e, taskId, column) {
    draggedTask = taskId;
    draggedFromColumn = column;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '#e3f2fd';
}

function handleDrop(e, targetColumn) {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '';

    if (!draggedTask || draggedFromColumn === targetColumn) {
        draggedTask = null;
        draggedFromColumn = null;
        return;
    }

    // Remove dragging class from all tasks
    document.querySelectorAll('.task-card').forEach(card => {
        card.classList.remove('dragging');
    });

    moveTask(draggedTask, targetColumn);
    
    draggedTask = null;
    draggedFromColumn = null;
}

// Move task
async function moveTask(taskId, targetColumn) {
    try {
        const token = getToken();
        
        // Find task in current tasks
        const task = currentTasks.find(t => t._id === taskId);
        if (!task) return;

        // Calculate new order (add to end of target column)
        const targetColumnTasks = currentTasks.filter(t => t.column === targetColumn);
        const newOrder = targetColumnTasks.length;

        const response = await fetch(`${API_URL}/tasks/${taskId}/move`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ column: targetColumn, order: newOrder })
        });

        if (!response.ok) {
            throw new Error('Failed to move task');
        }

        // Task will be updated via WebSocket
    } catch (error) {
        console.error('Error moving task:', error);
        loadBoard(); // Reload on error
    }
}

// Add task to board (via WebSocket)
function addTaskToBoard(task) {
    currentTasks.push(task);
    const column = document.querySelector(`[data-column="${task.column}"] .tasks-list`);
    if (column) {
        const addBtn = column.querySelector('.add-task-btn');
        if (addBtn) {
            addBtn.insertAdjacentHTML('beforebegin', createTaskCardHTML(task));
        }
        updateColumnCount(task.column);
    }
}

// Update task on board (via WebSocket)
function updateTaskOnBoard(updatedTask) {
    const index = currentTasks.findIndex(t => t._id === updatedTask._id);
    if (index !== -1) {
        currentTasks[index] = updatedTask;
    }
    
    const taskCard = document.querySelector(`.task-card[ondragstart*="${updatedTask._id}"]`);
    if (taskCard) {
        taskCard.outerHTML = createTaskCardHTML(updatedTask);
    }
}

// Move task on board (via WebSocket)
function moveTaskOnBoard(task) {
    const index = currentTasks.findIndex(t => t._id === task._id);
    if (index !== -1) {
        currentTasks[index] = task;
    }

    // Remove from old column
    const oldCard = document.querySelector(`.task-card[ondragstart*="${task._id}"]`);
    if (oldCard) {
        oldCard.remove();
        updateColumnCount(task.column);
    }

    // Add to new column
    const newColumn = document.querySelector(`[data-column="${task.column}"] .tasks-list`);
    if (newColumn) {
        const addBtn = newColumn.querySelector('.add-task-btn');
        if (addBtn) {
            addBtn.insertAdjacentHTML('beforebegin', createTaskCardHTML(task));
        }
        updateColumnCount(task.column);
    }
}

// Remove task from board (via WebSocket)
function removeTaskFromBoard(taskId) {
    currentTasks = currentTasks.filter(t => t._id !== taskId);
    const taskCard = document.querySelector(`.task-card[ondragstart*="${taskId}"]`);
    if (taskCard) {
        const column = taskCard.closest('.column');
        taskCard.remove();
        if (column) {
            updateColumnCount(column.dataset.column);
        }
    }
}

// Update column count
function updateColumnCount(columnName) {
    const column = document.querySelector(`[data-column="${columnName}"]`);
    if (column) {
        const count = column.querySelectorAll('.task-card').length;
        const countEl = column.querySelector('.column-count');
        if (countEl) {
            countEl.textContent = count;
        }
    }
}

// Update task comments count
function updateTaskCommentsCount(taskId) {
    // This would be called when comments are added/removed
    // For now, we'll just reload the board if needed
}

// Update project info
function updateProjectInfo() {
    if (!currentProject) return;
    
    const titleEl = document.querySelector('.board-title');
    if (titleEl) {
        titleEl.textContent = currentProject.name;
    }
}

// Open create task modal
function openCreateTaskModal(column) {
    if (!isAuthenticated()) {
        openModal('login-modal');
        return;
    }

    if (column) {
        document.getElementById('task-column').value = column;
    }

    // Populate assigned to dropdown
    populateAssignedToDropdown();
    
    openModal('create-task-modal');
}

// Populate assigned to dropdown
function populateAssignedToDropdown(selectId = 'task-assigned-to') {
    if (!currentProject) return;

    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">Unassigned</option>';
    
    const allMembers = [currentProject.owner, ...(currentProject.members || [])];
    const uniqueMembers = Array.from(new Map(allMembers.map(m => [m._id, m])).values());

    uniqueMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member._id;
        option.textContent = member.name || member.username;
        select.appendChild(option);
    });
}

// Create task
async function createTask() {
    try {
        const token = getToken();
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const priority = document.getElementById('task-priority').value;
        const dueDate = document.getElementById('task-due-date').value;
        const assignedTo = document.getElementById('task-assigned-to').value;
        const column = document.getElementById('task-column').value || 'To Do';

        if (!title) {
            throw new Error('Task title is required');
        }

        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                description,
                projectId: currentProject._id,
                column,
                priority,
                dueDate: dueDate || null,
                assignedTo: assignedTo || null
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to create task');
        }

        closeModal('create-task-modal');
        document.getElementById('create-task-form').reset();
        // Task will be added via WebSocket
    } catch (error) {
        const errorEl = document.getElementById('create-task-error');
        if (errorEl) {
            errorEl.textContent = error.message;
        }
    }
}

// Open task details
async function openTaskDetails(taskId) {
    const task = currentTasks.find(t => t._id === taskId);
    if (!task) {
        // Fetch task if not in current tasks
        try {
            const token = getToken();
            const response = await fetch(`${API_URL}/tasks/${taskId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const fetchedTask = await response.json();
                displayTaskDetails(fetchedTask);
            }
        } catch (error) {
            console.error('Error fetching task:', error);
        }
        return;
    }

    displayTaskDetails(task);
}

// Display task details
async function displayTaskDetails(task) {
    const container = document.getElementById('task-details');
    
    // Load comments
    const comments = await loadTaskComments(task._id);
    
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date() && task.column !== 'Done';

    container.innerHTML = `
        <div class="task-details-header">
            <h2 class="task-details-title">${escapeHtml(task.title)}</h2>
            <button class="btn btn-danger btn-small" onclick="deleteTask('${task._id}')">Delete</button>
        </div>
        <div class="task-details-content">
            <div class="task-details-section">
                <h3>Description</h3>
                <div class="task-details-description">${escapeHtml(task.description || 'No description')}</div>
            </div>
            <div class="task-details-section">
                <h3>Details</h3>
                <div class="task-details-info">
                    <div class="info-item">
                        <div class="info-label">Priority</div>
                        <div class="info-value">
                            <span class="task-priority ${task.priority || 'medium'}">${(task.priority || 'medium').toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Status</div>
                        <div class="info-value">${escapeHtml(task.column)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Assigned To</div>
                        <div class="info-value">
                            ${task.assignedTo ? escapeHtml(task.assignedTo.name || task.assignedTo.username) : 'Unassigned'}
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Due Date</div>
                        <div class="info-value ${isOverdue ? 'overdue' : ''}">
                            ${dueDate ? dueDate.toLocaleDateString() : 'No due date'}
                        </div>
                    </div>
                </div>
            </div>
            <div class="task-details-section">
                <button class="btn btn-primary" onclick="openEditTaskModal('${task._id}')">Edit Task</button>
            </div>
            <div class="comments-section">
                <h3>Comments (${comments.length})</h3>
                <div id="comments-list">
                    ${comments.map(comment => createCommentHTML(comment)).join('')}
                </div>
                <form class="comment-form" onsubmit="addComment(event, '${task._id}')">
                    <input type="text" class="comment-input" placeholder="Write a comment..." required>
                    <button type="submit" class="btn btn-primary">Post</button>
                </form>
            </div>
        </div>
    `;

    openModal('task-modal');
}

// Load task comments
async function loadTaskComments(taskId) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/comments/task/${taskId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
    return [];
}

// Create comment HTML
function createCommentHTML(comment) {
    return `
        <div class="comment-item">
            <img src="${comment.user.avatar || 'https://via.placeholder.com/150'}" 
                 alt="${comment.user.name}" 
                 class="comment-avatar"
                 onerror="this.src='https://via.placeholder.com/150'">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${escapeHtml(comment.user.name || comment.user.username)}</span>
                    <span class="comment-time">${getTimeAgo(new Date(comment.createdAt))}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.content)}</div>
            </div>
        </div>
    `;
}

// Add comment
async function addComment(e, taskId) {
    e.preventDefault();
    const input = e.target.querySelector('.comment-input');
    const content = input.value.trim();

    if (!content) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ taskId, content })
        });

        if (!response.ok) {
            throw new Error('Failed to add comment');
        }

        const data = await response.json();
        input.value = '';
        
        // Add comment to UI
        const commentsList = document.getElementById('comments-list');
        if (commentsList) {
            commentsList.insertAdjacentHTML('beforeend', createCommentHTML(data.comment));
        }
    } catch (error) {
        alert(error.message);
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete task');
        }

        closeModal('task-modal');
        // Task will be removed via WebSocket
    } catch (error) {
        alert(error.message);
    }
}

// Open edit task modal
async function openEditTaskModal(taskId) {
    const task = currentTasks.find(t => t._id === taskId);
    if (!task) return;

    // Populate form
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-description').value = task.description || '';
    document.getElementById('edit-task-priority').value = task.priority || 'medium';
    document.getElementById('edit-task-due-date').value = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
    document.getElementById('edit-task-assigned-to').value = task.assignedTo ? task.assignedTo._id : '';
    document.getElementById('edit-task-column').value = task.column;
    document.getElementById('edit-task-id').value = taskId;

    populateAssignedToDropdown('edit-task-assigned-to');
    openModal('edit-task-modal');
}

// Update task
async function updateTask() {
    try {
        const token = getToken();
        const taskId = document.getElementById('edit-task-id').value;
        const title = document.getElementById('edit-task-title').value.trim();
        const description = document.getElementById('edit-task-description').value.trim();
        const priority = document.getElementById('edit-task-priority').value;
        const dueDate = document.getElementById('edit-task-due-date').value;
        const assignedTo = document.getElementById('edit-task-assigned-to').value;
        const column = document.getElementById('edit-task-column').value;

        if (!title) {
            throw new Error('Task title is required');
        }

        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                description,
                priority,
                dueDate: dueDate || null,
                assignedTo: assignedTo || null,
                column
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to update task');
        }

        closeModal('edit-task-modal');
        closeModal('task-modal');
        // Task will be updated via WebSocket
    } catch (error) {
        alert(error.message);
    }
}

// Open project settings
function openProjectSettings() {
    if (!currentProject) return;

    document.getElementById('settings-project-name').value = currentProject.name;
    document.getElementById('settings-project-description').value = currentProject.description || '';
    
    // Display members
    const membersList = document.getElementById('project-members-list');
    const allMembers = [currentProject.owner, ...(currentProject.members || [])];
    const uniqueMembers = Array.from(new Map(allMembers.map(m => [m._id, m])).values());
    
    membersList.innerHTML = uniqueMembers.map(member => `
        <div class="member-item">
            <div class="member-info">
                <img src="${member.avatar || 'https://via.placeholder.com/150'}" 
                     alt="${member.name}" 
                     class="member-avatar"
                     onerror="this.src='https://via.placeholder.com/150'">
                <div>
                    <div class="member-name">${escapeHtml(member.name || member.username)}</div>
                    <div class="member-role">${member._id === currentProject.owner._id ? 'Owner' : 'Member'}</div>
                </div>
            </div>
            ${member._id === currentProject.owner._id ? '' : 
              `<button class="btn btn-danger btn-small" onclick="removeMember('${member._id}')">Remove</button>`
            }
        </div>
    `).join('');

    openModal('project-settings-modal');
}

// Update project
async function updateProject() {
    try {
        const token = getToken();
        const name = document.getElementById('settings-project-name').value.trim();
        const description = document.getElementById('settings-project-description').value.trim();

        if (!name) {
            throw new Error('Project name is required');
        }

        const response = await fetch(`${API_URL}/projects/${currentProject._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, description })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to update project');
        }

        closeModal('project-settings-modal');
        // Project will be updated via WebSocket
    } catch (error) {
        const errorEl = document.getElementById('project-settings-error');
        if (errorEl) {
            errorEl.textContent = error.message;
        }
    }
}

// Add member
async function addMember() {
    const email = document.getElementById('add-member-email').value.trim();
    if (!email) return;

    try {
        // First, we need to find user by email
        // For simplicity, we'll use a search endpoint or add member by email
        // This would require a backend endpoint to search users by email
        alert('Feature: Add member by email. This requires a user search endpoint.');
    } catch (error) {
        alert(error.message);
    }
}

// Remove member
async function removeMember(userId) {
    if (!confirm('Remove this member from the project?')) {
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/projects/${currentProject._id}/members/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to remove member');
        }

        openProjectSettings(); // Reload settings
    } catch (error) {
        alert(error.message);
    }
}

// Update notification count (same as app.js)
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
        loadBoard();
    }

    // Create task form
    const createTaskForm = document.getElementById('create-task-form');
    if (createTaskForm) {
        createTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createTask();
        });
    }

    // Project settings form
    const projectSettingsForm = document.getElementById('project-settings-form');
    if (projectSettingsForm) {
        projectSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            updateProject();
        });
    }

    // Add member button
    const addMemberBtn = document.getElementById('add-member-btn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', addMember);
    }
});

// Make functions available globally
window.handleDragStart = handleDragStart;
window.handleDragOver = handleDragOver;
window.handleDragEnter = handleDragEnter;
window.handleDrop = handleDrop;
window.openCreateTaskModal = openCreateTaskModal;
window.openTaskDetails = openTaskDetails;
window.addComment = addComment;
window.deleteTask = deleteTask;
window.openEditTaskModal = openEditTaskModal;
window.updateTask = updateTask;
window.openProjectSettings = openProjectSettings;
window.updateProject = updateProject;
window.addMember = addMember;
window.removeMember = removeMember;
