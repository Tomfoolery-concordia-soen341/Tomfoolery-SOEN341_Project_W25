import React, { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom"; //import functions



const Dashboard = () => {
  const [user] = useAuthState(auth);
  const [role, setRole] = useState("");
  const navigate = useNavigate(); //initialize function from import

  const logout = async () => {
    try {
      await signOut(auth);
      //go to login page. it's just / because it's on http://localhost:3000/ and not http://localhost:3000/login
      //change this if you are going to make a login page later.
      navigate("/"); 
    } catch (err) {
      //error catching
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRole(userData.role);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  return (
    <div>
      <h1>Dashboard</h1>
      {user ? (
        <>
          <p>Logged in as: {user.email}</p>
          <p>Your role: {role}</p>
          {role === "admin" && <p>Admin features are enabled.</p>}
          {role === "user" && <p>User features are enabled.</p>}
        </>
      ) : (
        <p>Not logged in</p>
      )}
      <button onClick={logout}>Log Out</button>
    </div>
  );
};

export default Dashboard;