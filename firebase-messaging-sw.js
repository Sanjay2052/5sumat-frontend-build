/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

const params = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: params.get("apiKey") || "AIzaSyDJ8L8kou6sKaUb9x1uKCqlZ2OeBnFabvU",
  authDomain: params.get("authDomain") || "sumat-61138.firebaseapp.com",
  projectId: params.get("projectId") || "sumat-61138",
  storageBucket: params.get("storageBucket") || "sumat-61138.firebasestorage.app",
  messagingSenderId: params.get("messagingSenderId") || "419846942487",
  appId: params.get("appId") || "1:419846942487:web:222fcd9ff2b3430eb99152",
  measurementId: params.get("measurementId") || "G-SD01RMS83C",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

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

  const screen = payload?.data?.screen || "";
  const orderId = payload?.data?.order_id || payload?.data?.orderId || "";
  const orderNumber = payload?.data?.order_number || "";
  const url = payload?.data?.url || "";

  const notificationPromise = self.registration.showNotification(title, {
    body,
    icon: self.location.origin + "/SumatLogo.png",
    badge: self.location.origin + "/SumatLogo.png",
    data: {
      url,
      screen,
      orderId,
      orderNumber,
    },
  });

  const messagePromise = self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: "FCM_BACKGROUND_MESSAGE",
        payload,
      });
    });
  });

  return Promise.all([notificationPromise, messagePromise]);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification?.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // 1. Determine role based on open tab URLs
      let role = "customer";
      let matchedClient = null;

      for (const client of clients) {
        if (client.url.includes("/vendor")) {
          role = "vendor";
          matchedClient = client;
          break;
        } else if (client.url.includes("/admin")) {
          role = "admin";
          matchedClient = client;
          break;
        } else {
          matchedClient = client;
        }
      }

      // 2. Resolve URL path based on screen metadata
      let targetUrl = data.url;
      if (!targetUrl && data.screen === "order_detail" && data.orderId) {
        if (role === "vendor") {
          targetUrl = `/vendor/orders/${data.orderId}`;
        } else if (role === "admin") {
          targetUrl = `/admin/orders/${data.orderId}`;
        } else {
          targetUrl = `/order/${data.orderId}`;
        }
      }

      if (!targetUrl) {
        targetUrl = "/";
      }

      // 3. Focus matching client or navigate / open new
      if (matchedClient) {
        return matchedClient.navigate(targetUrl).then((c) => c?.focus());
      } else {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});