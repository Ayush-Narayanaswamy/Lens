import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "../popup/popup-app";
import "../ui/styles.css";

document.body.classList.add("sidepanel-root");

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
