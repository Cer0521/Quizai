import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

import Welcome from './pages/Welcome'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import VerifyEmail from './pages/auth/VerifyEmail'

import TeacherDashboard from './pages/teacher/Dashboard'
import QuizList from './pages/teacher/quizzes/QuizList'
import CreateQuiz from './pages/teacher/quizzes/CreateQuiz'
import GenerateQuiz from './pages/teacher/quizzes/GenerateQuiz'
import EditQuiz from './pages/teacher/quizzes/EditQuiz'
import QuizAnalytics from './pages/teacher/quizzes/QuizAnalytics'
import AssignQuiz from './pages/teacher/quizzes/AssignQuiz'
import Pricing from './pages/Pricing'
import TeamJoin from './pages/TeamJoin'

import StudentDashboard from './pages/student/Dashboard'
import QuizPage from './pages/student/quizzes/QuizPage'
import QuizResult from './pages/student/quizzes/QuizResult'
import AttemptHistory from './pages/student/history/AttemptHistory'

import Profile from './pages/shared/Profile'
import GuestQuizPage from './pages/guest/GuestQuizPage'
import GuestQuizResult from './pages/guest/GuestQuizResult'

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
  </div>
)

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireTeacher({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'teacher') return <Navigate to="/student/dashboard" replace />
  return children
}

function RequireStudent({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'student') return <Navigate to="/teacher/dashboard" replace />
  return children
}

function RequireGuest({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />
  return children
}

function LockedFeature({ feature }) {
  const featureLabels = {
    analytics_dashboard: 'Analytics dashboard',
    blueprinting: 'AI blueprint generation',
    all_quiz_formats: 'Advanced quiz formats',
    team_management: 'Team management',
    lms_export: 'LMS export',
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-5xl mb-4">\ud83d\udd12</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Feature Locked</h2>
        <p className="text-sm text-gray-600 mb-6">
          {featureLabels[feature] || 'This feature'} is available on Pro or Team plans.
        </p>
        <Link to="/pricing" className="inline-flex items-center px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">
          Upgrade Plan
        </Link>
      </div>
    </div>
  )
}

function RequireFeature({ feature, children }) {
  const { user, loading, canAccessFeature } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!canAccessFeature(feature)) return <LockedFeature feature={feature} />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
      <Route path="/register" element={<RequireGuest><Register /></RequireGuest>} />
      <Route path="/forgot-password" element={<RequireGuest><ForgotPassword /></RequireGuest>} />
      <Route path="/reset-password/:token" element={<RequireGuest><ResetPassword /></RequireGuest>} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/pricing" element={<RequireAuth><Pricing /></RequireAuth>} />
      <Route path="/team/join/:token" element={<RequireTeacher><TeamJoin /></RequireTeacher>} />

      {/* Teacher routes */}
      <Route path="/teacher/dashboard" element={<RequireTeacher><TeacherDashboard /></RequireTeacher>} />
      <Route path="/teacher/quizzes" element={<RequireTeacher><QuizList /></RequireTeacher>} />
      <Route path="/teacher/quizzes/create" element={<RequireTeacher><CreateQuiz /></RequireTeacher>} />
      <Route
        path="/teacher/quizzes/generate"
        element={<RequireTeacher><RequireFeature feature="blueprinting"><GenerateQuiz /></RequireFeature></RequireTeacher>}
      />
      <Route path="/teacher/quizzes/:id/edit" element={<RequireTeacher><EditQuiz /></RequireTeacher>} />
      <Route
        path="/teacher/quizzes/:id/analytics"
        element={<RequireTeacher><RequireFeature feature="analytics_dashboard"><QuizAnalytics /></RequireFeature></RequireTeacher>}
      />
      <Route path="/teacher/quizzes/:id/assign" element={<RequireTeacher><AssignQuiz /></RequireTeacher>} />

      {/* Student routes */}
      <Route path="/student/dashboard" element={<RequireStudent><StudentDashboard /></RequireStudent>} />
      <Route path="/student/quiz/:assignmentId" element={<RequireStudent><QuizPage /></RequireStudent>} />
      <Route path="/student/result/:attemptId" element={<RequireStudent><QuizResult /></RequireStudent>} />
      <Route path="/student/history" element={<RequireStudent><AttemptHistory /></RequireStudent>} />

      {/* Shared */}
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

      {/* Public: guest quiz access (no login required) */}
      <Route path="/quiz/:token" element={<GuestQuizPage />} />
      <Route path="/quiz/:token/result/:attemptId" element={<GuestQuizResult />} />

      {/* Legacy redirects */}
      <Route path="/dashboard" element={<RequireAuth><RoleDashboard /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RoleDashboard() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />
}
