import { Bell, CalendarCheck, HelpCircle, Home, LogOut, User } from "lucide-react"
import { Outlet, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AppSidebar, type SidebarNavItem } from "@/components/shared/AppSidebar"
import { useAuth } from "@/hooks/useAuth"

const NAV_ITEMS: SidebarNavItem[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/my-bookings", label: "My Bookings", icon: CalendarCheck },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/help", label: "Help & Support", icon: HelpCircle },
]

export function UserLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    toast.success("Signed out")
    navigate("/login")
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar
        navItems={NAV_ITEMS}
        footer={
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4.5" />
            Logout
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
