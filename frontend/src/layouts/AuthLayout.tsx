import { Outlet } from "react-router-dom"
import { Logo } from "@/components/shared/Logo"

export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/40 px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--primary), transparent 82%), transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
