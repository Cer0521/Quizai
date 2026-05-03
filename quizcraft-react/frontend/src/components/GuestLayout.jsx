import { Link } from 'react-router-dom'

export default function GuestLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex flex-col">
      <div className="p-4">
        <Link to="/" className="text-lg font-bold">Quiz<span className="text-brand-600">Craft</span></Link>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {(title || subtitle) && (
            <div className="mb-6 text-center">
              {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
