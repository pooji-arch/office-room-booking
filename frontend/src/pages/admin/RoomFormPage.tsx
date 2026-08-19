import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { RoomImagePlaceholder } from "@/components/shared/RoomImagePlaceholder"
import { useCreateRoom, useRoom, useRoomLocations, useUpdateRoom } from "@/hooks/useRooms"
import { uploadRoomImage } from "@/services/rooms.supabase"

const schema = z.object({
  name: z.string().min(1, "Room name is required"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "UNAVAILABLE"]),
})

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

type FormValues = z.infer<typeof schema>

export function RoomFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { data: room, isLoading: isLoadingRoom } = useRoom(id)
  const { data: locations } = useRoomLocations()
  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom()

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      capacity: 4,
      location: "",
      description: "",
      status: "AVAILABLE",
    },
  })
  const name = form.watch("name")

  useEffect(() => {
    if (room) {
      form.reset({
        name: room.name,
        capacity: room.capacity,
        location: room.location,
        description: room.description ?? "",
        status: room.status,
      })
      setImagePreviewUrl(room.imageUrl ?? null)
    }
  }, [room, form])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be 5MB or smaller")
      e.target.value = ""
      return
    }
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setImageRemoved(false)
    e.target.value = ""
  }

  function handleRemoveImage() {
    setImageFile(null)
    setImagePreviewUrl(null)
    setImageRemoved(true)
  }

  async function onSubmit(values: FormValues) {
    try {
      let imagePath: string | null | undefined
      if (imageFile) {
        setIsUploadingImage(true)
        imagePath = await uploadRoomImage(imageFile)
        setIsUploadingImage(false)
      } else if (imageRemoved) {
        imagePath = null
      }
      const input = { ...values, ...(imagePath !== undefined && { imagePath }) }

      if (isEdit && id) {
        await updateRoom.mutateAsync({ id, input })
        toast.success("Room updated")
      } else {
        await createRoom.mutateAsync(input)
        toast.success("Room created")
      }
      navigate("/admin/rooms")
    } catch (err) {
      setIsUploadingImage(false)
      toast.error(err instanceof Error ? err.message : "Failed to save room")
    }
  }

  const isSaving = createRoom.isPending || updateRoom.isPending || isUploadingImage

  if (isEdit && isLoadingRoom) {
    return <Loader2 className="size-6 animate-spin text-primary" />
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/admin/rooms")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? "Edit Room" : "Add New Room"}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Room details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Conference Room A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity *</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} placeholder="Enter capacity" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <>
                        <Input
                          list="room-locations"
                          placeholder="Select or type a location"
                          {...field}
                        />
                        <datalist id="room-locations">
                          {locations?.map((loc) => (
                            <option key={loc} value={loc} />
                          ))}
                        </datalist>
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter room description"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Room Image</FormLabel>
                <FormDescription>Click to upload an image (PNG or JPG, up to 5MB).</FormDescription>
                <div className="flex items-center gap-3 pt-1">
                  <label className="cursor-pointer">
                    {imagePreviewUrl ? (
                      <img
                        src={imagePreviewUrl}
                        alt="Room preview"
                        className="size-16 rounded-lg object-cover ring-1 ring-border"
                      />
                    ) : (
                      <RoomImagePlaceholder seed={id ?? name ?? "new-room"} className="size-16 rounded-lg" />
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="sr-only"
                      onChange={handleImageChange}
                    />
                  </label>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Upload className="size-4" />
                    Click the image to upload
                  </div>
                  {imagePreviewUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage}>
                      Remove
                    </Button>
                  )}
                </div>
              </FormItem>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/rooms")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Update Room" : "Save Room"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
