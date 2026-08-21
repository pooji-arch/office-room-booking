import type { LucideIcon } from "lucide-react"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Logo } from "./Logo"

export interface SidebarNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface AppSidebarProps {
  navItems: SidebarNavItem[]
  footer: (collapsed: boolean) => React.ReactNode
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function AppSidebar({
  navItems,
  footer,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-all duration-200 lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5 lg:px-4">
          <Logo iconOnly={collapsed} />
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden shrink-0 rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:flex"
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsed && "lg:justify-center lg:px-2",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              <item.icon className="size-4.5 shrink-0" />
              <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">{footer(collapsed)}</div>
      </aside>
    </>
  )
}
