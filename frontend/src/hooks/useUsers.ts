import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usersService } from "@/services/users"
import type { ListUsersParams, UserInput } from "@/services/types"

export const userKeys = {
  all: ["users"] as const,
  list: (params: ListUsersParams) => ["users", "list", params] as const,
  detail: (id: string) => ["users", "detail", id] as const,
}

export function useUsers(params: ListUsersParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersService.listUsers(params),
  })
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => usersService.getUser(id!),
    enabled: !!id,
  })
}

export function useActiveUsers() {
  return useQuery({
    queryKey: userKeys.list({ status: "ACTIVE", pageSize: 100 }),
    queryFn: () => usersService.listUsers({ status: "ACTIVE", pageSize: 100 }),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UserInput) => usersService.createUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<UserInput> }) =>
      usersService.updateUser(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersService.deactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (id: string) => usersService.resetPassword(id),
  })
}
