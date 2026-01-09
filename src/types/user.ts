export type User = {
  id: string
  email: string
  name: string
  permissions: string[]
  position?: string
  birthday?: string
  profilePic?: string
  banner?: string
  bio?: string
  status?: 'online' | 'busy' | 'away' | 'offline'
  monthlySalary?: number
  clientCompanyId?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
}
