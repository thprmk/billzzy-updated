'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  speed: 500,
  minimum: 0.3,
})

export default function LoadingBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleStart = () => {
      NProgress.start()
    }

    const handleComplete = () => {
      NProgress.done()
    }

    // Start loading bar when route changes
    handleStart()

    // Complete loading bar after a short delay
    const timer = setTimeout(() => {
      handleComplete()
    }, 100)

    return () => {
      clearTimeout(timer)
      handleComplete()
    }
  }, [pathname, searchParams])

  return null
}