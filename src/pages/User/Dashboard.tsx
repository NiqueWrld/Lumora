import { useAuth } from '../../context/AuthContext'
import MetricCards from '../../components/MetricCards'
import { FolderOpen, ListChecks, CheckCircle } from '@phosphor-icons/react'

const metrics = [
  { label: 'Total Projects', value: 12, icon: FolderOpen },
  { label: 'Active Tasks', value: 8, icon: ListChecks },
  { label: 'Completed', value: 24, icon: CheckCircle },
]

function Dashboard() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 dark:text-white">Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Welcome back, {user?.name}!</p>
      <MetricCards metrics={metrics} />
    </div>
  )
}

export default Dashboard
