<<<<<<< HEAD
# Project Management Application (Module 2)

A full-stack MERN (MongoDB, Express, React, Node.js) application for project management with role-based access control, project templates, and milestone tracking.

## 🚀 Quick Start (Currently Running)

The application is currently running at:
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend:** http://localhost:5000 (API)

## 🛠️ Setup & Installation

If you need to restart the application, follow these steps:

### 1. Prerequisites
- **Node.js** (v16 or higher)
- **MongoDB** (Ensure your local MongoDB service is running)

### 2. Backend Setup
The backend handles the API, database connection, and authentication.

```bash
# Open a terminal
cd backend

# Install dependencies
npm install

# Run the Data Seeder (Optional - Resets DB with test data)
node seeder.js

# Start the server (Development Mode)
npm run dev
```
*Runs on port 5000 by default.*

### 3. Frontend Setup
The frontend is a React + Vite application.

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
*Runs on port 5173 by default.*

## 🔑 Login Credentials (Seed Data)

Use these credentials to access different roles:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Super Admin** | `super@demo.com` | `password123` | Full Access (Manage Users, Projects, Templates) |
| **Project Admin** | `admin@demo.com` | `password123` | Full Project Access |
| **Project Manager** | `manager@demo.com` | `password123` | Manage Own Projects |
| **Team Member** | `member@demo.com` | `password123` | View assigned projects/tasks |

## 🌟 Key Features
- **Project CRUD**: Create, Read, Update, Archive projects.
- **Templates**: Launch projects quickly using predefined templates (e.g., Standard Web Project).
- **Milestones**: Track progress with percentage-based milestone completion.
- **RBAC**: Secure role-based access for all actions.
=======
# IBM-Internship
>>>>>>> 2d0cb702aba023ac3dbb9f5f8a91f9e106e18411
