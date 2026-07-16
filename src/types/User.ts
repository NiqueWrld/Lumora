export const Role = {
  User: 'user',
} as const

export type Role = typeof Role[keyof typeof Role]

export interface User {
  id: string
  name: string
  email: string
  role: Role
}
