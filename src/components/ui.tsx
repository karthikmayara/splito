// ─────────────────────────────────────────────────────────────
// components/ui.tsx — Shared UI primitives
//
// Small reusable components used across multiple pages.
// Keeping them here avoids copy-pasting the same markup
// in Dashboard, GroupDetail, AddExpense, etc.
// ─────────────────────────────────────────────────────────────

import { type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

// ── Avatar ────────────────────────────────────────────────────
// Shows a user's photo, or their initials if no photo is set.
// Size: 'sm' = 28px, 'md' = 36px, 'lg' = 48px
interface AvatarProps {
  name?: string
  photoUrl?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function Avatar({ name, photoUrl, size = 'md', className = '' }: AvatarProps) {
  const initial = name?.[0]?.toUpperCase() || '?'
  const sizeClass = sizeMap[size]

  return (
    <div className={`${sizeClass} rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}>
      {photoUrl ? (
        <img src={photoUrl} alt={name || 'user'} className="w-full h-full object-cover" />
      ) : (
        <span className="text-slate-300 font-medium">{initial}</span>
      )}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────
// Small colored label — used for currencies, categories, etc.
interface BadgeProps {
  children: ReactNode
  variant?: 'green' | 'red' | 'amber' | 'slate' | 'blue'
}

const badgeVariants = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  red:   'bg-red-500/10 text-red-400 border-red-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  slate: 'bg-slate-700/50 text-slate-300 border-slate-600',
  blue:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export function Badge({ children, variant = 'slate' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${badgeVariants[variant]}`}>
      {children}
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────
// Standard dark card container used for list items
interface CardProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  animate?: boolean
}

export function Card({ children, onClick, className = '', animate = false }: CardProps) {
  const base = `bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 ${animate ? 'animate-slide-up' : ''} ${className}`

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${base} w-full text-left hover:bg-slate-800 hover:border-slate-600 transition-all duration-150`}
      >
        {children}
      </button>
    )
  }

  return <div className={base}>{children}</div>
}

// ── EmptyState ────────────────────────────────────────────────
// Shown when a list has no items
interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
      <span className="text-5xl mb-4">{icon}</span>
      <p className="text-white font-medium text-base mb-1">{title}</p>
      {description && <p className="text-slate-400 text-sm max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────
// Loading indicator — use inside buttons or as a full-page loader
interface SpinnerProps {
  size?: number
  className?: string
}

export function Spinner({ size = 16, className = 'text-green-500' }: SpinnerProps) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />
}

// ── FullPageLoader ────────────────────────────────────────────
// Shown while auth / data is loading
export function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-green-500"
              style={{
                animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
        <p className="text-slate-400 text-sm">{message}</p>
      </div>
    </div>
  )
}

// ── InputField ────────────────────────────────────────────────
// Labeled input with optional error message
interface InputFieldProps {
  label: string
  error?: string
  hint?: string
  className?: string
  // All native input props are passed through
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

export function InputField({ label, error, hint, className = '', inputProps }: InputFieldProps) {
  return (
    <div className={className}>
      <label className="text-slate-400 text-sm block mb-1.5">{label}</label>
      <input
        {...inputProps}
        className={`
          w-full bg-slate-800 border rounded-xl px-4 py-3
          text-white placeholder-slate-500
          focus:outline-none transition-colors
          ${error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700 focus:border-green-500'}
          ${inputProps?.className || ''}
        `}
      />
      {hint && !error && <p className="text-slate-500 text-xs mt-1">{hint}</p>}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────
// Standard button with variants
interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

const buttonVariants = {
  primary:   'bg-green-500 hover:bg-green-400 text-black font-medium shadow-lg shadow-green-500/20',
  secondary: 'border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white',
  danger:    'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20',
  ghost:     'text-slate-400 hover:text-white hover:bg-slate-800',
}

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-2xl',
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        transition-all duration-150 active:scale-[0.98]
        disabled:opacity-60 disabled:cursor-not-allowed
        ${buttonVariants[variant]}
        ${buttonSizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading && <Spinner size={14} className={variant === 'primary' ? 'text-black' : 'text-current'} />}
      {children}
    </button>
  )
}

// ── Divider ───────────────────────────────────────────────────
export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-slate-700/50 ${className}`} />
}

// ── Toast notification (simple inline version) ────────────────
// For confirming actions like "Expense saved", "Link copied"
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
}

const toastStyles = {
  success: 'bg-green-500/10 border-green-500/30 text-green-300',
  error:   'bg-red-500/10 border-red-500/30 text-red-300',
  info:    'bg-blue-500/10 border-blue-500/30 text-blue-300',
}

export function InlineToast({ message, type = 'success' }: ToastProps) {
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm ${toastStyles[type]}`}>
      {message}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────
// Consistent section titles used across pages
interface SectionHeaderProps {
  title: string
  action?: ReactNode
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-white font-medium">{title}</h2>
      {action}
    </div>
  )
}
