# Project Management Tool

A collaborative project management tool similar to Trello/Asana with real-time updates.

**Author:** Jayesh Patil

## Features

- Create group projects
- Assign tasks to team members
- Comment on tasks
- Drag & drop tasks between columns
- Real-time updates with WebSockets
- Notifications

## Tech Stack

- **Backend:** Node.js, Express.js, MongoDB, Socket.io
- **Frontend:** HTML, CSS, JavaScript

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up MongoDB (make sure it's running)

3. Create `.env` file:
   ```
   PORT=3002
   MONGODB_URI=mongodb://localhost:27017/projectmanagement
   JWT_SECRET=your-secret-key
   ```

4. Seed database (optional):
   ```bash
   npm run seed
   ```

5. Start server:
   ```bash
   npm start
   ```

6. Open `http://localhost:3002` in browser

## Usage

1. Register/Login to create account
2. Create a new project
3. Open project to see Kanban board
4. Create tasks in columns
5. Assign tasks to team members
6. Drag tasks between columns
7. Add comments to tasks
8. Manage project members in settings
9. View notifications

## License

ISC
