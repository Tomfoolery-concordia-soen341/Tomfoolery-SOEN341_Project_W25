import React from "react";
import { Navigate } from "react-router-dom";
import { auth,db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";

const ProtectedRoute = ({ children, requiredRole }) => {
  const user = auth.currentUser;

  if (!user) {
    return <Navigate to="/" />; // Redirect to login if not authenticated
  }

  // Fetch user role from Firestore (you can optimize this)
  const fetchUserRole = async () => {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.role;
    }
    return null;
  };

  const userRole = fetchUserRole();

  if (userRole !== requiredRole) {
    return <Navigate to="/" />; // Redirect if role doesn't match
  }

  return children;
};

export default ProtectedRoute;