// This service worker handles push notifications when the AIDE app is
// completely closed. It only wakes briefly to show the notification —
// it does not run continuously, so it costs almost no battery.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Must match the config in index.html — paste the same values here.
firebase.initializeApp({
  apiKey: "AIzaSyBXnbaoCSQuIg6LPUzX6MtibAje9XTaSIo",
  authDomain: "jarvis-2809.firebaseapp.com",
  projectId: "jarvis-2809",
  storageBucket: "jarvis-2809.firebasestorage.app",
  messagingSenderId: "134063891790",
  appId: "1:134063891790:web:974a593211dfc3346eaa1f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = (payload.notification && payload.notification.title) || 'Task reminder';
  const body = (payload.notification && payload.notification.body) || '';
  self.registration.showNotification(title, {
    body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'aide-reminder'
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for(const client of clientList){
        if('focus' in client) return client.focus();
      }
      if(clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
