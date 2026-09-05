import { useEffect, useState } from "react"
import {
  getNotificationPermission,
  isPushSupported,
  isSubscribedToPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push"
import { useAuth } from "@/hooks/useAuth"

export function usePushNotifications() {
  const { user } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    getNotificationPermission()
  )
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    isSubscribedToPush().then(setIsSubscribed)
  }, [])

  async function enable() {
    if (!user) return
    setIsLoading(true)
    try {
      await subscribeToPush(user.id)
      setPermission(getNotificationPermission())
      setIsSubscribed(true)
    } finally {
      setIsLoading(false)
    }
  }

  async function disable() {
    setIsLoading(true)
    try {
      await unsubscribeFromPush()
      setIsSubscribed(false)
    } finally {
      setIsLoading(false)
    }
  }

  return { supported: isPushSupported(), permission, isSubscribed, isLoading, enable, disable }
}
