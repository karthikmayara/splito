// ─────────────────────────────────────────────────────────────
// firestoreService.ts — All Firestore read/write operations
//
// Keeping all database calls in one file means:
// - Easy to audit what data is being read/written
// - Components stay clean (no Firestore imports scattered everywhere)
// - Easy to mock for testing later
// ─────────────────────────────────────────────────────────────

import {
  collection, doc, getDoc, getDocs, addDoc,
  updateDoc, deleteDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, Timestamp, writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/firebase'
import type { Group, Expense, User, Settlement } from '@/types'

// ── Helper: generate random invite code ──────────────────────
// Produces something like "ax7k2m9q" — short enough to share
function generateInviteCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

// ═══════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════

// Fetch a single user profile by ID
export async function getUser(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as User
}

// Fetch multiple users at once (for loading group members)
export async function getUsers(userIds: string[]): Promise<User[]> {
  if (userIds.length === 0) return []
  // Firestore doesn't support "WHERE id IN [...]" with more than 30 items
  // For a roommate app, groups will be small, so this is fine
  const promises = userIds.map(id => getUser(id))
  const users = await Promise.all(promises)
  return users.filter((u): u is User => u !== null)
}

// Update user profile (e.g. adding UPI ID)
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'upiId' | 'venmoHandle'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), updates)
}

// ═══════════════════════════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════════════════════════

// Create a new group and add the creator as the first member
export async function createGroup(
  name: string,
  currency: Group['currency'],
  createdBy: string,
  description?: string
): Promise<Group> {
  const inviteCode = generateInviteCode()

  const groupData: Omit<Group, 'id'> = {
    name,
    description: description || '',
    currency,
    createdBy,
    members: [createdBy],   // creator is automatically a member
    inviteCode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  // Let Firestore generate the document ID
  const ref = await addDoc(collection(db, 'groups'), {
    ...groupData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return { id: ref.id, ...groupData }
}

// Listen to all groups a user belongs to (real-time)
// Returns an unsubscribe function — call it when component unmounts
export function subscribeToUserGroups(
  userId: string,
  onUpdate: (groups: Group[]) => void
): Unsubscribe {
  // Query: groups where members array contains this userId
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  )

  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamps to milliseconds
      createdAt: doc.data().createdAt instanceof Timestamp
        ? doc.data().createdAt.toMillis()
        : doc.data().createdAt,
      updatedAt: doc.data().updatedAt instanceof Timestamp
        ? doc.data().updatedAt.toMillis()
        : doc.data().updatedAt,
    })) as Group[]
    onUpdate(groups)
  }, (error) => {
    console.error("subscribeToUserGroups failed:", error)
    // Send an empty array to unblock loading state
    onUpdate([])
  })
}

