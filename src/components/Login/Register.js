import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../config/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Style.css";

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
      <div className="OuterContainer">
        <div className="FormContainer">
          <div>
            <h1 className="Register">Register</h1>
            <form onSubmit={Register} className="FormRegister">
              <div>
                <label htmlFor="username" className="Username">Username</label>
                <input
                    id="username"
                    className="InputUsername"
                    type="text" // Changed from "Username" to "text"
                    placeholder="Username"
                    value={RegisterUsername} // Fixed to use RegisterUsername
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    required
                />
              </div>
              <div>
                <label htmlFor="email" className="Email">Email</label>
                <input
                    id="email"
                    className="InputEmail"
                    type="email"
                    placeholder="Email"
                    value={RegisterEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                />
              </div>
              <div>
                <label htmlFor="password" className="Password">Password</label>
                <input
                    id="password"
                    className="InputPassword"
                    type="password"
                    placeholder="Password"
                    value={RegisterPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                />
              </div>
              <div>
                <label htmlFor="role" className="Role">Role</label>
                <select
                    id="role"
                    className="RoleSelect"
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
              Go back to log in
            </h1>
          </div>
        </div>
      </div>
  );
};

export default Register;