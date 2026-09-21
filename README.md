# Placement Drive Management Portal

A full-stack web application for managing placement drives, student registrations, eligibility checks, shortlisting, and selections.

## Features

- Admin authentication with JWT
- Student registration and login
- Create, edit, delete, publish/unpublish placement drives
- Eligibility engine (CGPA, backlogs, department, graduation year, skills)
- Student registration for drives
- Admin can shortlist, select, or reject students
- Search and filter drives and students
- Dashboard with statistics
- Responsive design with React, Vite, Tailwind CSS

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, Lucide React icons
- **Backend:** Node.js, Express.js, JWT authentication, bcrypt, dotenv, CORS
- **Database:** JSON file-based storage (easy migration to MongoDB/PostgreSQL)

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm

### Installation

1. Clone the repository.
2. Navigate to the project directory.
3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
4. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

Start the backend server:
```bash
cd backend
npm run dev
```

Start the frontend development server:
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Demo Credentials

- **Admin:** admin@placement.com / admin123
- **Student:** student@placement.com / student123

## Project Structure

```
placement-drive-management-portal/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   ├── data/
│   ├── server.js
│   ├── package.json
│   └── .env
└── README.md
```

## API Endpoints

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Student registration
- `GET /api/auth/me` - Get current user
- `GET /api/drives` - Get all drives
- `GET /api/drives/:id` - Get single drive
- `POST /api/drives` - Create drive (admin)
- `PUT /api/drives/:id` - Update drive (admin)
- `DELETE /api/drives/:id` - Delete drive (admin)
- `GET /api/drives/:id/eligibility` - Check eligibility
- `POST /api/drives/:id/register` - Register for drive
- `GET /api/registrations` - Get all registrations (admin)
- `PUT /api/registrations/:id/status` - Update registration status (admin)
- `GET /api/dashboard/stats` - Get dashboard statistics (admin)
- `GET /api/students/:id` - Get student profile
- `PUT /api/students/:id` - Update student profile
