import { APP_NAME, APP_LOGO } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { ROUTES } from '../../lib/routes'
import { List, SignOut, SquaresFour } from '@phosphor-icons/react'

interface Props {
  onMenuToggle?: () => void
  showSidebar?: boolean
}

function Header({ onMenuToggle, showSidebar = true }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showSidebar && (
          <button onClick={onMenuToggle} className="md:hidden p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <List size={24} />
          </button>
        )}
        <Link to={ROUTES.HOME} className="flex items-center gap-2">
          <img src={APP_LOGO} alt="Logo" className={showSidebar ? 'h-8 md:hidden' : 'h-8'} />
          <span className={`text-lg font-bold dark:text-white ${showSidebar ? 'md:hidden' : ''}`}>{APP_NAME}</span>
        </Link>
      </div>
      <nav className="flex items-center gap-4">
        {user && (
          <Link to={ROUTES.DASHBOARD} className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hidden sm:flex">
            <SquaresFour size={18} />
            <span>Dashboard</span>
          </Link>
        )}
        {user && (
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <SignOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}
      </nav>
    </header>
  )
}

export default Header
