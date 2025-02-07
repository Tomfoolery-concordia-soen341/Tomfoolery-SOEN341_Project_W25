import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import "./Style.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard"); // Redirect to dashboard after login
    } catch (error) {
      alert(error.message);
    }
  };
  const GoToRegister = () => {
    navigate("/Register");
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
              Login
            </button>
          </form>
          <h1 onClick={GoToRegister} className="GoToRegister">
            Create an account ?
            <span className="material-symbols-outlined">arrow_forward</span>
            <h1 className="RegisterHere">Register here</h1>
          </h1>
        </div>
      </div>
    </div>
  );
};

export default Login;
