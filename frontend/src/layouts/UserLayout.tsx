import { useEffect, useState } from "react"
import { Bell, CalendarCheck, HelpCircle, Home, LogOut, Menu, User } from "lucide-react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AppSidebar, type SidebarNavItem } from "@/components/shared/AppSidebar"
import { Logo } from "@/components/shared/Logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed"

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
  const location = useLocation()
  const [collapsed, setCollapsed] = useSidebarCollapsed()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    await logout()
    toast.success("Signed out")
    navigate("/login")
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar
        navItems={NAV_ITEMS}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        footer={(footerCollapsed) => (
          <button
            onClick={handleLogout}
            title={footerCollapsed ? "Logout" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              footerCollapsed && "lg:justify-center lg:px-2"
            )}
          >
            <LogOut className="size-4.5 shrink-0" />
            <span className={cn(footerCollapsed && "lg:hidden")}>Logout</span>
          </button>
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 lg:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <Logo />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
