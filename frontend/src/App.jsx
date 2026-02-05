import { Routes, Route } from "react-router-dom";
import Dashboard  from "./pages/Dashboard";
import EvaluationList from "./pages/EvaluationList";
import EvaluationPage from "./pages/EvaluationPage";

export default function App() {
  console.log("App mounted, current location:", window.location.pathname);
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/evaluation" element={<EvaluationList />} />
      <Route path="/evaluation/:id" element={<EvaluationPage />} />
    </Routes>
  );
  
}
