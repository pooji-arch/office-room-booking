import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { useCreateUser, useUpdateUser, useUser } from "@/hooks/useUsers"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: z.enum(["USER", "ADMIN"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function UserFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { data: user, isLoading: isLoadingUser } = useUser(id)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      role: "USER",
      status: "ACTIVE",
      employeeId: "",
      department: "",
      phone: "",
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        employeeId: user.employeeId ?? "",
        department: user.department ?? "",
        phone: user.phone ?? "",
      })
    }
  }, [user, form])

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && id) {
        await updateUser.mutateAsync({ id, input: values })
        toast.success("User updated")
        navigate("/admin/users")
      } else {
        const result = await createUser.mutateAsync(values)
        if (result.temporaryPassword) {
          setTemporaryPassword(result.temporaryPassword)
        } else {
          toast.success("User created")
          navigate("/admin/users")
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save user")
    }
  }

  const isSaving = createUser.isPending || updateUser.isPending

  if (isEdit && isLoadingUser) {
    return <Loader2 className="size-6 animate-spin text-primary" />
  }

  if (temporaryPassword) {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">User created</h1>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Share this temporary password with {form.getValues("name")}. They'll be asked to
              change it on first login. It won't be shown again.
            </p>
            <div className="rounded-lg border bg-muted px-4 py-3 text-center font-mono text-lg tracking-wider">
              {temporaryPassword}
            </div>
            <Button className="w-full" onClick={() => navigate("/admin/users")}>
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? "Edit User" : "Add User"}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="name@roombook.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USER">User</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
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
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP-1234" {...field} />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Engineering" {...field} />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 987 654 3210" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                  </FormItem>
                )}
              />

              {!isEdit && (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  A temporary password will be generated automatically — you'll see it once
                  after saving, to share with the new user.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/users")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
