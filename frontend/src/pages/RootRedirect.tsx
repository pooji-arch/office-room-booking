import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

export function RootRedirect() {
  const { user } = useAuth()
  return <Navigate to={user?.role === "ADMIN" ? "/admin/rooms" : "/"} replace />
}
