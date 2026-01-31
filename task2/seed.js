// Database seed script to add sample users and posts
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
const Follow = require('./models/Follow');
require('dotenv').config();

const sampleUsers = [
    {
        username: 'johndoe',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        bio: 'Software developer and tech enthusiast. Love coding and sharing knowledge!',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    {
        username: 'janedoe',
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        bio: 'Designer and creative thinker. Always exploring new ideas!',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
    },
    {
        username: 'alice',
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'password123',
        bio: 'Photographer and travel blogger. Capturing moments around the world.',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
    },
    {
        username: 'bob',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        password: 'password123',
        bio: 'Fitness coach and nutrition expert. Helping people live healthier lives.',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
    }
];

const samplePosts = [
    {
        content: 'Just finished building an amazing new feature! The power of modern web development never ceases to amaze me. 🚀 #coding #webdev',
        image: ''
    },
    {
        content: 'Beautiful sunset today! Sometimes you need to step away from the screen and appreciate nature. 🌅',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
    },
    {
        content: 'Working on a new design project. Excited to share it with everyone soon!',
        image: ''
    },
    {
        content: 'Just returned from an incredible trip to the mountains. The views were absolutely breathtaking! 🏔️',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
    },
    {
        content: 'New workout routine is paying off! Consistency is key. 💪',
        image: ''
    },
    {
        content: 'Learning a new programming language is always exciting. Today I\'m diving into TypeScript!',
        image: ''
    }
];

async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/socialmedia', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Post.deleteMany({});
        await Follow.deleteMany({});
        console.log('Cleared existing data');

        // Create users
        const users = [];
        for (const userData of sampleUsers) {
            const user = new User(userData);
            await user.save();
            users.push(user);
            console.log(`Created user: ${user.username}`);
        }

        // Create posts for users
        let postIndex = 0;
        for (const user of users) {
            // Each user gets 2-3 posts
            const numPosts = Math.floor(Math.random() * 2) + 2;
            for (let i = 0; i < numPosts && postIndex < samplePosts.length; i++) {
                const postData = samplePosts[postIndex];
                const post = new Post({
                    user: user._id,
                    content: postData.content,
                    image: postData.image
                });
                await post.save();
                
                // Update user posts count
                user.postsCount = (user.postsCount || 0) + 1;
                await user.save();
                
                postIndex++;
            }
        }
        console.log(`Created ${postIndex} posts`);

        // Create some follow relationships
        if (users.length >= 2) {
            // User 1 follows User 2
            const follow1 = new Follow({
                follower: users[0]._id,
                following: users[1]._id
            });
            await follow1.save();
            users[0].followingCount = (users[0].followingCount || 0) + 1;
            users[1].followersCount = (users[1].followersCount || 0) + 1;

            // User 2 follows User 0
            const follow2 = new Follow({
                follower: users[1]._id,
                following: users[0]._id
            });
            await follow2.save();
            users[1].followingCount = (users[1].followingCount || 0) + 1;
            users[0].followersCount = (users[0].followersCount || 0) + 1;

            // User 2 follows User 3
            if (users.length >= 4) {
                const follow3 = new Follow({
                    follower: users[1]._id,
                    following: users[3]._id
                });
                await follow3.save();
                users[1].followingCount = (users[1].followingCount || 0) + 1;
                users[3].followersCount = (users[3].followersCount || 0) + 1;
            }

            await Promise.all(users.map(u => u.save()));
            console.log('Created follow relationships');
        }

        console.log('\n✅ Database seeded successfully!');
        console.log('\nSample users created:');
        sampleUsers.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.username} (${user.email}) - password: password123`);
        });
        console.log('\nYou can now login with any of these accounts.');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
