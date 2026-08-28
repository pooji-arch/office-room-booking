import { supabase } from "./supabaseClient"
import type { User } from "@/types"
import type { ListUsersParams, UserInput, UsersService } from "./types"

interface ProfileRow {
  id: string
  name: string
  email: string
  role: User["role"]
  status: User["status"]
  employee_id: string | null
  department: string | null
  phone: string | null
  must_change_password: boolean
  created_at: string
}

function mapUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    employeeId: row.employee_id ?? undefined,
    department: row.department ?? undefined,
    phone: row.phone ?? undefined,
    mustChangePassword: row.must_change_password,
    createdAt: row.created_at,
  }
}

// Deployed in Supabase as "super-processor" (named that way when created
// through the dashboard UI, rather than "admin-users" as in the source tree).
async function callAdminUsersFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("super-processor", { body })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data as T
}

export const supabaseUsersService: UsersService = {
  async listUsers(params: ListUsersParams = {}) {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 8

    let query = supabase.from("profiles").select("*", { count: "exact" })
    if (params.role) query = query.eq("role", params.role)
    if (params.status) query = query.eq("status", params.status)
    if (params.search?.trim()) {
      const q = params.search.trim().replace(/[%_]/g, "")
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    }
    query = query.order("name", { ascending: true }).range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const total = count ?? 0
    return {
      data: (data as ProfileRow[] | null ?? []).map(mapUser),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    }
  },

  async getUser(id) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single()
    if (error || !data) throw new Error("User not found.")
    return mapUser(data as ProfileRow)
  },

  async createUser(input: UserInput) {
    return callAdminUsersFunction<{ user: User; temporaryPassword?: string }>({
      action: "create",
      ...input,
    })
  },

  async updateUser(id, input) {
    // Email lives on auth.users, not profiles — changing it needs the
    // service role, so it goes through the same Edge Function as
    // create/resetPassword rather than a plain client-side update.
    if (input.email !== undefined) {
      await callAdminUsersFunction<{ success: boolean }>({ action: "updateEmail", id, email: input.email })
    }

    const patch: Record<string, unknown> = {}
    if (input.name !== undefined) patch.name = input.name
    if (input.role !== undefined) patch.role = input.role
    if (input.status !== undefined) patch.status = input.status
    if (input.employeeId !== undefined) patch.employee_id = input.employeeId
    if (input.department !== undefined) patch.department = input.department
    if (input.phone !== undefined) patch.phone = input.phone

    if (Object.keys(patch).length === 0) {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single()
      if (error) throw new Error(error.message)
      return mapUser(data as ProfileRow)
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return mapUser(data as ProfileRow)
  },

  async deactivateUser(id) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ status: "INACTIVE" })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return mapUser(data as ProfileRow)
  },

  async resetPassword(id) {
    return callAdminUsersFunction<{ temporaryPassword: string }>({ action: "resetPassword", id })
  },
}
