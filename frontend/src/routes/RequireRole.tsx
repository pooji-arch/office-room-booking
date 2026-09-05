import { Navigate, Outlet } from "react-router-dom"
import type { Role } from "@/types"
import { useAuth } from "@/hooks/useAuth"

export function RequireRole({ allow }: { allow: Role[] }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (!allow.includes(user.role)) {
    return <Navigate to={user.role === "ADMIN" ? "/admin/calendar" : "/"} replace />
  }

  return <Outlet />
}
