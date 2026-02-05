import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

localStorage.setItem("token", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXIxMjMiLCJ1c2VybmFtZSI6InVzZXIxMjMiLCJyb2xlIjoiZXhwZXJ0IiwiaWF0IjoxNzcwMTA5NjA0LCJleHAiOjE3NzAxMzEyMDR9.j6gc2qEyljeyiYqIz-T_adypa1xFccogEsa-aoP8cFc");

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
