import React from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import ErrorBoundary from './components/ErrorBoundary'
import AdminLayout from './layouts/AdminLayout'
import StudentLayout from './layouts/StudentLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import StudentLogin from './pages/StudentLogin'
import AdminLogin from './pages/AdminLogin'
import Register from './pages/Register'
import AdminDashboard from './pages/AdminDashboard'
import AdminDriveList from './pages/AdminDriveList'
import AdminDriveDetails from './pages/AdminDriveDetails'
import AdminDriveForm from './pages/AdminDriveForm'
import AdminStudents from './pages/AdminStudents'
import AdminRegistrations from './pages/AdminRegistrations'
import AdminCompanies from './pages/AdminCompanies'
import AdminSchedules from './pages/AdminSchedules'
import AdminReports from './pages/AdminReports'
import AdminActivityLog from './pages/AdminActivityLog'
import StudentDashboard from './pages/StudentDashboard'
import StudentDrives from './pages/StudentDrives'
import StudentDriveDetails from './pages/StudentDriveDetails'
import StudentProfile from './pages/StudentProfile'
import StudentApplications from './pages/StudentApplications'
import StudentSchedules from './pages/StudentSchedules'
import StudentNotifications from './pages/StudentNotifications'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><div className="surface p-8 text-center"><div className="skeleton h-8 w-48 mx-auto mb-3" /><p className="text-sm text-slate-500">Loading your workspace…</p></div></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />
  }
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/student/register" element={<Register />} />

            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="drives" element={<AdminDriveList />} />
              <Route path="drives/new" element={<AdminDriveForm />} />
              <Route path="drives/:id" element={<AdminDriveDetails />} />
              <Route path="drives/:id/edit" element={<AdminDriveForm />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="schedules" element={<AdminSchedules />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="registrations" element={<AdminRegistrations />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="activity-log" element={<AdminActivityLog />} />
            </Route>

            <Route path="/student" element={<ProtectedRoute roles={['student', 'admin']}><StudentLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="drives" element={<StudentDrives />} />
              <Route path="drives/:id" element={<StudentDriveDetails />} />
              <Route path="profile" element={<StudentProfile />} />
              <Route path="applications" element={<StudentApplications />} />
              <Route path="schedules" element={<StudentSchedules />} />
              <Route path="notifications" element={<StudentNotifications />} />
            </Route>

            <Route path="*" element={<div className="min-h-screen bg-slate-100 flex items-center justify-center p-4"><div className="surface p-10 text-center max-w-md"><p className="text-5xl font-extrabold text-slate-200">404</p><h1 className="font-extrabold text-slate-900 text-xl mt-2">Page not found</h1><p className="text-sm text-slate-500 mt-1">The page you are looking for moved or never existed.</p><Link to="/" className="btnx btnx-primary mt-5">Go home</Link></div></div>} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
