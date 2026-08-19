import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return json({ error: "Unauthorized" }, 401)

  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser()
  if (!caller) return json({ error: "Unauthorized" }, 401)

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single()
  if (callerProfile?.role !== "ADMIN") return json({ error: "Forbidden" }, 403)

  const body = await req.json()

  if (body.action === "create") {
    const password = tempPassword()
    const { data, error } = await admin.auth.admin.createUser({
      email: body.email,
      password,
      email_confirm: true,
      // Only name/employeeId/department/phone come from metadata — the
      // trigger that creates the profile row always defaults role to
      // USER regardless of what's in metadata (a client could otherwise
      // self-grant ADMIN if Supabase self-signup were ever enabled).
      // Role is set explicitly below, via this trusted service-role call,
      // only after the caller has already been verified as an admin.
      user_metadata: {
        name: body.name,
        employee_id: body.employeeId,
        department: body.department,
        phone: body.phone,
      },
    })
    if (error) return json({ error: error.message }, 400)

    if (body.role === "ADMIN") {
      await admin.from("profiles").update({ role: "ADMIN" }).eq("id", data.user!.id)
    }

    const { data: profile } = await admin.from("profiles").select("*").eq("id", data.user!.id).single()
    return json({
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        status: profile.status,
        employeeId: profile.employee_id ?? undefined,
        department: profile.department ?? undefined,
        phone: profile.phone ?? undefined,
        mustChangePassword: profile.must_change_password,
        createdAt: profile.created_at,
      },
      temporaryPassword: password,
    })
  }

  if (body.action === "resetPassword") {
    const password = tempPassword()
    const { error } = await admin.auth.admin.updateUserById(body.id, { password })
    if (error) return json({ error: error.message }, 400)
    await admin.from("profiles").update({ must_change_password: true }).eq("id", body.id)
    return json({ temporaryPassword: password })
  }

  return json({ error: "Unknown action" }, 400)
})
