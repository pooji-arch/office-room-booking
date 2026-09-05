import { createClient } from "npm:@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

// Bump this string on every edit — same convention as admin-users, so a
// test call can confirm a deploy actually took.
const VERSION = "v1"

function json(body: unknown, status = 200) {
  const withVersion = body && typeof body === "object" ? { ...body, _version: VERSION } : body
  return new Response(JSON.stringify(withVersion), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok")
  }

  // Called only by the notify_push_after_insert trigger (via pg_net), never
  // by the browser — a shared secret is enough, no user JWT to verify here.
  const internalSecret = Deno.env.get("INTERNAL_PUSH_SECRET")
  if (internalSecret && req.headers.get("x-internal-secret") !== internalSecret) {
    return json({ error: "Unauthorized" }, 401)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  // Prefer an explicitly-set SB_SECRET_KEY secret over the auto-injected
  // SUPABASE_SERVICE_ROLE_KEY, which has been reported stale on this
  // project's newer sb_secret_/sb_publishable_ key format (see admin-users).
  const serviceRoleKey = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:aidevops.mhs@gmail.com"

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  const admin = createClient(supabaseUrl, serviceRoleKey)

  let notificationId: string
  try {
    const body = await req.json()
    notificationId = body.notification_id
    if (!notificationId) throw new Error("missing")
  } catch {
    return json({ error: "Invalid request body — expected { notification_id }" }, 400)
  }

  const { data: notification, error: notifError } = await admin
    .from("notifications")
    .select("recipient_id, title, message, link")
    .eq("id", notificationId)
    .single()

  if (notifError || !notification) {
    return json({ error: "Notification not found" }, 404)
  }

  const { data: subscriptions, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", notification.recipient_id)

  if (subsError) {
    return json({ error: subsError.message }, 500)
  }
  if (!subscriptions || subscriptions.length === 0) {
    return json({ sent: 0, total: 0 })
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.message,
    link: notification.link ?? "/",
  })

  let sent = 0
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    } catch (err) {
      // 404/410 means the browser dropped the subscription (uninstalled,
      // cleared site data, etc.) — stop trying it going forward.
      const statusCode = (err as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id)
      }
    }
  }

  return json({ sent, total: subscriptions.length })
})
