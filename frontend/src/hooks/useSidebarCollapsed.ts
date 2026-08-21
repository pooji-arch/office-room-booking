import { useEffect, useState } from "react"

const STORAGE_KEY = "sidebar:collapsed"

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === "true")

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  return [collapsed, setCollapsed] as const
}
