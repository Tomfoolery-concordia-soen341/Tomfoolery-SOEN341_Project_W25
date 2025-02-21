import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Register from "./components/Register";
import LoginPage from "./components/LoginTest";
import ChatApp from "./components/Channel";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/LoginTest" element={<LoginPage />} />
        <Route path="/Channel" element={<ChatApp />} />
        <Route path="/" element={<LoginPage />} /> {/* Default route */}
      </Routes>
    </Router>
  );
};

export default App;
