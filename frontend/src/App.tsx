import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { queryClient } from "@/lib/query-client"
import { AuthProvider } from "@/hooks/useAuth"
import { useMeetingsRealtime } from "@/hooks/useMeetingsRealtime"
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime"
import { router } from "@/app/router"

function RealtimeBridge() {
  useMeetingsRealtime()
  useNotificationsRealtime()
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <RealtimeBridge />
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
