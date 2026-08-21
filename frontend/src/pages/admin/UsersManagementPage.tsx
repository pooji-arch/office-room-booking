import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, Plus, Users as UsersIcon, UserX, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchInput } from "@/components/shared/SearchInput"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Pagination } from "@/components/shared/Pagination"
import { EmptyState } from "@/components/shared/EmptyState"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useDeactivateUser, useUsers } from "@/hooks/useUsers"
import { initials } from "@/lib/format"
import { toast } from "sonner"
import type { Role, User, UserStatus } from "@/types"

export function UsersManagementPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [role, setRole] = useState<Role | "all">("all")
  const [status, setStatus] = useState<UserStatus | "all">("all")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)
  const { data, isLoading } = useUsers({
    search: debouncedSearch,
    role: role === "all" ? undefined : role,
    status: status === "all" ? undefined : status,
    page,
  })
  const deactivateUser = useDeactivateUser()
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null)

  const hasActiveFilters = search !== "" || role !== "all" || status !== "all"

  function clearFilters() {
    setSearch("")
    setRole("all")
    setStatus("all")
    setPage(1)
  }

  async function confirmDeactivate() {
    if (!userToDeactivate) return
    try {
      await deactivateUser.mutateAsync(userToDeactivate.id)
      toast.success(`${userToDeactivate.name} deactivated`)
      setUserToDeactivate(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate user")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <Button onClick={() => navigate("/admin/users/new")}>
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Search users by name or email..."
          className="w-full max-w-xs"
        />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Role</p>
          <Select
            value={role}
            onValueChange={(v) => {
              setRole(v as Role | "all")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="USER">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Status</p>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as UserStatus | "all")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" onClick={clearFilters}>
            <X className="size-4" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card">
        {!isLoading && data?.data.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" description="Try adjusting your filters." />
        ) : (
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={user.role} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={user.status === "INACTIVE"}
                        onClick={() => setUserToDeactivate(user)}
                      >
                        <UserX className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && (
          <div className="p-4">
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!userToDeactivate}
        onOpenChange={(open) => !open && setUserToDeactivate(null)}
        title="Deactivate this user?"
        description={`"${userToDeactivate?.name}" will no longer be able to log in or book rooms. This can be reversed later.`}
        confirmLabel="Deactivate"
        destructive
        isLoading={deactivateUser.isPending}
        onConfirm={confirmDeactivate}
      />
    </div>
  )
}
