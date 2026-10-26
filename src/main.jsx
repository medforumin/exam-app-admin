import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // TailwindCSS included

// Mount point for WordPress or normal browser use
const rootElement = document.getElementById("exam-app-admin-root") 
                 || document.getElementById("root"); // fallback for local dev

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
