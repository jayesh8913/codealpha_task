// Main app JavaScript
const API_URL = '/api';
let currentTab = 'feed';

// Load feed
async function loadFeed() {
    if (!isAuthenticated()) {
        document.getElementById('auth-required').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
        return;
    }

    document.getElementById('auth-required').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/posts/feed`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load feed');
        }

        const posts = await response.json();
        displayPosts(posts);
    } catch (error) {
        console.error('Error loading feed:', error);
        document.getElementById('posts-container').innerHTML = 
            '<div class="empty-state"><p>Error loading feed. Please try again later.</p></div>';
    }
}

// Load discover (all posts)
async function loadDiscover() {
    if (!isAuthenticated()) {
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/posts/all`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load posts');
        }

        const posts = await response.json();
        displayPosts(posts);
    } catch (error) {
        console.error('Error loading discover:', error);
        document.getElementById('posts-container').innerHTML = 
            '<div class="empty-state"><p>Error loading posts. Please try again later.</p></div>';
    }
}

// Display posts
function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    
    if (posts.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No posts available.</p></div>';
        return;
    }

    container.innerHTML = posts.map(post => createPostHTML(post)).join('');

    // Attach event listeners
    attachPostListeners();
}

// Create post HTML
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

// Attach post event listeners
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

// Toggle like
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

// Update post UI after like
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

// Toggle comments section
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

// Load comments
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

// Display comments
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

// Add comment
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

        const data = await response.json();
        
        // Reload comments
        await loadComments(postId);
        
        // Update comments count
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

// Create post
async function createPost(content, image) {
    if (!isAuthenticated()) {
        openModal('login-modal');
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content, image })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to create post');
        }

        const data = await response.json();
        
        // Reload feed
        if (currentTab === 'feed') {
            loadFeed();
        } else {
            loadDiscover();
        }
        
        // Reset form
        document.getElementById('create-post-form').reset();
        document.getElementById('char-count').textContent = '0';
    } catch (error) {
        alert(error.message);
    }
}

// Utility functions
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check auth and load content
    if (isAuthenticated()) {
        loadFeed();
    }

    // Create post form
    const createPostForm = document.getElementById('create-post-form');
    if (createPostForm) {
        createPostForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const content = document.getElementById('post-content').value.trim();
            const image = document.getElementById('post-image').value.trim();
            
            if (content) {
                createPost(content, image);
            }
        });

        // Character count
        const postContent = document.getElementById('post-content');
        const charCount = document.getElementById('char-count');
        if (postContent && charCount) {
            postContent.addEventListener('input', () => {
                charCount.textContent = postContent.value.length;
            });
        }
    }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentTab = btn.dataset.tab;
            if (currentTab === 'feed') {
                loadFeed();
            } else {
                loadDiscover();
            }
        });
    });

    // Discover link
    const discoverLink = document.getElementById('discover-link');
    if (discoverLink) {
        discoverLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (isAuthenticated()) {
                currentTab = 'discover';
                document.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.tab === 'discover');
                });
                loadDiscover();
            } else {
                openModal('login-modal');
            }
        });
    }
});

// Make functions available globally
window.loadFeed = loadFeed;
window.loadDiscover = loadDiscover;
window.toggleLike = toggleLike;
window.toggleComments = toggleComments;
window.addComment = addComment;
