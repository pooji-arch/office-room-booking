import { useEffect, useRef, useState } from "react"
import {
  BarChart3,
  CalendarDays,
  DoorOpen,
  LogOut,
  Menu,
  Settings,
  Users,
  Presentation,
  UserRound,
} from "lucide-react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AppSidebar, type SidebarNavSection } from "@/components/shared/AppSidebar"
import { Logo } from "@/components/shared/Logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initials } from "@/lib/format"
import { useAuth } from "@/hooks/useAuth"
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed"
import { useScrollRestoration } from "@/hooks/useScrollRestoration"

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useSidebarCollapsed()
  const [mobileOpen, setMobileOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  useScrollRestoration(mainRef)

  const NAV_SECTIONS: SidebarNavSection[] = [
    {
      items: [
        { to: "/admin/rooms", label: "Rooms", icon: DoorOpen },
        { to: "/admin/meetings", label: "Meetings", icon: Presentation },
        { to: "/admin/calendar", label: "Calendar", icon: CalendarDays },
        { to: "/admin/reports", label: "Reports", icon: BarChart3 },
        { to: "/admin/users", label: "Users", icon: Users },
        { to: "/admin/settings", label: "Settings", icon: Settings },
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
        footer={() => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent">
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                    {user ? initials(user.name) : "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="sidebar-label min-w-0">
                  <p className="truncate text-sm font-medium">{user?.name ?? "Admin"}</p>
                  <p className="truncate text-xs text-sidebar-foreground/60">
                    {user?.role === "ADMIN" ? "Administrator" : "Admin"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/admin/profile")}>
                <UserRound className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 lg:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <Logo />
        </div>
        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
