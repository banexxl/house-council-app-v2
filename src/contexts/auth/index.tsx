'use client'

import {
     createContext,
     useContext,
     useEffect,
     useState,
     useCallback,
     useMemo,
     type ReactNode,
} from 'react'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type AuthContextValue = {
     status: AuthStatus
     viewer: any | null
     refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Hook — this is what you import everywhere
 */
export function useAuth() {
     const ctx = useContext(AuthContext)
     if (!ctx) {
          throw new Error('useAuth must be used inside <AuthProvider>')
     }
     return ctx
}

async function fetchViewer() {
     const res = await fetch('/api/viewer', { cache: 'no-store' })
     if (!res.ok) return null
     return res.json()
}

/**
 * Provider — this wraps the app
 */
export function AuthProvider({ children }: { children: ReactNode }) {
     const [status, setStatus] = useState<AuthStatus>('loading')
     const [viewer, setViewer] = useState<any | null>(null)
     const refresh = useCallback(async () => {
          try {
               const data = await fetchViewer()
               if (data?.userData) {
                    setViewer(data)
                    setStatus('authenticated')
               } else {
                    setViewer(null)
                    setStatus('unauthenticated')
               }
          } catch {
               setViewer(null)
               setStatus('unauthenticated')
          }
     }, [])

     useEffect(() => {
          refresh()
     }, [refresh])

     const value = useMemo(
          () => ({ status, viewer, refresh }),
          [status, viewer, refresh]
     )

     return (
          <AuthContext.Provider value={value} >
               {children}
          </AuthContext.Provider>
     )
}
