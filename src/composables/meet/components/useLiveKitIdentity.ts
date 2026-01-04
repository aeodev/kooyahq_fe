import { useCallback } from 'react'

export function useLiveKitIdentity(
  identityMapRef: React.MutableRefObject<Map<string, string>>
) {
  const setIdentityMapping = useCallback(
    (liveKitId: string, databaseId: string) => {
      identityMapRef.current.set(liveKitId, databaseId)
    },
    [identityMapRef]
  )

  const getDatabaseId = useCallback(
    (liveKitId: string): string => {
      return identityMapRef.current.get(liveKitId) || liveKitId
    },
    [identityMapRef]
  )

  const getLiveKitId = useCallback(
    (databaseId: string): string | undefined => {
      for (const [liveKitId, dbId] of identityMapRef.current.entries()) {
        if (dbId === databaseId) return liveKitId
      }
      return undefined
    },
    [identityMapRef]
  )

  return {
    setIdentityMapping,
    getDatabaseId,
    getLiveKitId,
  }
}

