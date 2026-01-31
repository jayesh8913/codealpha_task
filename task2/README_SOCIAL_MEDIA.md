# Social Media Platform

A mini social media app with posts, comments, likes, and follow system.

**Author:** Jayesh Patil

## Features

- User profiles
- Create and view posts
- Like/unlike posts
- Comments on posts
- Follow/unfollow users
- Feed and discover pages

## Tech Stack

- **Backend:** Node.js, Express.js, MongoDB
- **Frontend:** HTML, CSS, JavaScript

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up MongoDB (make sure it's running)

3. Create `.env` file:
   ```
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/socialmedia
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

6. Open `http://localhost:3001` in browser

## Usage

1. Register/Login to create account
2. Create posts on feed page
3. View feed from followed users
4. Discover all posts
5. Like and comment on posts
6. Follow other users
7. Edit your profile

## License

ISC
