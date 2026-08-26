import { useEffect, useState } from "react"

const STORAGE_KEY = "sidebar:width"
export const SIDEBAR_DEFAULT_WIDTH = 256
export const SIDEBAR_MIN_WIDTH = 200
export const SIDEBAR_MAX_WIDTH = 320

export function useSidebarWidth() {
  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return stored >= SIDEBAR_MIN_WIDTH && stored <= SIDEBAR_MAX_WIDTH ? stored : SIDEBAR_DEFAULT_WIDTH
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width))
  }, [width])

  return [width, setWidth] as const
}
