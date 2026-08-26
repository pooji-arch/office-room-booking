import type { LucideIcon } from "lucide-react"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { useEffect, useState } from "react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { SIDEBAR_DEFAULT_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "@/hooks/useSidebarWidth"
import { Logo } from "./Logo"

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
  width: number
  onWidthChange: (width: number) => void
}

export function AppSidebar({
  navItems,
  footer,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  width,
  onWidthChange,
}: AppSidebarProps) {
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    if (!isResizing) return

    function handlePointerMove(e: PointerEvent) {
      const next = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, e.clientX))
      onWidthChange(next)
    }
    function handlePointerUp() {
      setIsResizing(false)
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
    const prevCursor = document.body.style.cursor
    const prevUserSelect = document.body.style.userSelect
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
      document.body.style.cursor = prevCursor
      document.body.style.userSelect = prevUserSelect
    }
  }, [isResizing, onWidthChange])

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
        style={{ "--sidebar-width": `${width}px` } as React.CSSProperties}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col overflow-hidden rounded-r-3xl bg-sidebar text-sidebar-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),12px_0_32px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/5 lg:static lg:z-auto lg:translate-x-0",
          !isResizing && "transition-all duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-16" : "lg:w-[var(--sidebar-width)]"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5 lg:px-4">
          <Logo iconOnly={collapsed} />
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="group hidden shrink-0 rounded-md p-1.5 text-sidebar-foreground/60 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:flex"
          >
            {collapsed ? (
              <ChevronsRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            ) : (
              <ChevronsLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            )}
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {navItems.map((section, sectionIndex) => (
            <div key={section.label ?? sectionIndex} className={sectionIndex > 0 ? "mt-5" : undefined}>
              {section.label && (
                <p
                  className={cn(
                    "mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35",
                    collapsed && "lg:hidden"
                  )}
                >
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        collapsed && "lg:justify-center lg:px-2",
                        isActive
                          ? "bg-sidebar-primary/15 text-white before:absolute before:-left-3 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )
                    }
                  >
                    <item.icon className="size-4.5 shrink-0" />
                    <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
                    {!!item.badge && (
                      <span
                        className={cn(
                          "ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-[11px] font-semibold text-sidebar-primary-foreground",
                          collapsed && "lg:absolute lg:top-1 lg:right-1 lg:ml-0 lg:h-4 lg:min-w-4 lg:px-0 lg:text-[9px]"
                        )}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">{footer(collapsed)}</div>

        {!collapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            onPointerDown={(e) => {
              e.preventDefault()
              setIsResizing(true)
            }}
            onDoubleClick={() => onWidthChange(SIDEBAR_DEFAULT_WIDTH)}
            className="group absolute inset-y-0 right-0 z-10 hidden w-2.5 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center lg:flex"
          >
            <div
              className={cn(
                "h-10 w-1 rounded-full bg-sidebar-border transition-colors group-hover:bg-primary/60",
                isResizing && "bg-primary"
              )}
            />
          </div>
        )}
      </aside>
    </>
  )
}
