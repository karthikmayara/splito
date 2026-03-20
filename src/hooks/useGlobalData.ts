import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { subscribeToUserGroups, getUsers } from '@/utils/firestoreService'

export function useGlobalData() {
  const { currentUser, setGroups, setGroupsLoading, usersCache, addUserToCache } = useStore()

  useEffect(() => {
    if (!currentUser) return

    setGroupsLoading(true)
    const unsub = subscribeToUserGroups(currentUser.id, async (fetchedGroups) => {
      setGroups(fetchedGroups)
      setGroupsLoading(false)

      const allMemberIds = [...new Set(fetchedGroups.flatMap(g => g.members))]
      const uncachedIds = allMemberIds.filter(id => !usersCache[id])
      if (uncachedIds.length > 0) {
        const users = await getUsers(uncachedIds)
        users.forEach(u => addUserToCache(u))
      }
    })

    return () => unsub()
  }, [currentUser?.id])
}
