import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Check, Copy, KeyRound, Loader2 } from "lucide-react"
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
} from "@/components/ui/form"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useCreateUser, useResetPassword, useUpdateUser, useUser } from "@/hooks/useUsers"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: z.enum(["USER", "ADMIN"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().min(1, "Department is required"),
  phone: z.string().min(1, "Phone number is required"),
})

type FormValues = z.infer<typeof schema>

function TemporaryPasswordCard({
  title,
  description,
  password,
  onDone,
}: {
  title: string
  description: string
  password: string
  onDone: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      toast.success("Password copied")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy — select and copy it manually")
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted px-4 py-3">
            <span className="flex-1 text-center font-mono text-lg tracking-wider">{password}</span>
            <Button type="button" variant="outline" size="icon-sm" onClick={handleCopy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <Button className="w-full" onClick={onDone}>
            Done
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function UserFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { data: user, isLoading: isLoadingUser } = useUser(id)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const resetPassword = useResetPassword()
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [resetTemporaryPassword, setResetTemporaryPassword] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

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

  async function confirmResetPassword() {
    if (!id) return
    try {
      const result = await resetPassword.mutateAsync(id)
      setResetTemporaryPassword(result.temporaryPassword)
      setShowResetConfirm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password")
    }
  }

  const isSaving = createUser.isPending || updateUser.isPending

  if (isEdit && isLoadingUser) {
    return <Loader2 className="size-6 animate-spin text-primary" />
  }

  if (temporaryPassword) {
    return (
      <TemporaryPasswordCard
        title="User created"
        description={`Share this temporary password with ${form.getValues("name")}. They'll be asked to change it on first login. It won't be shown again.`}
        password={temporaryPassword}
        onDone={() => navigate("/admin/users")}
      />
    )
  }

  if (resetTemporaryPassword) {
    return (
      <TemporaryPasswordCard
        title="Password reset"
        description={`Share this new temporary password with ${user?.name ?? "the user"}. They'll be asked to change it on next login. It won't be shown again.`}
        password={resetTemporaryPassword}
        onDone={() => setResetTemporaryPassword(null)}
      />
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
                      <FormLabel>Role *</FormLabel>
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
                      <FormLabel>Employee ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP-1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Engineering" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 987 654 3210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isEdit && (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  A temporary password will be generated automatically — you'll see it once
                  after saving, to share with the new user.
                </p>
              )}

              {isEdit && (
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Password</p>
                    <p className="text-xs text-muted-foreground">
                      Generate a new temporary password for this user.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetConfirm(true)}
                  >
                    <KeyRound className="size-4" />
                    Reset Password
                  </Button>
                </div>
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

      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Reset this user's password?"
        description={`A new temporary password will be generated for ${user?.name ?? "this user"}. Their current password stops working immediately.`}
        confirmLabel="Reset Password"
        isLoading={resetPassword.isPending}
        onConfirm={confirmResetPassword}
      />
    </div>
  )
}
