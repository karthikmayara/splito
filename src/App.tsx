// ─────────────────────────────────────────────────────────────
// App.tsx — Root component
//
// Responsibilities:
// 1. Start the Firebase auth listener (useAuth)
// 2. Show a loading screen while auth state is being determined
// 3. Route logged-out users to Login
// 4. Route logged-in users to their Dashboard
// 5. Handle group invite links (/join/:code)
// ─────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGlobalData } from '@/hooks/useGlobalData'
import { useStore } from '@/store/useStore'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import GroupDetail from '@/pages/GroupDetail'
import EditExpense from '@/pages/EditExpense'
import AddExpense from '@/pages/AddExpense'
import JoinGroup from '@/pages/JoinGroup'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { InstallPrompt } from '@/components/InstallPrompt'
import { UpdatePrompt } from '@/components/UpdatePrompt'

// ── Auth Guard ────────────────────────────────────────────────
// Wraps routes that require login.
// If not logged in, redirects to /login.
// If auth is still loading, shows a spinner.
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, authLoading } = useStore()

  // Still checking auth state — show spinner to avoid flash of login page
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          {/* Animated logo dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-green-500"
                style={{ animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </div>
          <p className="text-slate-400 text-sm">Loading Splito...</p>
        </div>
      </div>
    )
  }

  // Not logged in — send to login page
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ── App Root ──────────────────────────────────────────────────
export default function App() {
  // Start Firebase auth listener — runs once when app mounts
  useAuth()
  
  // Start global data fetchers (groups, members cache)
  useGlobalData()

  return (
    <BrowserRouter>
      {/* Root Error Boundary catches any router-level crashes */}
      <ErrorBoundary>
        <InstallPrompt />
        <UpdatePrompt />
        <Routes>
          {/* Public routes — no login required */}
          <Route path="/login" element={<Login />} />

          {/* Invite link — /join/abc12xyz */}
          <Route path="/join/:inviteCode" element={<JoinGroup />} />

          {/* Private routes — require login */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              </PrivateRoute>
            }
          />
          <Route
            path="/group/:groupId"
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <GroupDetail />
                </ErrorBoundary>
              </PrivateRoute>
            }
          />
          <Route
            path="/group/:groupId/add-expense"
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <AddExpense />
                </ErrorBoundary>
              </PrivateRoute>
            }
          />
          <Route
            path="/group/:groupId/edit-expense/:expenseId"
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <EditExpense />
                </ErrorBoundary>
              </PrivateRoute>
            }
          />

          {/* Catch-all: redirect unknown URLs to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
