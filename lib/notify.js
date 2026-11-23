/**
 * Dialog notification queue.
 *
 * The Host owns dialog creation, but Windows/browser notifications must be
 * raised by the Client page where `Notification` permission and the desktop
 * shell live. Each dialog appends an event here; the client polls the route
 * and calls `new Notification(...)` for events it has not shown yet.
 */
const notifications = []
let seq = 0

export function notifyDialog(title, message = '') {
  const clean = (value, max) => String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
  notifications.push({
    id: ++seq,
    at: Date.now(),
    title: clean(title, 80) || 'dsh-info-check',
    body: clean(message, 280) || '有一个确认卡在等待你处理。',
  })
  if (notifications.length > 50) notifications.splice(0, notifications.length - 50)
}

export function listNotifications() {
  return notifications.slice()
}
