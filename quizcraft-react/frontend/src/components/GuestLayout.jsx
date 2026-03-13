import { Link } from 'react-router-dom'

export default function GuestLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100">
      <div className="mb-6">
        <Link to="/" className="text-3xl font-extrabold text-gray-900">
          Quiz<span className="text-red-600">Craft</span> AI
        </Link>
      </div>
      <div className="w-full sm:max-w-md mt-6 px-6 py-4 bg-white shadow-md overflow-hidden sm:rounded-lg">
        {children}
      </div>
    </div>
  )
}
