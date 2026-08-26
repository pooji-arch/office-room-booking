import { useEffect, useState } from "react"
import { Bell, HelpCircle, Home, LogOut, Menu, Presentation, User } from "lucide-react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AppSidebar, type SidebarNavSection } from "@/components/shared/AppSidebar"
import { Logo } from "@/components/shared/Logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed"
import { useSidebarWidth } from "@/hooks/useSidebarWidth"
import { useUnreadNotificationsCount } from "@/hooks/useNotifications"

export function UserLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useSidebarCollapsed()
  const [sidebarWidth, setSidebarWidth] = useSidebarWidth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: unreadCount } = useUnreadNotificationsCount()

  const NAV_SECTIONS: SidebarNavSection[] = [
    {
      items: [
        { to: "/", label: "Home", icon: Home, end: true },
        { to: "/meetings", label: "Meetings", icon: Presentation },
        { to: "/profile", label: "Profile", icon: User },
        { to: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
        { to: "/help", label: "Help & Support", icon: HelpCircle },
      ],
    },
  ]

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
        navItems={NAV_SECTIONS}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 lg:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <Logo />
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
