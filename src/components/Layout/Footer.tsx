import { APP_NAME } from '../../lib/constants'

function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
      &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
    </footer>
  )
}

export default Footer
