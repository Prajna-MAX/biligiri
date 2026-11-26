import { api } from './api';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/**
 * 'unsupported' | 'ios-needs-install' | 'denied' | 'enabled' | 'available'
 * iPhones only allow web push for sites added to the Home Screen.
 */
export async function pushStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIOS() && !isStandalone() ? 'ios-needs-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'enabled' : 'available';
}

const urlBase64ToUint8Array = (base64) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

// Must be called from a tap/click (browsers only show the permission prompt for a user action)
export async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications were not allowed.');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const { publicKey } = await api('/notifications/push/key');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  }
  await api('/notifications/push/subscribe', { method: 'POST', body: sub.toJSON() });
}

// Re-send an existing subscription after login so it's linked to whoever is signed in on this device
export async function refreshPushSubscription() {
  try {
    if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.getSubscription();
    if (sub) await api('/notifications/push/subscribe', { method: 'POST', body: sub.toJSON() });
  } catch {
    /* push is optional */
  }
}

// On logout: stop sending this user's notifications to this device
export async function unlinkPush() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await api('/notifications/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } });
  } catch {
    /* ignore */
  }
}
