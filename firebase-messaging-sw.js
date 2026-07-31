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
    data: {
      url,
      screen,
      orderId,
      orderNumber,
      ...payload?.data,
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
      // 1. Determine role based on notification data or open tab URLs
      let role = "customer"; // default fallback

      const appType = data.app_type || data.appType || data.role || data.user_type || data.userType || "";
      const lowerAppType = appType.toLowerCase();

      if (lowerAppType.includes("admin")) {
        role = "admin";
      } else if (lowerAppType.includes("vendor")) {
        role = "vendor";
      } else if (lowerAppType.includes("customer")) {
        role = "customer";
      } else {
        // Fallback: Determine role based on open tab URLs
        for (const client of clients) {
          if (client.url.includes("/vendor")) {
            role = "vendor";
            break;
          } else if (client.url.includes("/admin")) {
            role = "admin";
            break;
          }
        }
      }

      // 2. Resolve URL path based on screen metadata or default target
      let targetUrl = data.url || "";
      const returnId = data.return_request_id || data.return_id || data.returnId || "";
      const orderId = data.vendor_order_id || data.order_id || data.orderId || "";
      const screen = data.screen || "";

      if (!targetUrl) {
        if (
          screen === "vendor_return_detail" ||
          screen === "admin_return_detail" ||
          screen === "return_detail" ||
          data.type === "return_approved" ||
          data.type === "return_rejected" ||
          data.type === "return_requested"
        ) {
          if (role === "vendor") {
            targetUrl = returnId ? `/vendor/returns/${returnId}` : `/vendor/returns`;
          } else if (role === "admin") {
            targetUrl = returnId ? `/admin/returns/${returnId}` : `/admin/returns`;
          }
        } else if ((screen === "order_detail" || screen === "vendor_order_detail" || screen === "admin_order_detail") && orderId) {
          if (role === "vendor") {
            targetUrl = `/vendor/orders/${orderId}`;
          } else if (role === "admin") {
            targetUrl = `/admin/orders/${orderId}`;
          } else {
            targetUrl = `/order/${orderId}`;
          }
        }
      }

      // 3. Construct absolute URL depending on the role
      let baseUrl = "https://5sumat.com";

      if (!targetUrl) {
        if (role === "vendor") {
          targetUrl = `${baseUrl}/vendor/dashboard`;
        } else if (role === "admin") {
          targetUrl = `${baseUrl}/admin/dashboard`;
        } else {
          targetUrl = `${baseUrl}`;
        }
      } else {
        // Resolve relative URLs using baseUrl
        if (targetUrl.startsWith("/")) {
          targetUrl = `${baseUrl}${targetUrl}`;
        } else if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
          targetUrl = `${baseUrl}/${targetUrl}`;
        }
      }

      // 4. Focus matching client of the same role or navigate / open new
      let matchedClient = null;
      for (const client of clients) {
        if (role === "admin" && client.url.includes("/admin")) {
          matchedClient = client;
          break;
        } else if (role === "vendor" && client.url.includes("/vendor")) {
          matchedClient = client;
          break;
        } else if (role === "customer" && !client.url.includes("/vendor") && !client.url.includes("/admin")) {
          matchedClient = client;
          break;
        }
      }

      if (matchedClient) {
        return matchedClient.navigate(targetUrl).then((c) => c?.focus());
      } else {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});