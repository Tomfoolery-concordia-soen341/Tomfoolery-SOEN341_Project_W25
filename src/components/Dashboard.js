import React from "react";
import { auth } from "../config/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom"; //import functions
import { isAdmin } from "./Login";

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

const Dashboard = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate(); //initialize function from import

  const logout = async () => {
    try {
      await signOut(auth);
      // Redirect to the login page. Currently it's just / because it's on http://localhost:3000/ and not http://localhost:3000/login
      //change this whenever you are going to make a login page later.
      navigate("/"); 
    } catch (err) {
      //error catching
      console.error(err);
    }
  };

  //what you see in the page
  return (
    <div>
      <h1>Dashboard</h1>
      {user ? <p>Logged in as: {user.email}</p> : <p>Not logged in</p>} 
      <button onClick={logout}>Log Out</button>
    </div>
  );
};

export default Dashboard;
