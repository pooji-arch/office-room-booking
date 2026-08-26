import { MapPin, Users } from "lucide-react"
import type { Room } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RoomImagePlaceholder } from "./RoomImagePlaceholder"
import { StatusBadge } from "./StatusBadge"

interface RoomCardProps {
  room: Room
  onViewDetails: () => void
}

export function RoomCard({ room, onViewDetails }: RoomCardProps) {
  return (
    <Card className="group overflow-hidden py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <div className="relative overflow-hidden">
        {room.imageUrl ? (
          <img
            src={room.imageUrl}
            alt={room.name}
            className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <RoomImagePlaceholder
            seed={room.id}
            className="h-36 w-full transition-transform duration-500 group-hover:scale-110"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {room.status === "MAINTENANCE" && (
          <StatusBadge status="MAINTENANCE" className="absolute right-2 top-2 bg-card shadow-sm" />
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="font-semibold">{room.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {room.location}
          </p>
        </div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="size-3.5" />
          Capacity {room.capacity}
        </p>
        <Button className="w-full" onClick={onViewDetails}>
          View Details
        </Button>
      </div>
    </Card>
  )
}
