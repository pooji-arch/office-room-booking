import type { LucideIcon } from "lucide-react"
import { CalendarCheck2 } from "lucide-react"
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
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

// Floating glass rail. Collapsed mode is a slim icon-only rail that
// auto-expands to full width on hover, then snaps back on mouse-leave —
// driven entirely by the .is-collapsed CSS in index.css, not React state,
// so the widen/reveal is a plain hover interaction with no re-render.
// `collapsed` only decides whether that CSS is active at all.
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
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 p-0 lg:static lg:z-auto lg:p-4 lg:pr-0",
          collapsed && "is-collapsed",
          mobileOpen ? "" : "pointer-events-none lg:pointer-events-auto"
        )}
      >
        <aside
          className={cn(
            "sidebar transition-transform duration-300 ease-in-out lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="sidebar-brand">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(180deg,var(--brand-light),var(--brand-deep))] text-white shadow-[0_2px_8px_rgba(76,29,149,0.4)]">
              <CalendarCheck2 className="size-4.5" />
            </div>
            <span className="sidebar-label text-lg font-extrabold tracking-tight text-foreground">MMS</span>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close menu"
              className="sidebar-label ml-auto text-muted-foreground lg:hidden"
            >
              ✕
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
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Pin sidebar open" : "Collapse sidebar"}
            className="hidden w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-brand lg:flex"
          >
            {collapsed ? "Pin open" : "Collapse"}
          </button>
        </aside>
      </div>
    </>
  )
}
