import { useState } from 'react'
import Header from './Header'
import Footer from './Footer'
import Sidebar from './Sidebar'

interface Props {
  children: React.ReactNode
  showSidebar?: boolean
}

function Layout({ children, showSidebar = true }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      {showSidebar && (
        <>
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          {/* Mobile sidebar */}
          <div className={`fixed z-30 top-0 left-0 h-full transition-transform md:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <Sidebar />
          </div>
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <Sidebar />
          </div>
        </>
      )}
      <div className="flex flex-col flex-1 min-h-screen">
        <Header onMenuToggle={showSidebar ? () => setSidebarOpen(!sidebarOpen) : undefined} showSidebar={showSidebar} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <Footer />
      </div>
    </div>
  )
}

export default Layout
