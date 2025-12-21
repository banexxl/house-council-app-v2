'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from 'src/contexts/auth'

export default function AuthPageGuard({ children }: { children: React.ReactNode }) {
     const { status, refresh } = useAuth()
     const router = useRouter()

     // Re-check auth on mount and on back/restore cases
     useEffect(() => {
          refresh()

          const onPageShow = () => refresh()
          const onFocus = () => refresh()

          window.addEventListener('pageshow', onPageShow)
          window.addEventListener('focus', onFocus)

          const onVis = () => {
               if (document.visibilityState === 'visible') refresh()
          }
          document.addEventListener('visibilitychange', onVis)

          return () => {
               window.removeEventListener('pageshow', onPageShow)
               window.removeEventListener('focus', onFocus)
               document.removeEventListener('visibilitychange', onVis)
          }
     }, [refresh])

     // If already logged in, never allow auth pages
     useEffect(() => {
          if (status === 'authenticated') {
               router.replace('/dashboard')
               router.refresh()
          }
     }, [status, router])

     // Block rendering so login UI doesn't flash
     if (status === 'loading') return null
     if (status === 'authenticated') return null

     return children
}
