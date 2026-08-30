import { useEffect, type RefObject } from "react"
import { useLocation, useNavigationType } from "react-router-dom"

// This app's own scroll container is <main overflow-y-auto>, not the window
// — react-router's own <ScrollRestoration> only ever handles window scroll,
// so it does nothing here. Keyed by location.key (one entry per history
// entry, not per path) so going back to a specific prior visit restores
// that visit's own position, matching what <ScrollRestoration> does for
// window scroll. A plain module-level Map (not a ref) survives even if the
// layout component itself were ever remounted.
const scrollPositions = new Map<string, number>()

export function useScrollRestoration(containerRef: RefObject<HTMLElement | null>) {
  const location = useLocation()
  const navigationType = useNavigationType()

  // Recording on a live scroll listener, not in this effect's own cleanup —
  // confirmed live that reading container.scrollTop in the cleanup is too
  // late: by the time a navigation's cleanup runs, the DOM has already
  // swapped to the new (often shorter) page's content, and the browser has
  // already clamped scrollTop to fit it — usually to 0 — before the
  // cleanup ever reads it. A running tally, kept current on every scroll,
  // means the map already holds the right value by the time you leave.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const key = location.key
    const onScroll = () => scrollPositions.set(key, container.scrollTop)
    container.addEventListener("scroll", onScroll, { passive: true })
    return () => container.removeEventListener("scroll", onScroll)
  }, [location.key, containerRef])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (navigationType !== "POP") {
      container.scrollTop = 0
      return
    }

    // A single synchronous scrollTop assignment right here can get silently
    // clamped back to 0 — the list this page is restoring into (e.g.
    // Meetings, fetched via react-query) may not have finished loading and
    // painting its real rows yet on this very first effect run, so the
    // container is still shorter than the target position. Retry for a
    // short window to catch up once the real content — and therefore the
    // real scrollHeight — is in.
    //
    // setTimeout, not requestAnimationFrame: confirmed live that rAF
    // callbacks never fire at all in a backgrounded/non-visible tab (a
    // standard browser power-saving behavior), which would make this
    // silently never restore for exactly that case. setTimeout keeps
    // running (browsers only throttle its rate, never suspend it outright)
    // regardless of tab visibility.
    const target = scrollPositions.get(location.key) ?? 0
    let attempts = 0
    let timeoutId: ReturnType<typeof setTimeout>
    const tryRestore = () => {
      container.scrollTop = target
      attempts += 1
      if (container.scrollTop < target && attempts < 20) {
        timeoutId = setTimeout(tryRestore, 50)
      }
    }
    tryRestore()

    return () => clearTimeout(timeoutId)
  }, [location.key, navigationType, containerRef])
}
