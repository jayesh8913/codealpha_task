const express = require('express');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const router = express.Router();
const io = global.io;

// Create task
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, projectId, column, priority, dueDate, assignedTo } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is member
    const isMember = project.owner.toString() === req.user._id.toString() ||
                     project.members.some(m => m.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get max order in column
    const maxOrderTask = await Task.findOne({ project: projectId, column: column || 'To Do' })
      .sort({ order: -1 });
    const newOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;

    const task = new Task({
      title: title.trim(),
      description: description || '',
      project: projectId,
      column: column || 'To Do',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      order: newOrder
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'username name avatar')
      .populate('createdBy', 'username name avatar')
      .populate('project', 'name');

    // Create notification if assigned
    if (assignedTo && assignedTo !== req.user._id.toString()) {
      const notification = new Notification({
        user: assignedTo,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `${req.user.name} assigned you a task: "${task.title}"`,
        project: projectId,
        task: task._id
      });
      await notification.save();
      io.to(`user-${assignedTo}`).emit('notification', notification);
    }

    // Emit task created to project room
    io.to(`project-${projectId}`).emit('task-created', populatedTask);

    res.status(201).json({
      message: 'Task created successfully',
      task: populatedTask
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
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

    const { title, description, column, priority, dueDate, assignedTo, order } = req.body;

    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description;
    if (column) task.column = column;
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (order !== undefined) task.order = order;

    // Handle assignment change
    if (assignedTo !== undefined) {
      const oldAssignee = task.assignedTo ? task.assignedTo.toString() : null;
      task.assignedTo = assignedTo || null;
      const newAssignee = assignedTo ? assignedTo.toString() : null;

      // Create notifications
      if (newAssignee && newAssignee !== req.user._id.toString()) {
        const notification = new Notification({
          user: newAssignee,
          type: 'task_assigned',
          title: 'Task Assigned',
          message: `${req.user.name} assigned you a task: "${task.title}"`,
          project: task.project,
          task: task._id
        });
        await notification.save();
        io.to(`user-${newAssignee}`).emit('notification', notification);
      }
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'username name avatar')
      .populate('createdBy', 'username name avatar')
      .populate('project', 'name');

    // Create notification for task update
    if (task.assignedTo && task.assignedTo._id.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        user: task.assignedTo._id,
        type: 'task_updated',
        title: 'Task Updated',
        message: `${req.user.name} updated task: "${task.title}"`,
        project: task.project,
        task: task._id
      });
      await notification.save();
      io.to(`user-${task.assignedTo._id}`).emit('notification', notification);
    }

    // Emit task updated to project room
    io.to(`project-${task.project}`).emit('task-updated', populatedTask);

    res.json({
      message: 'Task updated successfully',
      task: populatedTask
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Move task (update column and order)
router.put('/:id/move', auth, async (req, res) => {
  try {
    const { column, order } = req.body;
    const task = await Task.findById(req.params.id);
    
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

    const oldColumn = task.column;
    task.column = column;
    task.order = order || 0;

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'username name avatar')
      .populate('createdBy', 'username name avatar')
      .populate('project', 'name');

    // Create notification if task was moved and assigned
    if (oldColumn !== column && task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        user: task.assignedTo._id,
        type: 'task_moved',
        title: 'Task Moved',
        message: `${req.user.name} moved task "${task.title}" to ${column}`,
        project: task.project,
        task: task._id
      });
      await notification.save();
      io.to(`user-${task.assignedTo._id}`).emit('notification', notification);
    }

    // Emit task moved to project room
    io.to(`project-${task.project}`).emit('task-moved', populatedTask);

    res.json({
      message: 'Task moved successfully',
      task: populatedTask
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
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

    const taskId = task._id;
    const projectId = task.project;

    // Delete all comments
    await require('../models/Comment').deleteMany({ task: taskId });

    await Task.findByIdAndDelete(taskId);

    // Emit task deleted to project room
    io.to(`project-${projectId}`).emit('task-deleted', { taskId, projectId });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
