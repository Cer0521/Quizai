import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import { PLAN_LABELS } from '../utils/subscription'
import AdsComponent from './AdsComponent'

export default function AppLayout({ children, header }) {
  const { user, logout, isTeacher, subscription } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/notifications').then(r => setNotifications(r.data.notifications)).catch(() => {})
  }, [])

  const unread = notifications.filter(n => !n.is_read).length

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  async function openNotifications() {
    setNotifOpen(!notifOpen)
    if (!notifOpen && unread > 0) {
      await api.post('/notifications/read').catch(() => {})
      setNotifications(n => n.map(x => ({ ...x, is_read: 1 })))
    }
  }

  const navLinks = isTeacher
    ? [
        { to: '/teacher/dashboard', label: 'Dashboard' },
        { to: '/teacher/quizzes', label: 'My Quizzes' },
        { to: '/pricing', label: 'Pricing' },
      ]
    : [
        { to: '/student/dashboard', label: 'My Quizzes' },
        { to: '/student/history', label: 'History' },
        { to: '/pricing', label: 'Pricing' },
      ]

  const currentPlan = PLAN_LABELS[subscription?.plan] || 'Free'
  const usageText = subscription?.quiz_limit == null
    ? 'Unlimited quizzes'
    : `${subscription?.quiz_count || 0}/${subscription?.quiz_limit || 5} used`
  const showAds = subscription?.ads_visible === true

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b border-gray-100 relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to={isTeacher ? '/teacher/dashboard' : '/student/dashboard'} className="text-xl font-extrabold">
                Quiz<span className="text-red-600">Craft</span> AI
              </Link>
              <div className="hidden sm:flex gap-6">
                {navLinks.map(({ to, label }) => (
                  <Link key={to} to={to} className={`text-sm font-medium border-b-2 pb-0.5 transition ${
                    location.pathname.startsWith(to) ? 'border-red-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>{label}</Link>
                ))}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              {/* Role badge */}
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${isTeacher ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {isTeacher ? 'Teacher' : 'Student'}
              </span>

              <div className="text-right">
                <p className="text-[11px] font-semibold text-gray-700">{currentPlan} Plan</p>
                <p className="text-[10px] text-gray-500">{usageText}</p>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button onClick={openNotifications} className="relative p-2 text-gray-500 hover:text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full" />}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-10 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 max-h-80 overflow-y-auto z-50">
                    <div className="p-3 border-b font-semibold text-sm text-gray-700">Notifications</div>
                    {notifications.length === 0
                      ? <p className="p-4 text-sm text-gray-400">No notifications</p>
                      : notifications.map(n => (
                          <div key={n.id} className={`px-4 py-3 border-b text-sm ${!n.is_read ? 'bg-blue-50' : ''}`}>
                            <p className="text-gray-800">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{n.created_at?.split('T')[0]}</p>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>

              {/* User dropdown */}
              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded">
                  <span>{user?.name}</span>
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-9 w-44 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50" onMouseLeave={() => setDropdownOpen(false)}>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setDropdownOpen(false)}>Profile</Link>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Log Out</button>
                  </div>
                )}
              </div>
            </div>

            {/* Hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="sm:hidden p-2 text-gray-400 hover:text-gray-600">
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="sm:hidden border-t bg-white">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>{label}</Link>
            ))}
            <div className="px-4 py-2 border-t text-xs text-gray-500">
              <p className="font-semibold text-gray-700">{currentPlan} Plan</p>
              <p>{usageText}</p>
            </div>
            <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Profile</Link>
            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Log Out</button>
          </div>
        )}
      </nav>

      {header && (
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">{header}</div>
        </header>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {showAds && <AdsComponent />}
        {children}
      </main>
    </div>
  )
}
