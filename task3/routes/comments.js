const express = require('express');
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const router = express.Router();
const io = global.io;

// Add comment
router.post('/', auth, async (req, res) => {
  try {
    const { taskId, content } = req.body;

    if (!taskId || !content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Task ID and content are required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findById(task.project);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is member
    const isMember = project.owner.toString() === req.user._id.toString() ||
                     project.members.some(m => m.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comment = new Comment({
      task: taskId,
      user: req.user._id,
      content: content.trim()
    });

    await comment.save();

    // Update task comments count
    task.commentsCount = (task.commentsCount || 0) + 1;
    await task.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'username name avatar');

    // Create notification if task is assigned to someone else
    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        user: task.assignedTo,
        type: 'task_comment',
        title: 'New Comment',
        message: `${req.user.name} commented on task: "${task.title}"`,
        project: task.project,
        task: task._id
      });
      await notification.save();
      io.to(`user-${task.assignedTo}`).emit('notification', notification);
    }

    // Emit comment added to project room
    io.to(`project-${task.project}`).emit('comment-added', {
      comment: populatedComment,
      taskId: task._id
    });

    res.status(201).json({
      message: 'Comment added successfully',
      comment: populatedComment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get comments for a task
router.get('/task/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findById(task.project);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is member
    const isMember = project.owner.toString() === req.user._id.toString() ||
                     project.members.some(m => m.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comments = await Comment.find({ task: req.params.taskId })
      .populate('user', 'username name avatar')
      .sort({ createdAt: 1 });

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

    const task = await Task.findById(comment.task);
    if (task) {
      task.commentsCount = Math.max(0, (task.commentsCount || 0) - 1);
      await task.save();
    }

    await Comment.findByIdAndDelete(req.params.id);

    // Emit comment deleted to project room
    if (task) {
      io.to(`project-${task.project}`).emit('comment-deleted', {
        commentId: comment._id,
        taskId: task._id
      });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
