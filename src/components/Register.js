import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Login/Style.css";

const Register = () => {
  const [RegisterEmail, setRegisterEmail] = useState("");
  const [RegisterPassword, setRegisterPassword] = useState("");
  const [role, setRole] = useState("");
  const navigate = useNavigate();

  const Register = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        RegisterEmail,
        RegisterPassword
        // role
      );
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        email: RegisterEmail,
        role: role,
        lastSeen: serverTimestamp(),
        status: "active",
      });
      navigate("/"); // Redirect to dashboard after login
    } catch (error) {
      alert(error.message);
    }
  };
  const Back = () => {
    navigate("/");
  };

  return (
    <div className="OuterContainer">
      <div className="FormContainer">
        <div>
          <h1 className="Register">Register</h1>
          <form onSubmit={Register} className="FormRegister">
            <div>
              <label className="Email">Email</label>
              <input
                className="InputEmail"
                type="email"
                placeholder="Email"
                value={RegisterEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="Password">Password</label>
              <input
                className="InputPassword"
                type="password"
                placeholder="Password"
                value={RegisterPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="Role">Role</label>
              <select
                className="RoleSelect"
                // w-full p-2 border border-gray-300 rounded-lg
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="">Select a role</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
            <button type="submit" className="RegisterButton">
              Register
            </button>
          </form>
          <h1 onClick={Back} className="GoToLogin">
            Go back to log in{" "}
          </h1>
        </div>
      </div>
    </div>
  );
};
export default Register;
