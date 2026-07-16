import { Role } from '../types/User'
import type { User } from '../types/User'
import UserDashboard from './User/Dashboard'

interface Props {
  user: User
}

function Dashboard({ user }: Props) {
  switch (user.role) {
    case Role.User:
      return <UserDashboard />
    default:
      return <div>Unauthorized</div>
  }
}

export default Dashboard
