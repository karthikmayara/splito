// ─────────────────────────────────────────────────────────────
// useClipboard.ts — Copy text to clipboard with timed feedback
//
// Usage:
//   const { copy, copied } = useClipboard()
//   <button onClick={() => copy(upiId)}>
//     {copied ? 'Copied!' : 'Copy'}
//   </button>
//
// `copied` is true for 2 seconds after copying, then resets.
// This gives the user visual confirmation without a toast library.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'

interface UseClipboardResult {
  copy: (text: string) => Promise<void>
  copied: boolean
}

export function useClipboard(resetDelay = 2000): UseClipboardResult {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      // Reset back to false after the delay
      setTimeout(() => setCopied(false), resetDelay)
    } catch (err) {
      // Clipboard API can fail if:
      // - The page doesn't have focus
      // - User hasn't granted clipboard permission
      // - Old browser (but all modern mobile browsers support it)
      console.error('Clipboard write failed:', err)
    }
  }, [resetDelay])

  return { copy, copied }
}
