import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2, KeyRound, User as UserIcon } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useAuth } from "@/hooks/useAuth"
import { authService } from "@/services/auth"
import { initials } from "@/lib/format"
import { StatusBadge } from "@/components/shared/StatusBadge"

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof schema>

export function ProfilePage() {
  const { user, refresh } = useAuth()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  const changePassword = useMutation({
    mutationFn: (values: FormValues) => authService.changePassword(values),
    onSuccess: async () => {
      toast.success("Password updated")
      form.reset()
      await refresh()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update password")
    },
  })

  if (!user) return <Loader2 className="size-6 animate-spin text-primary" />

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="size-16">
            <AvatarFallback className="bg-accent text-lg text-accent-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-1">
              <StatusBadge status={user.role} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="size-4" /> Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Employee ID</p>
            <p className="text-sm font-medium">{user.employeeId ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-sm font-medium">{user.department ?? "—"}</p>
          </div>
          {user.phone && (
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium">{user.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" /> Reset Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => changePassword.mutate(v))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password *</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending && <Loader2 className="size-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
