
---

## Backend README

```md
# Team Task Manager Backend

Node.js + Express backend API for Team Task Manager app.

## Live URL
Backend: https://teamtaskmanagerbackend-production-cabb.up.railway.app

## Features
- User authentication
- JWT-based protected routes
- Project creation
- Add project members
- Task creation
- Task assignment
- Task status update
- Role-based access control

## Tech Stack
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Bcrypt
- CORS
- Dotenv

## Environment Variables

Create a `.env` file in backend root:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
