const express = require('express');
const auth = require('../middleware/auth');
const Follow = require('../models/Follow');
const User = require('../models/User');
const router = express.Router();

// Follow user
router.post('/:userId', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const existingFollow = await Follow.findOne({
      follower: req.user._id,
      following: targetUser._id
    });

    if (existingFollow) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    const follow = new Follow({
      follower: req.user._id,
      following: targetUser._id
    });

    await follow.save();

    // Update follower counts
    await User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(targetUser._id, { $inc: { followersCount: 1 } });

    res.json({
      message: 'User followed successfully',
      isFollowing: true
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Already following this user' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Unfollow user
router.delete('/:userId', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const follow = await Follow.findOne({
      follower: req.user._id,
      following: targetUser._id
    });

    if (!follow) {
      return res.status(400).json({ message: 'Not following this user' });
    }

    await Follow.findByIdAndDelete(follow._id);

    // Update follower counts
    await User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(targetUser._id, { $inc: { followersCount: -1 } });

    res.json({
      message: 'User unfollowed successfully',
      isFollowing: false
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get followers of a user
router.get('/followers/:userId', auth, async (req, res) => {
  try {
    const follows = await Follow.find({ following: req.params.userId })
      .populate('follower', 'username name avatar bio')
      .sort({ createdAt: -1 });

    const followers = follows.map(f => f.follower);
    res.json(followers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get users that a user is following
router.get('/following/:userId', auth, async (req, res) => {
  try {
    const follows = await Follow.find({ follower: req.params.userId })
      .populate('following', 'username name avatar bio')
      .sort({ createdAt: -1 });

    const following = follows.map(f => f.following);
    res.json(following);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
