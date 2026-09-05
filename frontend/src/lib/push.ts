import { supabase } from "@/services/supabaseClient"

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
const SW_PATH = "/push-sw.js"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported"
  return Notification.permission
}

export async function subscribeToPush(profileId: string) {
  if (!isPushSupported()) {
    throw new Error("Push notifications aren't supported in this browser.")
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.")
  }

  const registration = await navigator.serviceWorker.register(SW_PATH)
  await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    })
  }

  const raw = subscription.toJSON()
  const { error } = await supabase.from("push_subscriptions").insert({
    profile_id: profileId,
    endpoint: raw.endpoint!,
    p256dh: raw.keys!.p256dh,
    auth: raw.keys!.auth,
  })
  // Already-subscribed-on-this-browser hits the endpoint's UNIQUE
  // constraint — that's fine, not a real failure.
  if (error && error.code !== "23505") throw error
}

export async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration(SW_PATH)
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
}

export async function isSubscribedToPush() {
  if (!isPushSupported()) return false
  const registration = await navigator.serviceWorker.getRegistration(SW_PATH)
  const subscription = await registration?.pushManager.getSubscription()
  return !!subscription
}
