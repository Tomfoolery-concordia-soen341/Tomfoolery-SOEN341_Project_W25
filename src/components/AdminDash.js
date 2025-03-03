import React, { useEffect, useState } from "react";
import { deleteDoc } from "firebase/firestore"; 
import { getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { signOut } from "firebase/auth";
import {
  doc,
  getDocs,
  setDoc,
  addDoc,
  collection,
  query,
  where,
} from "firebase/firestore";

import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const checkAdminStatus = async () => {
  if (!auth.currentUser) return false; // Ensure the user is logged in
alert("You are not an admin");
  const userRef = doc(db, "users", auth.currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists() && userSnap.data().role === "admin") {
    return true;
  } else {
    return false;
  }
  }





const AdminDash = () => {
  const [user] = useAuthState(auth);
  const [channels, setChannels] = useState([]); // State to store the list of channels
  const [messages, setMessages] = useState([]); // State to store the list of messages
  const [selectedChannel, setSelectedChannel] = useState(null); // State to store the selected channel
  const navigate = useNavigate();

  // Fetch all channels from Firestore
  const fetchChannels = async () => {
    const channelRef = collection(db, "channels");
    const querySnapshot = await getDocs(channelRef);
    const channelList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setChannels(channelList);
  };

  const fetchMessages = async (channelId) => {
    if (!channelId) return;

    const messagesRef = collection(db, `channels/${channelId}/messages`);
    const querySnapshot = await getDocs(messagesRef);
    const messageList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setMessages(messageList);
  };

  const CreateChannel = async () => {
    const channelName = prompt("Enter channel name");
    if (channelName) {
      const channelRef = collection(db, "channels");
      const q = query(channelRef, where("name", "==", channelName));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        const newChannel = await addDoc(channelRef, {
          name: channelName,
          members: [], // Initialize with an empty members array
        });
        setChannels([
          ...channels,
          { id: newChannel.id, name: channelName, members: [] },
        ]);
      } else {
        alert("Channel already exists");
      }
    }
  };

  const GoToChannel = (channel) => {
    setSelectedChannel(channel);
    fetchMessages(channel.id);
    navigate(`/channel/${channel.id}`, { state: { channel } });
 
  };

  const Logout = () => {
    navigate("/");
  };
  const [channelId, setChannelId] = useState(null);
  useEffect(() => {
    fetchChannels();
  }, []);

 
 
  const DeleteChannel = async (channelId) => {
    if (!channelId) {
      alert("Invalid channel ID.");
      return;
    }
  
    // Check if the current user is an admin
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
  
    if (!userSnap.exists() || userSnap.data().role !== "admin") {
      alert("Bruh, you're not an admin!");
      return;
    }
  
    const confirmDelete = window.confirm("do you really want to delete this channel?");
    if (!confirmDelete) return;
  
    try {
      await deleteDoc(doc(db, "channels", channelId)); // Delete the specific channel
      setChannels(channels.filter((channel) => channel.id !== channelId));
      alert("Channel deleted successfully.");
    } catch (error) {
      console.error("Error deleting channel:", error);
      alert("Failed to delete channel.");
    }
  };

  


  const DeleteMessage = async (messageId) => { // No need for channelId parameter
    if (!messageId || !selectedChannel) { // Check selectedChannel
      alert("Invalid message or channel ID.");
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || userSnap.data().role !== "admin") {
      alert("Stop trying already, you're not an Admin!");
      return;
    }

    const confirmDelete = window.confirm(
      "Do you commit to the sins of deleting this message???????"
    );
    if (!confirmDelete) return;

    try {
      // Use selectedChannel.id to get the channel ID
      await deleteDoc(doc(db, `channels/${selectedChannel.id}/messages`, messageId));
      setMessages(messages.filter((message) => message.id !== messageId));
      alert("Message deleted successfully.");
    } catch (error) { // Corrected the catch block
      console.error("Error deleting message:", error);
      alert("Failed to delete message.");
    }
  };

 
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Logged in as: <strong>{user?.email}</strong></p>
      <label>Create a text channel</label>
      <button onClick={CreateChannel}>Create</button>
      <div>
        <h2>Channels</h2>
        <ul>
          {channels.map((channel) => (
            <li key={channel.id} className="Channel" onClick={() => GoToChannel(channel)}>
              {channel.name}
              <button onClick={(e) => { e.stopPropagation(); DeleteChannel(channel.id); }}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Messages</h2>
        {messages.map((message) => (
          <div key={message.id} className="Message">
            <p>{message.text}</p>
            <button onClick={() => DeleteMessage(message.id)}>Delete</button>
          </div>
        ))}
      </div>
      <button onClick={Logout}>Log out</button>
    </div>
  );
};


export default AdminDash;