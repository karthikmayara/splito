import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGlobalData } from '@/hooks/useGlobalData'
import { useStore } from '@/store/useStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { InstallPrompt } from '@/components/InstallPrompt'
import Login from '@/pages/Login'
import Layout from '@/components/Layout'
import JoinGroup from '@/pages/JoinGroup'
import GroupDetail from '@/pages/GroupDetail'
import AddExpense from '@/pages/AddExpense'
import EditExpense from '@/pages/EditExpense'
import Landing from '@/pages/Landing'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, authLoading } = useStore()

  if (authLoading) {
    return <GlobalLoader />
  }

  if (!currentUser) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Global Loader isolated to prevent flash of Unauthenticated states
function GlobalLoader() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-green-500"
              style={{ animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
        <p className="text-slate-400 text-sm">Loading Splito...</p>
      </div>
    </div>
  )
}

// Landing Route Wrapper handles redirection if the user is already logged in securely
function LandingRoute() {
  const { currentUser, authLoading } = useStore()

  if (authLoading) {
    return <GlobalLoader />
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />
  }

  return <Landing />
}

export default function App() {
  useAuth()
  useGlobalData()

  return (
    <ErrorBoundary>
      <InstallPrompt />
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/join/:inviteCode" element={<JoinGroup />} />

          {/* Authenticated Dashboard Routes */}
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<div />} /> {/* Rendered inside Layout.tsx via !isHome logic */}
            <Route path="/group/:groupId" element={<GroupDetail />} />
            <Route path="/group/:groupId/add-expense" element={<AddExpense />} />
            <Route path="/group/:groupId/edit-expense/:expenseId" element={<EditExpense />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}

