import { useAuth } from '../../context/AuthContext'
import { User, Envelope, ShieldCheck } from '@phosphor-icons/react'

function Profile() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Profile</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <User size={18} className="text-gray-400" weight="duotone" />
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</span>
            <p className="text-lg dark:text-gray-100">{user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Envelope size={18} className="text-gray-400" weight="duotone" />
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</span>
            <p className="text-lg dark:text-gray-100">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-gray-400" weight="duotone" />
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</span>
            <p className="text-lg capitalize dark:text-gray-100">{user.role}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
