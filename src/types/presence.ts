export type PresenceUser = {
  id: string
  name: string
  email: string
  profilePic?: string
  lat: number
  lng: number
  accuracy?: number
  lastSeen: string
  isActive: boolean
}
