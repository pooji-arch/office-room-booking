self.addEventListener("push", (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || "MMS", {
      body: data.body || "",
      icon: "/logo.png",
      data: { link: data.link || "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const link = event.notification.data && event.notification.data.link ? event.notification.data.link : "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(link)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link)
    })
  )
})
