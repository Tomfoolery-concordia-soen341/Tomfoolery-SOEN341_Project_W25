import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../config/firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, "users", result.user.uid);
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(),
        status: "active",
      });

      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role) {
          navigate("/Dashboard");
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


  return (
    <div
      style={{
        backgroundColor: "#f5faff",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
        {/* Fancy CHAT HAVEN heading */}
        <div style={{
            marginBottom: "2rem",
            marginRight: "10rem",
            textAlign: "center",
        }}>
            <h1 style={{
                fontSize: "3.5rem",
                fontWeight: "bold",
                background: "linear-gradient(45deg, #3273dc, #00d1b2, #ff3860, #ffdd57)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                animation: "gradient 8s ease infinite",
                backgroundSize: "300% 300%",
                margin: 0,
                lineHeight: 1.2,
                textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                letterSpacing: "1px"
            }}>
                CHAT HAVEN
            </h1>
            <p style={{
                color: "#4a4a4a",
                fontStyle: "italic",
                marginTop: "0.5rem"
            }}>
                A Seamless Communication Application by Tomfoolery
            </p>
        </div>
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          width: "400px",
        }}
      >
        <h1
          style={{
            color: "#3273dc",
            fontSize: "2rem",
            marginBottom: "1.5rem",
            textAlign: "center",
          }}
        >
          Login
        </h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "#3273dc", display: "block", marginBottom: "0.5rem" }}>
              Email
            </label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #3273dc",
                borderRadius: "4px",
              }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "#3273dc", display: "block", marginBottom: "0.5rem" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #3273dc",
                borderRadius: "4px",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#3273dc",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </form>
        <h1
          onClick={GoToRegister}
          style={{
            color: "#3273dc",
            textAlign: "center",
            marginTop: "1rem",
            cursor: "pointer",
          }}
        >
          Create an account?{" "}
          <span style={{ fontWeight: "bold", textDecoration: "underline" }}>
            Register here
          </span>
        </h1>
      </div>
  
    </div>
);};

export default Login;