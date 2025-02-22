import React, { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import {
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Box,
    Typography,
    Button,
    Divider,
    TextField,
    IconButton,
} from "@mui/material";
import {
    Settings,
    Info,
    Dashboard as DashboardIcon,
    ExitToApp,
    Send,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { isAdmin } from "./Login";

const Sidebar = () => {
    const [user] = useAuthState(auth);
    const role = isAdmin? "admin" : "user";
    const [channels, setChannels] = useState([]); // State for channels
    const [activeChannel, setActiveChannel] = useState(null); // State for active channel
    const [channelMessages, setChannelMessages] = useState([]); // State for channel messages
    const [newChannelName, setNewChannelName] = useState(""); // State for new channel name
    const [isCreatingChannel, setIsCreatingChannel] = useState(false); // State for channel creation UI
    const [input, setInput] = useState(""); // State for input field
    const navigate = useNavigate();

    // Fetch user role and channels on component mount
    /*useEffect(() => {
        const fetchUserRole = async () => {
            if (user) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setRole(userData.role);
                }
            }
        };

    const fetchChannels = async () => {

        //create a temp array holding all accessible channels
        let accessibleChannels = [];

        //get all channels from database
        const allChannels = await getDocs(collection(db, "channels"));

        //loop through each channel in database
        allChannels.forEach((channel) => {

            //get the data of this channel
            const field = channel.data();

            //make sure there is a members field
            if (field.members != undefined) {

                //check each member in the field
                field.members.forEach((member) => {

                    //if the member is equal to the user's email, add this to array
                    if (member == user.email){
                        accessibleChannels.push(channel);
                    }
                })
            }
        })
        //if accessibleChannels has been changed set channels to this
        if (accessibleChannels.length !== 0) setChannels(accessibleChannels);
    }

    //function call fetchChannels is in a useEffect since it should be run only once
    //updates every time page is updated run
    useEffect(() => {fetchChannels()},[])
    //console.log(channels);

    const fetchMessages = async () => {
        if (activeChannel) {
            const q = query(collection(db, "channels", activeChannel, "messages"), orderBy("timestamp", "asc"))
            const messagesSnapshot = await getDocs(q);
            const messagesList = messagesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setChannelMessages(messagesList);
        }
    };

    // Fetch messages for the active channel
    useEffect(() => {fetchMessages()}, [activeChannel]);

    // Create a new channel
    const createChannel = async () => {
        if (newChannelName.trim()) {
            try {
                await addDoc(collection(db, "channels"), {
                    name: newChannelName,
                    members: [user.email],
                    createdBy: user.uid,
                    createdAt: serverTimestamp(),
                });
                setNewChannelName(""); // Clear input
                setIsCreatingChannel(false); // Close creation UI
            } catch (error) {
                console.error("Error creating channel:", error);
            }
        }
        fetchChannels();
    };

    // Send a message to the active channel
    const sendMessage = async () => {
        if (input.trim() && activeChannel) {
            try {
                await addDoc(collection(db, "channels", activeChannel, "messages"), {
                    text: input,
                    sender: user.uid,
                    senderEmail: user.email,
                    timestamp: serverTimestamp(),
                });
                setInput(""); // Clear input after sending
            } catch (error) {
                console.error("Error sending message:", error);
            }
        }
    };

    // Logout
    const logout = async () => {
        try {
            await signOut(auth);
            navigate("/");
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Box sx={{ flexGrow: 1, display: "flex", height: "100vh" }}>
            <Drawer
                variant="permanent"
                anchor="left"
                sx={{
                    width: 240,
                    flexShrink: 0,
                    "& .MuiDrawer-paper": {
                        width: 240,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        p: 2,
                    },
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

                {/* Channels List */}
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                        Channels
                    </Typography>
                    <List>
                        {channels.map((channel) => (
                            <ListItem
                                button
                                key={channel.id}
                                onClick={() => setActiveChannel(channel.id)}
                                sx={{
                                    borderRadius: 2,
                                    mb: 1,
                                    backgroundColor: activeChannel === channel.id ? "rgba(0, 0, 0, 0.1)" : "inherit",
                                    "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.1)" },
                                }}
                            >
                                <ListItemText primary={channel.name} />
                            </ListItem>
                        ))}
                    </List>

                    {/* Create Channel Button (Admin Only) */}
                    {role === "admin" && (
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={() => setIsCreatingChannel(true)}
                            sx={{ mt: 2, borderRadius: 2, py: 1 }}
                        >
                            Create Channel
                        </Button>
                    )}
                </Box>

                {/* Create Channel Dialog */}
                {isCreatingChannel && (
                    <Box sx={{ p: 2 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Channel Name"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={createChannel}
                            sx={{ borderRadius: 2, py: 1 }}
                        >
                            Create
                        </Button>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => setIsCreatingChannel(false)}
                            sx={{ mt: 1, borderRadius: 2, py: 1 }}
                        >
                            Cancel
                        </Button>
                    </Box>
                )}

                <Divider />

                {/* User Info & Logout */}
                <Box sx={{ p: 2, textAlign: "center" }}>
                    {user ? (
                        <>
                            <Typography variant="body2">Logged in as:</Typography>
                            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                {user.email}
                            </Typography>
                            <Typography variant="body2">Your role:</Typography>
                            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                {role}
                            </Typography>
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
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                }}
            >
                {/* Chat Messages */}
                <Box
                    sx={{
                        flexGrow: 1,
                        overflowY: "auto",
                        mb: 2,
                        p: 2,
                        bgcolor: "#f5f5f5",
                        borderRadius: 2,
                    }}
                >
                    {channelMessages.length > 0 ? (
                        channelMessages.map((msg) => (
                            <Box
                                key={msg.id}
                                sx={{
                                    flexGrow: 1,
                                    mb: 1,
                                    p: 1,
                                    bgcolor: msg.sender === user?.uid ? "#2196F3" : "#e0e0e0",
                                    color: msg.sender === user?.uid ? "white" : "black",
                                    borderRadius: 2,
                                    maxWidth: "60%",
                                    alignSelf: msg.sender === user?.uid ? "flex-end" : "flex-start",
                                }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                    {msg.senderEmail}
                                </Typography>
                                <Typography variant="body1">{msg.text}</Typography>
                            </Box>
                        ))
                    ) : (
                        <Typography variant="body2" sx={{ textAlign: "center", color: "gray" }}>
                            No messages yet. Start chatting!
                        </Typography>
                    )}
                </Box>

                {/* Chat Input Field */}
                {activeChannel && (
                    <Box
                        sx={{
                            flexGrow: 1,
                            p: 3,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
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
                )}
            </Box>
        </Box>
    );
};

export default Sidebar;