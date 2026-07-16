import { Link } from 'react-router-dom'
import { Lightning, Lock, DeviceMobile, SquaresFour } from '@phosphor-icons/react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../lib/routes'
import { APP_NAME } from '../lib/constants'

function Home() {
  useTheme()
  const { user } = useAuth()

  return (
    <div>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-24">
        <img src="/logo.svg" alt="Logo" className="h-16 mb-6" />
        <h1 className="text-4xl md:text-5xl font-bold mb-2 text-center dark:text-white">
          {user ? `Welcome back, ${user.name}!` : `Welcome to ${APP_NAME}`}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
          {user ? 'You are logged in. Head to your dashboard to get started.' : 'Get started by logging in or creating an account.'}
        </p>
        <div className="flex gap-4">
          {user ? (
            <Link to={ROUTES.DASHBOARD} className="py-2 px-6 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
              <SquaresFour size={18} />
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className="py-2 px-6 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors">
                Login
              </Link>
              <Link to={ROUTES.REGISTER} className="py-2 px-6 border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-medium rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                Register
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 bg-white dark:bg-gray-800">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 dark:text-white">Features</h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="flex justify-center mb-4">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full">
                <Lightning size={28} weight="duotone" className="text-yellow-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2 dark:text-white">Fast</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Lightning fast performance built for modern workflows.</p>
          </div>
          <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <Lock size={28} weight="duotone" className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2 dark:text-white">Secure</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Your data is protected with industry-standard security.</p>
          </div>
          <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                <DeviceMobile size={28} weight="duotone" className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2 dark:text-white">Responsive</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Works seamlessly on desktop, tablet, and mobile.</p>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="px-4 py-16 bg-gray-100 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 dark:text-white">About</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {APP_NAME} is designed to help you manage your projects efficiently.
            Built with modern technologies and a focus on user experience.
          </p>
        </div>
      </section>
    </div>
  )
}

export default Home

