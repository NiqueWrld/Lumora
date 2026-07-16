import { useAuth } from '../../context/AuthContext'
import { useNavigate, NavLink, Link } from 'react-router-dom'
import { APP_NAME, APP_LOGO } from '../../lib/constants'
import { ROUTES } from '../../lib/routes'
import { SquaresFour, User, Gear, SignOut } from '@phosphor-icons/react'

const links = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: SquaresFour },
  { label: 'Profile', href: ROUTES.PROFILE, icon: User },
  { label: 'Settings', href: ROUTES.SETTINGS, icon: Gear },
]

function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
  }

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex-shrink-0 p-4 flex flex-col overflow-y-auto">
      <Link to={ROUTES.HOME} className="flex items-center gap-3 mb-6 px-3 hover:opacity-80 transition-opacity">
        <img src={APP_LOGO} alt="Logo" className="h-8 w-8 object-contain" />
        <span className="text-lg font-semibold text-gray-900 dark:text-white">{APP_NAME}</span>
      </Link>
      <nav className="space-y-1 flex-1">
        {links.map((link) => (
          <NavLink
            key={link.href}
            to={link.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <link.icon size={18} weight="duotone" />
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-gray-200 dark:border-gray-700 pt-4 px-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium">
            {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
        >
          <SignOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
