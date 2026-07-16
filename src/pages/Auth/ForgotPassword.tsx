import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Envelope, PaperPlaneTilt, ArrowLeft } from '@phosphor-icons/react'
import { useTheme } from '../../context/ThemeContext'
import { ROUTES } from '../../lib/routes'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  useTheme()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: wire to API
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <Link to={ROUTES.HOME}><img src="/logo.svg" alt="Logo" className="mx-auto h-12 mb-4" /></Link>
        <h1 className="text-2xl font-bold text-center mb-2 dark:text-white">Forgot Password</h1>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
          Enter your email and we'll send you a reset link.
        </p>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                <PaperPlaneTilt size={32} weight="duotone" className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              If an account exists for <span className="font-medium">{email}</span>, a reset link has been sent.
            </p>
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <div className="relative">
                <Envelope size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <PaperPlaneTilt size={18} />
              Send Reset Link
            </button>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              <Link to={ROUTES.LOGIN} className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                <ArrowLeft size={14} />
                Back to Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
