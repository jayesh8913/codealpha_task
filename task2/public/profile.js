// Profile page JavaScript
const API_URL = '/api';

let currentUsername = null;
let isOwnProfile = false;

// Get username from URL
function getUsernameFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('username');
}

// Load profile
async function loadProfile() {
    if (!isAuthenticated()) {
        document.getElementById('profile-content').innerHTML = 
            '<div class="auth-required"><h2>Please login to view profiles</h2></div>';
        return;
    }

    const user = getUser();
    const username = getUsernameFromURL() || user.username;
    currentUsername = username;
    isOwnProfile = username === user.username;

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${username}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load profile');
        }

        const data = await response.json();
        displayProfile(data);
    } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('profile-content').innerHTML = 
            '<div class="empty-state"><p>Error loading profile. Please try again later.</p></div>';
    }
}

// Display profile
function displayProfile(data) {
    const { user, isFollowing, posts } = data;
    const container = document.getElementById('profile-content');
    
    container.innerHTML = `
        <div class="profile-header">
            <div class="profile-info">
                <img src="${user.avatar || 'https://via.placeholder.com/150'}" 
                     alt="${user.name}" 
                     class="profile-avatar-large"
                     onerror="this.src='https://via.placeholder.com/150'">
                <div class="profile-details">
                    <h1 class="profile-username">${user.name}</h1>
                    <p class="profile-name">@${user.username}</p>
                    ${user.bio ? `<p class="profile-bio">${escapeHtml(user.bio)}</p>` : ''}
                    <div class="profile-stats">
                        <div class="profile-stat">
                            <span class="profile-stat-number">${user.postsCount || 0}</span>
                            <span class="profile-stat-label">Posts</span>
                        </div>
                        <div class="profile-stat">
                            <span class="profile-stat-number">${user.followersCount || 0}</span>
                            <span class="profile-stat-label">Followers</span>
                        </div>
                        <div class="profile-stat">
                            <span class="profile-stat-number">${user.followingCount || 0}</span>
                            <span class="profile-stat-label">Following</span>
                        </div>
                    </div>
                    <div class="profile-actions">
                        ${isOwnProfile 
                            ? '<button class="btn btn-primary" onclick="openEditProfile()">Edit Profile</button>'
                            : `<button class="btn ${isFollowing ? 'btn-following' : 'btn-follow'}" 
                                      onclick="toggleFollow('${user.id}')" 
                                      id="follow-btn"
                                      data-following="${isFollowing}">
                                  ${isFollowing ? 'Following' : 'Follow'}
                              </button>`
                        }
                    </div>
                </div>
            </div>
        </div>
        <div class="profile-posts">
            <h2>Posts</h2>
            <div id="profile-posts-list" class="posts-container">
                ${displayProfilePosts(posts)}
            </div>
        </div>
    `;

    attachPostListeners();
}

// Display profile posts
function displayProfilePosts(posts) {
    if (!posts || posts.length === 0) {
        return '<div class="empty-state"><p>No posts yet.</p></div>';
    }

    return posts.map(post => createPostHTML(post)).join('');
}

