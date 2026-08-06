self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: data.tag,
      data: { url: data.url || '/', reservationId: data.reservationId || null, depositCheck: !!data.depositCheck, checkType: data.checkType || 'deposit' }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { url = '/', reservationId, depositCheck, checkType } = event.notification.data || {}

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (depositCheck && reservationId) {
            client.postMessage({ type: 'DEPOSIT_CHECK', reservationId, checkType })
          }
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
