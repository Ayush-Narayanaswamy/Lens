import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "./popup-app";
import "../ui/styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
