import { useTheme } from '../../context/ThemeContext'
import { Moon, Bell, Key, Trash } from '@phosphor-icons/react'

function Settings() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Settings</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-6 max-w-2xl">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">General</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon size={18} className="text-gray-400" weight="duotone" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark Mode</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Toggle dark theme</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`w-10 h-6 rounded-full relative transition-colors ${
                  theme === 'dark' ? 'bg-indigo-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  theme === 'dark' ? 'left-5' : 'left-1'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-gray-400" weight="duotone" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enable email notifications</p>
                </div>
              </div>
              <button className="w-10 h-6 bg-indigo-500 rounded-full relative">
                <span className="absolute left-5 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account</h2>
          <div className="space-y-3">
            <button className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              <Key size={16} weight="duotone" />
              Change Password
            </button>
            <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-medium">
              <Trash size={16} weight="duotone" />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
