import React, { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom"; //import functions
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Typography, Button, Divider, TextField, IconButton } from "@mui/material";
import { Settings, Info, Dashboard as DashboardIcon, ExitToApp, Send } from "@mui/icons-material";

const Dashboard = () => {
  const [user] = useAuthState(auth);
  const [role, setRole] = useState("");
  const navigate = useNavigate(); //initialize function from import
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // State for messages

  const logout = async () => {
    try {
      await signOut(auth);
      //go to login page. it's just / because it's on http://localhost:3000/ and not http://localhost:3000/login
      //change this if you are going to make a login page later.
      navigate("/");
    } catch (err) {
      //error catching
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRole(userData.role);
        }
      }
    };

    fetchUserRole();
  }, [user]);

// const Sidebar = ({ user, logout }) => {
//   const navigate = useNavigate(); // Hook for navigation
//   const [messages, setMessages] = useState([]); // State for messages
   // State for input field

  const menuItems = [
    { text: "Settings", icon: <Settings />, path: "/settings" },
    { text: "About", icon: <Info />, path: "/about" }
  ];

  const sendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, sender: user?.email || "Guest" }]);
      setInput(""); // Clear input after sending
    }
  };
  return (
    <Box sx={{ flexGrow: 1, display: "flex", height: "100vh" }}> {/* Full height sidebar */}
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          width: 180,
          flexShrink: 0,
          "& .MuiDrawer-paper": { 
            width: 180, 
            display: "flex", 
            flexDirection: "column", 
            justifyContent: "space-between", 
            p: 2 
          }
        }}
      >
        {/* Dashboard Header */}
        <Box sx={{ textAlign: "center", py: 2 }}>
          <DashboardIcon sx={{ fontSize: 40, color: "primary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: "bold", mt: 1 }}>
            Dashboard
          </Typography>
        </Box>

        <Divider />

        {/* Navigation Links */}
        <Box sx={{ flexGrow: 1 }}>
          <List>
            {menuItems.map((item, index) => (
              <ListItem 
                button 
                key={index} 
                onClick={() => navigate(item.path)}
                sx={{ borderRadius: 2, mb: 1, "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.1)" } }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>

        <Divider />

        {/* User Info & Logout */}
        <Box sx={{ p: 2, textAlign: "center" }}>
          {user ? (
            <>
              <Typography variant="body2">Logged in as:</Typography>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>{user.email}</Typography>
              <Typography variant="body2">Your Role:</Typography>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>{role}</Typography>
            </>
            
          ) : (
            <Typography variant="body2">Not logged in</Typography>
          )}
          <Button 
            variant="contained" 
            color="error" 
            fullWidth 
            startIcon={<ExitToApp />} 
            onClick={logout}
            sx={{ mt: 2, borderRadius: 2, py: 1 }}
          >
            Log Out
          </Button>
        </Box>
      </Drawer>

      {/* Main Chat Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 2, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {/* Chat Messages */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", mb: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 2, top: 0 }}>
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <Box key={index} sx={{ flexGrow: 1, mb: 1, p: 1, bgcolor: msg.sender === user?.email ? "#2196F3" : "#e0e0e0", color: msg.sender === user?.email ? "white" : "black", borderRadius: 2, maxWidth: "60%", alignSelf: msg.sender === user?.email ? "flex-end" : "flex-start" }}>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>{msg.sender}</Typography>
                <Typography variant="body1">{msg.text}</Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2" sx={{ textAlign: "center", color: "gray" }}>No messages yet. Start chatting!</Typography>
          )}
        </Box>

        {/* Chat Input Field */}
        <Box 
          sx={{
            position: "fixed", // Fixes the position at the bottom
            bottom: 0, // Sticks it to the bottom
            right: 0, // Ensures it spans the full width
            width: "82%", // Full width
            height: "60px", // Set a fixed height (adjust as needed)
            backgroundColor: "white", // Optional: Set a background color
            display: "flex", // Enables flex properties
            alignItems: "center", // Centers items vertically
            gap: 1,
            padding: 2,
            borderTop: "1px solid #ccc", // Optional: Adds a border at the top
          }}
        >
          <TextField 
            fullWidth 
            variant="outlined" 
            placeholder="Type a message..." 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <IconButton color="primary" onClick={sendMessage}>
            <Send />
          </IconButton>
        </Box>
      </Box>
    </Box>
   );
};

export default Dashboard;