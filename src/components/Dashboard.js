import React from "react";
import { auth } from "../config/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom"; //import functions
import Box from '@mui/material/Box';
import VerticalTabs from './Sidebar';
import Tab from '@mui/material/Box';

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
    <Box>
      <Tab label="Dashboard" />
      <VerticalTabs/> 
    </Box>
    // <div className="dashboard-container">
    //   <div className="content-container">
    //     <VerticalTabs/>
    //     
        
    //   {user ? <p>Logged in as: {user.email}</p> : <p>Not logged in</p>} 
    //   <button onClick={logout}>Log Out</button> 
    //   </div>
    // </div>
  );
};

export default Dashboard;
