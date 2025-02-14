import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Register from "./components/Register";
import LoginPage from "./components/LoginTest";
function App() {
  return (
    <LoginPage/>
    // <Router>
    //   <Routes>
    //     <Route path="/" element={<Login />} />
    //     <Route path="/register" element={<Register />} />
    //     <Route path="/Login" element={<Login />} />
    //     <Route
    //       path="/dashboard"
    //       element={
    //         <ProtectedRoute>
    //           <Dashboard />
    //         </ProtectedRoute>
    //       }
    //     />
    //   </Routes>
    // </Router>
  );
}

export default App;
