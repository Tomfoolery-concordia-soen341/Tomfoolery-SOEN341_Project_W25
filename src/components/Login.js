import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { database } from "../config/firebase";
import { getDoc, setDoc, doc, collection } from "firebase/firestore";

export let isAdmin = false;

//this function takes a user object in
export async function checkAdmin(user) {

  //finds the user in the firestore
  const userRef = await doc(database, "users", user.uid);

  //snapshot of the specific user
  const specificUser = await getDoc(userRef);

  //this var allows us to pick the field in the specific user
  const field = specificUser.data();

  console.log(field.admin);

  //check if the user exists
  if (specificUser.exists()) {

    //check if the user is an admin and return result
    if (field.admin === true) {
      return true;
    } else {
      return false;
    }

    //if the user does not exist in firestore create one using the user object passed in
  } else {

    //get the location of where the user documents data are stored
    const userRefForNew = collection(database, "users");

    //create a new doc with the uid as the name and set the admin to false
    await setDoc(doc(userRefForNew, user.uid), {
      email: user.email,
      admin: false
    });

    return false;
  }
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  //revert isAdmin to false when this page shows
  isAdmin = false;

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await checkAdmin(auth.currentUser).then(result => isAdmin = result);
      navigate("/dashboard"); // Redirect to dashboard after login
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;