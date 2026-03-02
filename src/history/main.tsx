import React from "react";
import { createRoot } from "react-dom/client";
import { HistoryApp } from "./history-app";
import "../ui/styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HistoryApp />
  </React.StrictMode>
);
