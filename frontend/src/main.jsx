import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./App";
import { ConfirmProvider } from "./contexts/ConfirmContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  </Provider>,
);
