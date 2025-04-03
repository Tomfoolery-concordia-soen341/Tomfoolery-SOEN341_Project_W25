import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../config/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [RegisterEmail, setRegisterEmail] = useState("");
  const [RegisterPassword, setRegisterPassword] = useState("");
  const [RegisterUsername, setRegisterUsername] = useState("");
  const [role, setRole] = useState("");
  const navigate = useNavigate();

  const Register = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        RegisterEmail,
        RegisterPassword
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        username: RegisterUsername,
        email: RegisterEmail,
        role: role,
        lastSeen: serverTimestamp(),
        status: "active",
        friends: [],
        friendRequests: [],
      });

      navigate("/");
    } catch (error) {
      alert(error.message);
    }
  };

  const Back = () => {
    navigate("/");
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
          Register
        </h1>
        <form onSubmit={Register}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "#3273dc", display: "block", marginBottom: "0.5rem" }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Username"
              value={RegisterUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
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
              Email
            </label>
            <input
              type="email"
              placeholder="Email"
              value={RegisterEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
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
              value={RegisterPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
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
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #3273dc",
                borderRadius: "4px",
              }}
            >
              <option value="">Select a role</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
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
            Register
          </button>
        </form>
        <h1
          onClick={Back}
          style={{
            color: "#3273dc",
            textAlign: "center",
            marginTop: "1rem",
            cursor: "pointer",
          }}
        >
          Go back to log in
        </h1>
      </div>
    </div>
  );
};

export default Register;
