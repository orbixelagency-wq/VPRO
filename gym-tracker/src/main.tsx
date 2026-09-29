import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { StoreProvider } from "./lib/store"
import { RestTimerProvider } from "./components/Timers"
import "./styles.css"

try {
  const theme = localStorage.getItem("matchday-theme")
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme
} catch {
  /* sin almacenamiento */
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StoreProvider>
      <RestTimerProvider>
        <App />
      </RestTimerProvider>
    </StoreProvider>
  </React.StrictMode>,
)

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}))
}
