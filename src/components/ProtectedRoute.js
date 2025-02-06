import React from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../config/firebase";

const ProtectedRoute = ({ children }) => {
  if (!auth.currentUser) {
    return <Navigate to="/" />; // Redirect to login if not authenticated
  }
  return children;
};

export default ProtectedRoute;