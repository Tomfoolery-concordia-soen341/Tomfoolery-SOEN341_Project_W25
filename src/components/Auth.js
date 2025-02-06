import React, { useState } from "react";
import { auth, db } from "../config/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true); //go login or go registering option (button)
  const [role, setRole] = useState("user"); //set roles for the user on signup
  const navigate = useNavigate();

  //handle the way you submit information
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      //if it is loging in
      if (isLogin) {
        // Login logic
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        //the information transfered to this object
        const user = userCredential.user;

        //fetch the user from the database
        //if the uid exists (user exists) then you log the user and go to the dashboard.
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          //create object
          const userData = userDoc.data();
          //f12 for console logs
          console.log("User role:", userData.role);
          //log in as the role for the dashboard, either admin or user
          navigate("/dashboard", { state: { role: userData.role } });
        } else {
          //not found, uid not found
          alert("User data not found!");
        }
      }
      //if you are signing up an account 
      else {
        // Registration logic
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        //save the user role, email, password and uid.
        //It works as a document. You have a collection of users, and documents are the various users. Inside each  doc is their info
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,  //save email
          role: role,         //save role
          uid: user.uid,      //save uid
          password: user.password, //save password
        });
        
        //on the console if you press f12 it will say  this
        console.log("User registered and role saved!");
        //when you finish registering, you go straight to the dashboard (as if you signed in)
        //it also includes your own role, which for us there will be 2 types of dashboard - user and admin
        navigate("/dashboard", { state: { role: role } });
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <h1>{isLogin ? "Login" : "Register"}</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {!isLogin && (
          <div>
            <label>Role:</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        <button type="submit">{isLogin ? "Login" : "Register"}</button>
      </form>
      <p>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Register" : "Login"}
        </button>
      </p>
    </div>
  );
};

export default Auth;