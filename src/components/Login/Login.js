import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../config/firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

import "./Style.css";

//import Cookies from "universal-cookie";
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  // const cookies = new Cookies();
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Sign in with Firebase Authentication
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Update lastSeen timestamp in Firestore
      const userRef = doc(db, "users", result.user.uid);
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(), // Set lastSeen to current server time
        status: "active", // Set status to online
      });

      // Fetch user role from Firestore
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role) {
          navigate("/Dashboard"); // Redirect to admin dashboard
        } else {
          alert("Unauthorized role.");
        }
      } else {
        alert("User data not found.");
      }
    } catch (error) {
      alert(error.message);
    }
  };
  const GoToRegister = () => {
    navigate("/register");
  };
  const GoToOffLineFriendList = () => {
    navigate("/OffLineFriendList");
  };
  return (
    <div className="OuterContainer">
      <div className="FormContainer">
        <div>
          <h1 className="Login">Login</h1>
          <form onSubmit={handleLogin} className="FormSubmit">
            <div>
              <label className="Email">Email</label>
              <input
                className="InputEmail"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="Password">Password</label>
              <input
                className="InputPassword"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="LoginButton">
              Sign In
            </button>
          </form>
          <h1 onClick={GoToRegister} className="GoToRegister">
            Create an account ?
            <span className="material-symbols-outlined">arrow_forward</span>
            <h1 className="RegisterHere">Register here</h1>
          </h1>
          <h1 onClick={GoToOffLineFriendList} className="GoToRegister">
            Send Messages Offline ?
            <span className="material-symbols-outlined">arrow_forward</span>
            <h1 className="RegisterHere">Click here</h1>
          </h1>
        </div>
      </div>
    </div>
  );
};

export default Login;
