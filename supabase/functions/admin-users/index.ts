import { createClient } from "npm:@supabase/supabase-js@2"
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5"

// Bump this string on every edit. If a test response doesn't show this exact
// value, the deploy didn't take — that's the whole point of it existing.
const VERSION = "v9-fix-employee-id-dupe-check"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// This project uses Supabase's newer asymmetric (ES256) JWT signing keys.
// Their whole point is that tokens verify locally against the public JWKS —
// no round trip, and critically, no dependency on the server-side session
// lookup that /auth/v1/user and supabase-js's getUser() both do, which was
// failing with "session_not_found" for this project even on brand-new
// tokens. Verifying the signature locally sidesteps that entirely.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks(supabaseUrl: string) {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  return jwks
}

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

function json(body: unknown, status = 200) {
  const withVersion =
    body && typeof body === "object" ? { ...body, _version: VERSION } : body
  return new Response(JSON.stringify(withVersion), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  // Prefer an explicitly-set SB_SECRET_KEY secret (see deploy notes) over the
  // auto-injected SUPABASE_SERVICE_ROLE_KEY, which has been reported stale
  // on projects using the newer sb_secret_/sb_publishable_ key format.
  const serviceRoleKey = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return json({ error: "Unauthorized" }, 401)
  const jwt = authHeader.replace(/^Bearer\s+/i, "")

  const admin = createClient(supabaseUrl, serviceRoleKey)

  let callerId: string
  try {
    const { payload } = await jwtVerify(jwt, getJwks(supabaseUrl), {
      issuer: `${supabaseUrl}/auth/v1`,
    })
    callerId = payload.sub!
  } catch (err) {
    return json({ error: "Unauthorized", debug: err instanceof Error ? err.message : String(err) }, 401)
  }
  const caller = { id: callerId }

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single()
  if (callerProfile?.role !== "ADMIN") return json({ error: "Forbidden" }, 403)

  const body = await req.json()

  if (body.action === "create") {
    // Checked here, before ever calling createUser, rather than relying on
    // the profiles-table triggers (migration 0016) to reject it: a trigger
    // exception raised while GoTrue is inserting the new auth.users row (and
    // its profile) comes back from createUser() as one of its own generic
    // messages ("Database error creating new user") regardless of which rule
    // actually failed — confirmed live, not assumed. Checking explicitly
    // here gives a real, specific reason instead. The triggers stay in place
    // as the authoritative backstop for every other way a profile row can be
    // written (e.g. a plain profile update, which isn't affected by this
    // GoTrue-wrapping behavior at all).
    if (body.employeeId) {
      // .limit(1) + array-length check, not .maybeSingle() — this project's
      // live data already has real pre-existing employee_id duplicates
      // (grandfathered in by migration 0016, which only enforces uniqueness
      // going forward), and .maybeSingle() errors out on more than one match
      // instead of just returning it, which silently skipped this whole
      // check for exactly the IDs that most needed it caught live.
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("employee_id", body.employeeId)
        .limit(1)
      if (existing && existing.length > 0) {
        return json({ error: "This employee ID is already in use by another user." }, 400)
      }
    }
    if (body.phone) {
      const isValidPhone = (body.phone as string).startsWith("+91")
        ? /^\+91\d{10}$/.test(body.phone)
        : /^\+\d+$/.test(body.phone)
      if (!isValidPhone) {
        return json(
          {
            error: (body.phone as string).startsWith("+91")
              ? "A +91 phone number must have exactly 10 digits after it."
              : "Phone number must start with + followed only by digits (no spaces or symbols).",
          },
          400
        )
      }
    }

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

  // Email lives on auth.users, not profiles — a plain client-side
  // `.update()` on the profiles table (which is all UsersManagementPage's
  // regular edit flow can do under RLS) only ever touched the profiles copy,
  // silently leaving the real sign-in email untouched. Needs the service
  // role, same as create/resetPassword.
  if (body.action === "updateEmail") {
    const { error } = await admin.auth.admin.updateUserById(body.id, {
      email: body.email,
      email_confirm: true,
    })
    if (error) return json({ error: error.message }, 400)
    const { error: profileError } = await admin
      .from("profiles")
      .update({ email: body.email })
      .eq("id", body.id)
    if (profileError) return json({ error: profileError.message }, 400)
    return json({ success: true })
  }

  return json({ error: "Unknown action" }, 400)
})
