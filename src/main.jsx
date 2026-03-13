import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import "./estilos/flux.css";
import PWAInstallPrompt from "./components/PWAInstallPrompt.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <PWAInstallPrompt />
    </BrowserRouter>
  </StrictMode>,
)
