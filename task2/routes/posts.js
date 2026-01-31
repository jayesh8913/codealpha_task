const express = require('express');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const router = express.Router();

// Create post
router.post('/', auth, async (req, res) => {
  try {
    const { content, image } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ message: 'Post content cannot exceed 1000 characters' });
    }

    const post = new Post({
      user: req.user._id,
      content: content.trim(),
      image: image || ''
    });

    await post.save();

    // Update user posts count
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } });

    const populatedPost = await Post.findById(post._id)
      .populate('user', 'username name avatar');

    res.status(201).json({
      message: 'Post created successfully',
      post: populatedPost
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get feed (posts from users you follow + your own posts)
router.get('/feed', auth, async (req, res) => {
  try {
    // Get users that current user follows
    const follows = await Follow.find({ follower: req.user._id });
    const followingIds = follows.map(f => f.following);
    
    // Include current user's posts
    followingIds.push(req.user._id);

    const posts = await Post.find({ user: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .populate('user', 'username name avatar')
      .limit(50);

    // Check which posts are liked by current user
    const postsWithLikes = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.likes.some(likeId => likeId.toString() === req.user._id.toString());
      return postObj;
    });

    res.json(postsWithLikes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all posts (for discovery)
router.get('/all', auth, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', 'username name avatar')
      .limit(50);

    const postsWithLikes = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.likes.some(likeId => likeId.toString() === req.user._id.toString());
      return postObj;
    });

    res.json(postsWithLikes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single post
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username name avatar');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const postObj = post.toObject();
    postObj.isLiked = post.likes.some(likeId => likeId.toString() === req.user._id.toString());

    res.json(postObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like/Unlike post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isLiked = post.likes.some(likeId => likeId.toString() === req.user._id.toString());

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(likeId => likeId.toString() !== req.user._id.toString());
    } else {
      // Like
      post.likes.push(req.user._id);
    }

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('user', 'username name avatar');

    const postObj = populatedPost.toObject();
    postObj.isLiked = !isLiked;

    res.json({
      message: isLiked ? 'Post unliked' : 'Post liked',
      post: postObj
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Delete all comments on this post
    await Comment.deleteMany({ post: post._id });

    // Update user posts count
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: -1 } });

    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
