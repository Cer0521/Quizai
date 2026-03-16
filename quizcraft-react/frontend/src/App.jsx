import { Routes, Route, Navigate } from 'react-router-dom'
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

import StudentDashboard from './pages/student/Dashboard'
import QuizPage from './pages/student/quizzes/QuizPage'
import QuizResult from './pages/student/quizzes/QuizResult'
import AttemptHistory from './pages/student/history/AttemptHistory'

import Profile from './pages/shared/Profile'

import QuizLanding from './pages/guest/QuizLanding'
import GuestStart from './pages/guest/GuestStart'
import GuestQuizPage from './pages/guest/GuestQuizPage'
import GuestQuizResult from './pages/guest/GuestQuizResult'
import Pricing from './pages/shared/Pricing'

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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
      <Route path="/register" element={<RequireGuest><Register /></RequireGuest>} />
      <Route path="/forgot-password" element={<RequireGuest><ForgotPassword /></RequireGuest>} />
      <Route path="/reset-password/:token" element={<RequireGuest><ResetPassword /></RequireGuest>} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />

      {/* Teacher routes */}
      <Route path="/teacher/dashboard" element={<RequireTeacher><TeacherDashboard /></RequireTeacher>} />
      <Route path="/teacher/quizzes" element={<RequireTeacher><QuizList /></RequireTeacher>} />
      <Route path="/teacher/quizzes/create" element={<RequireTeacher><CreateQuiz /></RequireTeacher>} />
      <Route path="/teacher/quizzes/generate" element={<RequireTeacher><GenerateQuiz /></RequireTeacher>} />
      <Route path="/teacher/quizzes/:id/edit" element={<RequireTeacher><EditQuiz /></RequireTeacher>} />
      <Route path="/teacher/quizzes/:id/analytics" element={<RequireTeacher><QuizAnalytics /></RequireTeacher>} />
      <Route path="/teacher/quizzes/:id/assign" element={<RequireTeacher><AssignQuiz /></RequireTeacher>} />

      {/* Student routes */}
      <Route path="/student/dashboard" element={<RequireStudent><StudentDashboard /></RequireStudent>} />
      <Route path="/student/quiz/:assignmentId" element={<RequireStudent><QuizPage /></RequireStudent>} />
      <Route path="/student/result/:attemptId" element={<RequireStudent><QuizResult /></RequireStudent>} />
      <Route path="/student/history" element={<RequireStudent><AttemptHistory /></RequireStudent>} />

      {/* Shared */}
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/pricing" element={<Pricing />} />

      {/* Guest quiz routes */}
      <Route path="/guest/quiz/:shareCode" element={<RequireGuest><QuizLanding /></RequireGuest>} />
      <Route path="/guest/start/:shareCode" element={<RequireGuest><GuestStart /></RequireGuest>} />
      <Route path="/guest/quiz/:attemptId/take" element={<RequireGuest><GuestQuizPage /></RequireGuest>} />
      <Route path="/guest/result/:attemptId" element={<RequireGuest><GuestQuizResult /></RequireGuest>} />

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
