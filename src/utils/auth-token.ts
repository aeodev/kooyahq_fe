let accessToken: string | null = null
const listeners = new Set<(token: string | null) => void>()

export function setAccessToken(token: string | null) {
  accessToken = token
  listeners.forEach((listener) => listener(token))
}

export function getAccessToken() {
  return accessToken
}

export function clearAccessToken() {
  setAccessToken(null)
}

export function subscribeAccessToken(listener: (token: string | null) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
