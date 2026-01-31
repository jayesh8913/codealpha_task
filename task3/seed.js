// Database seed script to add sample users and projects
const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
require('dotenv').config();

const sampleUsers = [
    {
        username: 'alice',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: 'password123',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
    },
    {
        username: 'bob',
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: 'password123',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    {
        username: 'charlie',
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        password: 'password123',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
    }
];

async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/projectmanagement', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Project.deleteMany({});
        await Task.deleteMany({});
        console.log('Cleared existing data');

        // Create users
        const users = [];
        for (const userData of sampleUsers) {
            const user = new User(userData);
            await user.save();
            users.push(user);
            console.log(`Created user: ${user.username}`);
        }

        // Create a sample project
        const project = new Project({
            name: 'Website Redesign',
            description: 'Redesign and rebuild the company website with modern UI/UX',
            owner: users[0]._id,
            members: [users[1]._id, users[2]._id],
            columns: [
                { name: 'To Do', order: 0 },
                { name: 'In Progress', order: 1 },
                { name: 'Review', order: 2 },
                { name: 'Done', order: 3 }
            ]
        });
        await project.save();
        console.log(`Created project: ${project.name}`);

        // Create sample tasks
        const tasks = [
            {
                title: 'Design homepage mockup',
                description: 'Create initial design mockup for the homepage with wireframes',
                project: project._id,
                column: 'In Progress',
                priority: 'high',
                assignedTo: users[1]._id,
                createdBy: users[0]._id,
                order: 0
            },
            {
                title: 'Set up development environment',
                description: 'Configure local development environment and install dependencies',
                project: project._id,
                column: 'Done',
                priority: 'medium',
                assignedTo: users[2]._id,
                createdBy: users[0]._id,
                order: 0
            },
            {
                title: 'Implement responsive navigation',
                description: 'Build responsive navigation menu for mobile and desktop',
                project: project._id,
                column: 'To Do',
                priority: 'medium',
                assignedTo: users[1]._id,
                createdBy: users[0]._id,
                order: 0
            },
            {
                title: 'Write unit tests',
                description: 'Write comprehensive unit tests for all components',
                project: project._id,
                column: 'To Do',
                priority: 'low',
                assignedTo: null,
                createdBy: users[0]._id,
                order: 1
            },
            {
                title: 'Code review and feedback',
                description: 'Review code changes and provide feedback to team members',
                project: project._id,
                column: 'Review',
                priority: 'high',
                assignedTo: users[0]._id,
                createdBy: users[1]._id,
                order: 0
            }
        ];

        for (const taskData of tasks) {
            const task = new Task(taskData);
            await task.save();
        }
        console.log(`Created ${tasks.length} tasks`);

        console.log('\n✅ Database seeded successfully!');
        console.log('\nSample users created:');
        sampleUsers.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.username} (${user.email}) - password: password123`);
        });
        console.log('\nYou can now login with any of these accounts.');
        console.log(`\nSample project "${project.name}" created with ${tasks.length} tasks.`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
