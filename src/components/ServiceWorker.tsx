"use client";

// Registers the service worker, which is what makes Android offer to install
// this as an app at all. Deliberately after load: registration competes with
// the first paint otherwise, and nothing on screen depends on it.

import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // a blocked or unsupported worker costs nothing here — the site still runs
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
