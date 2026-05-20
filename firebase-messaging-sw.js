/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

const params = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "New Notification";

  const body =
    payload?.notification?.body ||
    payload?.data?.body ||
    payload?.data?.message ||
    "";

  const baseId = payload?.messageId || payload?.data?.id || "fcm";
  const notificationId = `${baseId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  self.registration.showNotification(title, {
    body,
    icon: "/favicon.ico",
    tag: notificationId,
    renotify: true,
    data: {
      url: payload?.data?.url || "/",
    },
  });

  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: "FCM_BACKGROUND_MESSAGE",
        payload,
      });
    });
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url)) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});