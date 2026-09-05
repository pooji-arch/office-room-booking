import type { LucideIcon } from "lucide-react"
import { X } from "lucide-react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"

export interface SidebarNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: number
}

export interface SidebarNavSection {
  label?: string
  items: SidebarNavItem[]
}

interface AppSidebarProps {
  navItems: SidebarNavSection[]
  footer: (collapsed: boolean) => React.ReactNode
  collapsed?: boolean
  onToggleCollapsed?: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  // When true, the sidebar is always a toggled overlay drawer — opened only
  // via the hamburger button, on every screen size — instead of the default
  // persistent floating rail on desktop (`lg:` and up). Used for the User
  // layout, which puts its whole nav behind a single hamburger the way the
  // reference design does; the admin layout leaves this unset and keeps the
  // always-visible rail.
  alwaysOverlay?: boolean
}

// Floating glass rail. Collapsed mode is a slim icon-only rail that
// auto-expands to full width on hover, then snaps back on mouse-leave —
// driven entirely by the .is-collapsed CSS in index.css, not React state,
// so the widen/reveal is a plain hover interaction with no re-render.
// `collapsed` only decides whether that CSS is active at all.
export function AppSidebar({
  navItems,
  footer,
  collapsed = false,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  alwaysOverlay = false,
}: AppSidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className={cn("fixed inset-0 z-40 bg-black/50", !alwaysOverlay && "lg:hidden")}
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 p-0",
          !alwaysOverlay && "lg:static lg:z-auto lg:p-4 lg:pr-0",
          collapsed && !alwaysOverlay && "is-collapsed",
          mobileOpen ? "" : alwaysOverlay ? "pointer-events-none" : "pointer-events-none lg:pointer-events-auto"
        )}
      >
        <aside
          className={cn(
            "sidebar transition-transform duration-300 ease-in-out",
            !alwaysOverlay && "lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="sidebar-brand">
            <img src="/logo.png" alt="MMS" className="size-8 shrink-0 object-contain" />
            <span className="sidebar-label text-base font-extrabold tracking-tight text-foreground">MMS</span>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close menu"
              className={cn(
                "ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                !alwaysOverlay && "lg:hidden"
              )}
            >
              <X className="size-4" />
            </button>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((section, sectionIndex) => (
              <div key={section.label ?? sectionIndex} className={sectionIndex > 0 ? "mt-3" : undefined}>
                {section.label && (
                  <p className="sidebar-section-label mb-1.5 px-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    {section.label}
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onCloseMobile}
                      className={({ isActive }) => cn("sidebar-nav-item", isActive && "active")}
                    >
                      <item.icon />
                      <span className="sidebar-label flex-1 truncate">{item.label}</span>
                      {!!item.badge && (
                        <span className="sidebar-badge flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,var(--brand-light),var(--brand-deep))] px-1.5 text-[11px] font-semibold text-white">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">{footer(collapsed)}</div>
          {!alwaysOverlay && onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Pin sidebar open" : "Collapse sidebar"}
              className="hidden w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-brand lg:flex"
            >
              {collapsed ? "Pin open" : "Collapse"}
            </button>
          )}
        </aside>
      </div>
    </>
  )
}
