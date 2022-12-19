import React from "react";
import ReactDOM from "react-dom/client";
import { Bench } from "./benches/functional-component";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Bench />
  </React.StrictMode>
);