// Get a group by its invite code (for the join flow)
export async function getGroupByInviteCode(code: string): Promise<Group | null> {
  const q = query(
    collection(db, 'groups'),
    where('inviteCode', '==', code.toLowerCase())
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const docSnap = snap.docs[0]
  return { id: docSnap.id, ...docSnap.data() } as Group
}

// Check if a group exists or if the user is denied access
export async function checkGroupAccess(groupId: string): Promise<'found' | 'not-found' | 'denied'> {
  try {
    const snap = await getDoc(doc(db, 'groups', groupId))
    if (snap.exists()) return 'found'
    return 'not-found'
  } catch (err: any) {
    if (err.code === 'permission-denied') return 'denied'
    return 'not-found'
  }
}

// Add a user to a group's members array
export async function joinGroup(groupId: string, userId: string): Promise<void> {
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  if (!groupSnap.exists()) throw new Error('Group not found')

  const members: string[] = groupSnap.data().members || []

  // Idempotent: don't add if already a member
  if (members.includes(userId)) return

  await updateDoc(groupRef, {
    members: [...members, userId],
    updatedAt: serverTimestamp(),
  })
}

// Archive or unarchive a group
export async function toggleGroupArchive(groupId: string, isArchived: boolean): Promise<void> {
  const ref = doc(db, 'groups', groupId)
  await updateDoc(ref, {
    isArchived,
    updatedAt: serverTimestamp(),
  })
}

// ═══════════════════════════════════════════════════════════
// EXPENSES & RECEIPTS
// ═══════════════════════════════════════════════════════════

// Upload a receipt photo to Firebase Storage and return its URL
export async function uploadReceiptImage(file: File, groupId: string): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `receipts/${groupId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
  const storageRef = ref(storage, fileName)
  const snapshot = await uploadBytes(storageRef, file)
  return await getDownloadURL(snapshot.ref)
}

// Add a new expense to a group
export async function addExpense(
  expense: Omit<Expense, 'id' | 'createdAt'>
): Promise<Expense> {
  const ref = await addDoc(collection(db, 'expenses'), {
    ...expense,
    createdAt: serverTimestamp(),
  })

  // Touch the group's updatedAt so it sorts to top of dashboard
  await updateDoc(doc(db, 'groups', expense.groupId), {
    updatedAt: serverTimestamp(),
  })

  return { id: ref.id, ...expense, createdAt: Date.now() }
}

// Update an existing expense
export async function updateExpense(
  expenseId: string,
  groupId: string,
  updates: Partial<Omit<Expense, 'id' | 'groupId' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  const ref = doc(db, 'expenses', expenseId)
  
  await updateDoc(ref, updates)

  // Touch the group's updatedAt so it stays fresh
  await updateDoc(doc(db, 'groups', groupId), {
    updatedAt: serverTimestamp(),
  })
}

// Listen to all expenses in a group (real-time)
export function subscribeToGroupExpenses(
  groupId: string,
  onUpdate: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'expenses'),
    where('groupId', '==', groupId),
    orderBy('date', 'desc')   // most recent first
  )

  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt instanceof Timestamp
        ? doc.data().createdAt.toMillis()
        : doc.data().createdAt,
    })) as Expense[]
    onUpdate(expenses)
  })
}

// Delete an expense (only the creator should be able to do this)
export async function deleteExpense(expenseId: string): Promise<void> {
  await deleteDoc(doc(db, 'expenses', expenseId))
}

// Delete a group and all its expenses/settlements
export async function deleteGroupAndContents(groupId: string): Promise<void> {
  const batch = writeBatch(db)
  
  // 1. Delete all expenses
  const expensesQuery = query(collection(db, 'expenses'), where('groupId', '==', groupId))
  const expensesSnap = await getDocs(expensesQuery)
  expensesSnap.forEach(docSnap => batch.delete(docSnap.ref))

  // 2. Delete all settlements
  const settlementsQuery = query(collection(db, 'settlements'), where('groupId', '==', groupId))
  const settlementsSnap = await getDocs(settlementsQuery)
  settlementsSnap.forEach(docSnap => batch.delete(docSnap.ref))

  // 3. Delete the group itself
  batch.delete(doc(db, 'groups', groupId))

  await batch.commit()
}

// ═══════════════════════════════════════════════════════════
// SETTLEMENTS
// ═══════════════════════════════════════════════════════════

// Record that someone settled a debt
export async function recordSettlement(
  settlement: Omit<Settlement, 'id' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(db, 'settlements'), {
    ...settlement,
    createdAt: serverTimestamp(),
  })
}

// Get all settlements for a group
export async function getGroupSettlements(groupId: string): Promise<Settlement[]> {
  const q = query(
    collection(db, 'settlements'),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Settlement[]
}

// Delete a settlement
export async function deleteSettlement(settlementId: string): Promise<void> {
  await deleteDoc(doc(db, 'settlements', settlementId))
}

// Listen to all settlements in a group (real-time)
export function subscribeToGroupSettlements(
  groupId: string,
  onUpdate: (settlements: Settlement[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'settlements'),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'desc')
  )

  return onSnapshot(q, (snapshot) => {
    const settlements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt instanceof Timestamp
        ? doc.data().createdAt.toMillis()
        : doc.data().createdAt,
    })) as Settlement[]
    onUpdate(settlements)
  })
}
