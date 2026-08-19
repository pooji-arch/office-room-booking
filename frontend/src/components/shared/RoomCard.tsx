import { MapPin, Users } from "lucide-react"
import type { Room } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RoomImagePlaceholder } from "./RoomImagePlaceholder"

interface RoomCardProps {
  room: Room
  onViewDetails: () => void
}

export function RoomCard({ room, onViewDetails }: RoomCardProps) {
  return (
    <Card className="overflow-hidden py-0">
      {room.imageUrl ? (
        <img
          src={room.imageUrl}
          alt={room.name}
          className="h-36 w-full object-cover"
        />
      ) : (
        <RoomImagePlaceholder seed={room.id} className="h-36 w-full" />
      )}
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
