const express = require('express');
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const router = express.Router();

// Add comment
router.post('/', auth, async (req, res) => {
  try {
    const { postId, content } = req.body;

    if (!postId || !content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Post ID and content are required' });
    }

    if (content.length > 500) {
      return res.status(400).json({ message: 'Comment cannot exceed 500 characters' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = new Comment({
      post: postId,
      user: req.user._id,
      content: content.trim()
    });

    await comment.save();

    // Update post comments count
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'username name avatar');

    res.status(201).json({
      message: 'Comment added successfully',
      comment: populatedComment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get comments for a post
router.get('/post/:postId', auth, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: -1 })
      .populate('user', 'username name avatar');

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete comment
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Update post comments count
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });

    await Comment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
