import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CraftApp } from "@/components/craft/CraftApp";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CraftApp />
  </StrictMode>,
);
