import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LibreReportPage from "../app/libre-report/page";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LibreReportPage />
  </StrictMode>,
);
