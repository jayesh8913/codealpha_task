const express = require('express');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const User = require('../models/User');
const router = express.Router();
const io = global.io;

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = new Project({
      name: name.trim(),
      description: description || '',
      owner: req.user._id,
      members: [req.user._id]
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'username name avatar')
      .populate('members', 'username name avatar');

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all projects for user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { members: req.user._id }
      ]
    })
    .populate('owner', 'username name avatar')
    .populate('members', 'username name avatar')
    .sort({ updatedAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'username name avatar')
      .populate('members', 'username name avatar');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is member or owner
    const isMember = project.owner._id.toString() === req.user._id.toString() ||
                     project.members.some(m => m._id.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get tasks for this project
    const tasks = await Task.find({ project: project._id })
      .populate('assignedTo', 'username name avatar')
      .populate('createdBy', 'username name avatar')
      .sort({ order: 1, createdAt: -1 });

    res.json({
      project,
      tasks
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can update project' });
    }

    const { name, description, columns } = req.body;

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description;
    if (columns) project.columns = columns;

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'username name avatar')
      .populate('members', 'username name avatar');

    // Emit update to all project members
    io.to(`project-${project._id}`).emit('project-updated', populatedProject);

    res.json({
      message: 'Project updated successfully',
      project: populatedProject
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add member to project
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner or member
    const isMember = project.owner.toString() === req.user._id.toString() ||
                     project.members.some(m => m.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already a member
    if (project.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    project.members.push(userId);
    await project.save();

    // Create notification
    const notification = new Notification({
      user: userId,
      type: 'project_invite',
      title: 'Project Invitation',
      message: `${req.user.name} added you to project "${project.name}"`,
      project: project._id
    });
    await notification.save();

    // Emit notification via WebSocket
    io.to(`user-${userId}`).emit('notification', notification);

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'username name avatar')
      .populate('members', 'username name avatar');

    // Emit update to all project members
    io.to(`project-${project._id}`).emit('project-updated', populatedProject);

    res.json({
      message: 'Member added successfully',
      project: populatedProject
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove member from project
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can remove members' });
    }

    project.members = project.members.filter(
      m => m.toString() !== req.params.userId
    );
    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'username name avatar')
      .populate('members', 'username name avatar');

    // Emit update to all project members
    io.to(`project-${project._id}`).emit('project-updated', populatedProject);

    res.json({
      message: 'Member removed successfully',
      project: populatedProject
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can delete project' });
    }

    // Delete all tasks and comments
    const tasks = await Task.find({ project: project._id });
    for (const task of tasks) {
      await require('../models/Comment').deleteMany({ task: task._id });
    }
    await Task.deleteMany({ project: project._id });

    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
