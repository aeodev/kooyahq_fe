export type User = {
  id: string
  email: string
  name: string
  permissions: string[]
  userType?: 'employee' | 'client'
  position?: string
  birthday?: string
  profilePic?: string
  banner?: string
  bio?: string
  status?: 'online' | 'busy' | 'away' | 'offline'
  deletedAt?: string
  createdAt: string
  updatedAt: string
}
