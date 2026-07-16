import { createContext, useContext, useState } from 'react'
import type { User } from '../types/User'
import { Role } from '../types/User'

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
}

const defaultUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: Role.User,
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(defaultUser)

  const login = (user: User) => setUser(user)
  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
