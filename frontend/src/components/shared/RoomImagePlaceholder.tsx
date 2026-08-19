import { DoorOpen } from "lucide-react"
import { cn } from "@/lib/utils"

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
]

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

interface RoomImagePlaceholderProps {
  seed: string
  className?: string
}

export function RoomImagePlaceholder({ seed, className }: RoomImagePlaceholderProps) {
  const gradient = GRADIENTS[hashSeed(seed) % GRADIENTS.length]
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br",
        gradient,
        className
      )}
    >
      <DoorOpen className="size-8 text-white/85" strokeWidth={1.5} />
    </div>
  )
}