// Create post HTML (same as app.js)
function createPostHTML(post) {
    const timeAgo = getTimeAgo(new Date(post.createdAt));
    const user = post.user;
    
    return `
        <div class="post-card" data-post-id="${post._id}">
            <div class="post-header">
                <img src="${user.avatar || 'https://via.placeholder.com/150'}" 
                     alt="${user.name}" 
                     class="post-avatar"
                     onerror="this.src='https://via.placeholder.com/150'">
                <div class="post-user-info">
                    <a href="profile.html?username=${user.username}" class="post-username">${user.name}</a>
                    <span class="post-time">@${user.username} · ${timeAgo}</span>
                </div>
                ${isOwnProfile ? `<button class="btn btn-danger" style="margin-left: auto;" onclick="deletePost('${post._id}')">Delete</button>` : ''}
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image" onerror="this.style.display='none'">` : ''}
            <div class="post-actions">
                <button class="post-action ${post.isLiked ? 'liked' : ''}" 
                        data-action="like" 
                        data-post-id="${post._id}">
                    ❤️ <span class="likes-count">${post.likesCount || 0}</span>
                </button>
                <button class="post-action" 
                        data-action="comment" 
                        data-post-id="${post._id}">
                    💬 <span class="comments-count">${post.commentsCount || 0}</span>
                </button>
            </div>
            <div class="comments-section" id="comments-${post._id}" style="display: none;">
                <div class="comments-list" id="comments-list-${post._id}"></div>
                <form class="comment-form" data-post-id="${post._id}">
                    <input type="text" 
                           class="comment-input" 
                           placeholder="Write a comment..." 
                           maxlength="500"
                           required>
                    <button type="submit" class="comment-btn">Post</button>
                </form>
            </div>
        </div>
    `;
}

// Attach post event listeners (same as app.js)
function attachPostListeners() {
    // Like buttons
    document.querySelectorAll('[data-action="like"]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const postId = e.currentTarget.dataset.postId;
            await toggleLike(postId);
        });
    });

    // Comment buttons
    document.querySelectorAll('[data-action="comment"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const postId = e.currentTarget.dataset.postId;
            toggleComments(postId);
        });
    });

    // Comment forms
    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const postId = e.currentTarget.dataset.postId;
            const input = e.currentTarget.querySelector('.comment-input');
            const content = input.value.trim();
            
            if (content) {
                await addComment(postId, content);
                input.value = '';
            }
        });
    });
}

// Toggle follow
async function toggleFollow(userId) {
    if (!isAuthenticated()) {
        openModal('login-modal');
        return;
    }

    try {
        const token = getToken();
        const followBtn = document.getElementById('follow-btn');
        const isFollowing = followBtn.dataset.following === 'true';

        const method = isFollowing ? 'DELETE' : 'POST';
        const response = await fetch(`${API_URL}/follows/${userId}`, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to update follow status');
        }

        const data = await response.json();
        
        // Update button
        followBtn.dataset.following = data.isFollowing;
        followBtn.textContent = data.isFollowing ? 'Following' : 'Follow';
        followBtn.className = `btn ${data.isFollowing ? 'btn-following' : 'btn-follow'}`;
        
        // Reload profile to update counts
        loadProfile();
    } catch (error) {
        alert(error.message);
    }
}

// Delete post
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete post');
        }

        // Remove post from UI
        const postCard = document.querySelector(`[data-post-id="${postId}"]`);
        if (postCard) {
            postCard.remove();
        }

        // Reload profile
        loadProfile();
    } catch (error) {
        alert(error.message);
    }
}

// Open edit profile modal
function openEditProfile() {
    const user = getUser();
    document.getElementById('edit-name').value = user.name || '';
    document.getElementById('edit-bio').value = user.bio || '';
    document.getElementById('edit-avatar').value = user.avatar || '';
    document.getElementById('bio-char-count').textContent = (user.bio || '').length;
    openModal('edit-profile-modal');
}

// Save profile changes
async function saveProfile() {
    try {
        const token = getToken();
        const name = document.getElementById('edit-name').value;
        const bio = document.getElementById('edit-bio').value;
        const avatar = document.getElementById('edit-avatar').value;

        const response = await fetch(`${API_URL}/users/me/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, bio, avatar })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to update profile');
        }

        const data = await response.json();
        
        // Update user in localStorage
        setUser(data.user);
        updateAuthUI();
        
        // Close modal and reload profile
        closeModal('edit-profile-modal');
        loadProfile();
    } catch (error) {
        const errorEl = document.getElementById('edit-profile-error');
        if (errorEl) {
            errorEl.textContent = error.message;
        }
    }
}

// Utility functions (same as app.js)
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Import functions from app.js
async function toggleLike(postId) {
    if (!isAuthenticated()) {
        openModal('login-modal');
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to like post');
        }

        const data = await response.json();
        updatePostUI(postId, data.post);
    } catch (error) {
        alert(error.message);
    }
}

function updatePostUI(postId, post) {
    const postCard = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postCard) return;

    const likeBtn = postCard.querySelector('[data-action="like"]');
    const likesCount = postCard.querySelector('.likes-count');
    
    if (post.isLiked) {
        likeBtn.classList.add('liked');
    } else {
        likeBtn.classList.remove('liked');
    }
    
    likesCount.textContent = post.likesCount || 0;
}

async function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (!commentsSection) return;

    if (commentsSection.style.display === 'none') {
        commentsSection.style.display = 'block';
        await loadComments(postId);
    } else {
        commentsSection.style.display = 'none';
    }
}

async function loadComments(postId) {
    if (!isAuthenticated()) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/comments/post/${postId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load comments');
        }

        const comments = await response.json();
        displayComments(postId, comments);
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

function displayComments(postId, comments) {
    const container = document.getElementById(`comments-list-${postId}`);
    if (!container) return;

    if (comments.length === 0) {
        container.innerHTML = '<p style="color: #666; padding: 1rem;">No comments yet.</p>';
        return;
    }

    container.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <img src="${comment.user.avatar || 'https://via.placeholder.com/150'}" 
                 alt="${comment.user.name}" 
                 class="comment-avatar"
                 onerror="this.src='https://via.placeholder.com/150'">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-username">${comment.user.name}</span>
                    <span style="color: #999; font-size: 0.8rem;">@${comment.user.username}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.content)}</div>
            </div>
        </div>
    `).join('');
}

async function addComment(postId, content) {
    if (!isAuthenticated()) {
        openModal('login-modal');
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ postId, content })
        });

        if (!response.ok) {
            throw new Error('Failed to add comment');
        }

        await loadComments(postId);
        
        const postCard = document.querySelector(`[data-post-id="${postId}"]`);
        if (postCard) {
            const commentsCount = postCard.querySelector('.comments-count');
            const currentCount = parseInt(commentsCount.textContent) || 0;
            commentsCount.textContent = currentCount + 1;
        }
    } catch (error) {
        alert(error.message);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();

    // Edit profile form
    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveProfile();
        });

        // Bio character count
        const bioInput = document.getElementById('edit-bio');
        const bioCharCount = document.getElementById('bio-char-count');
        if (bioInput && bioCharCount) {
            bioInput.addEventListener('input', () => {
                bioCharCount.textContent = bioInput.value.length;
            });
        }
    }
});

// Make functions available globally
window.toggleFollow = toggleFollow;
window.deletePost = deletePost;
window.openEditProfile = openEditProfile;
window.saveProfile = saveProfile;
