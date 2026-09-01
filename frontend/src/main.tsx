import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { DirectionProvider } from "./providers/direction-provider";
import { LocaleProvider } from "./providers/locale-provider";
import { QueryProvider } from "./providers/query-provider";
import { ThemeProvider } from "./providers/theme-provider";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <LocaleProvider>
          <DirectionProvider>
            <App />
          </DirectionProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryProvider>
  </React.StrictMode>,
);
