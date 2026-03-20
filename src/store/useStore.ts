// ─────────────────────────────────────────────────────────────
// useStore.ts — Global state management with Zustand
//
// Zustand is simpler than Redux. Think of it as a shared object
// that any component can read from or write to.
//
// Why we need this:
// - The logged-in user is needed in MANY components
// - Groups and expenses are fetched once and reused
// - Avoids "prop drilling" (passing data down 5 levels of components)
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand'
import type { User, Group, Expense, Settlement } from '@/types'

// Shape of our global state + actions
interface AppState {
  // ── Auth state ───────────────────────────────────────────
  currentUser: User | null
  authLoading: boolean        // true while Firebase checks if user is logged in
  setCurrentUser: (user: User | null) => void
  setAuthLoading: (loading: boolean) => void

  // ── Groups ───────────────────────────────────────────────
  groups: Group[]             // all groups the current user is in
  groupsLoading: boolean
  setGroups: (groups: Group[]) => void
  setGroupsLoading: (loading: boolean) => void

  // ── Current group (when viewing a specific group) ────────
  activeGroup: Group | null
  setActiveGroup: (group: Group | null) => void

  // ── Expenses for the active group ────────────────────────
  expenses: Expense[]
  expensesLoading: boolean
  setExpenses: (expenses: Expense[]) => void
  setExpensesLoading: (loading: boolean) => void

  // ── Settlements for the active group ─────────────────────
  settlements: Settlement[]
  setSettlements: (settlements: Settlement[]) => void

  // ── Members cache ─────────────────────────────────────────
  // Store user profiles so we can show names without re-fetching
  // Key: userId, Value: User object
  usersCache: Record<string, User>
  addUserToCache: (user: User) => void

  // ── UI state ──────────────────────────────────────────────
  error: string | null
  setError: (error: string | null) => void
}

// Create the store — this is a React hook you call in components
export const useStore = create<AppState>((set) => ({
  // ── Initial values ────────────────────────────────────────
  currentUser: null,
  authLoading: true,       // start as true — Firebase hasn't loaded yet
  groups: [],
  groupsLoading: false,
  activeGroup: null,
  expenses: [],
  expensesLoading: false,
  settlements: [],
  usersCache: {},
  error: null,

  // ── Setters (actions) ─────────────────────────────────────
  // These are functions components call to update state

  setCurrentUser: (user) => set({ currentUser: user }),

  setAuthLoading: (loading) => set({ authLoading: loading }),

  setGroups: (groups) => set({ groups }),

  setGroupsLoading: (loading) => set({ groupsLoading: loading }),

  setActiveGroup: (group) => set({ activeGroup: group }),

  setExpenses: (expenses) => set({ expenses }),

  setExpensesLoading: (loading) => set({ expensesLoading: loading }),

  setSettlements: (settlements) => set({ settlements }),

  // Merge new user into cache without replacing existing entries
  addUserToCache: (user) =>
    set((state) => ({
      usersCache: { ...state.usersCache, [user.id]: user },
    })),

  setError: (error) => set({ error }),
}))
