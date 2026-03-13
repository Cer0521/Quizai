import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Welcome() {
  const { user } = useAuth()

  return (
    <div className="bg-black text-white antialiased">
      <div className="relative min-h-screen flex flex-col">
        <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden px-6 py-20">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(239,68,68,0.1),rgba(0,0,0,0.5))]"></div>

          <main className="relative z-10 text-center max-w-4xl">
            <h1 className="text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              Quiz<span className="text-red-600">Craft</span> AI
            </h1>

            <p className="text-2xl text-gray-300 mb-4 font-light">
              Turn documents into comprehensive assessments instantly
            </p>
            <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
              Upload your study materials, PDFs, or notes and let AI generate customized quizzes,
              exams, and assessments tailored to your needs.
            </p>

            <div className="flex gap-4 justify-center mb-16">
              {user ? (
                <Link
                  to="/dashboard"
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition transform hover:scale-105"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition transform hover:scale-105"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-8 py-4 bg-transparent border-2 border-red-600 hover:bg-red-600/10 text-white font-bold rounded-lg transition"
                  >
                    Create Free Account
                  </Link>
                </>
              )}
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 pt-12 border-t border-gray-800">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Instant Generation</h3>
                <p className="text-gray-400 text-sm">Create assessments in seconds, not hours</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Fully Customizable</h3>
                <p className="text-gray-400 text-sm">Choose question types, difficulty, and count</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Easy to Edit</h3>
                <p className="text-gray-400 text-sm">Refine questions and answers after generation</p>
              </div>
            </div>
          </main>
        </div>

        <footer className="relative z-10 border-t border-gray-800 py-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} QuizCraft AI. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
