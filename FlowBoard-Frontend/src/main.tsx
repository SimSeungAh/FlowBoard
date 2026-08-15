import {
  StrictMode,
} from "react";
import {
  createRoot,
} from "react-dom/client";

import App from "@/App";
import {
  initializeTheme,
} from "@/store/themeStore";

import "@/index.css";

initializeTheme();

createRoot(
  document.getElementById(
    "root",
  )!,
).render(
  <StrictMode>
    <App />
  </StrictMode>,
);