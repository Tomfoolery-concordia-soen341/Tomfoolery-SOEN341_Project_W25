import React, { useState, useEffect } from "react";
import {doc, getDoc, collection, addDoc, onSnapshot, serverTimestamp, getDocs,} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import {useLocation, useNavigate} from "react-router-dom"; // Import Firestore & Auth
import { onAuthStateChanged } from "firebase/auth";
import { updateDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

const MemberChannel = () => {
  const [members, setMembers] = useState([]); 
  const [messages, setMessages] = useState([]); 
  const [newMessage, setNewMessage] = useState("");
  const { state } = useLocation();
  const { channel } = state;
  const navigate = useNavigate();
  const [user] = useAuthState(auth); //it listens to users authentication state
  const [allUsers, setAllUsers] = useState([]); // List of all users

  useEffect(() => {
    fetchChannelData();
    listenForMessages();
    fetchUsers();
    fetchChannelData();
  }, []);

  // Fetch channel members
  const fetchChannelData = async () => {
    const channelRef = doc(db, "channels", channel.id);
    const channelSnap = await getDoc(channelRef);
    if (channelSnap.exists()) {
      setMembers(channelSnap.data().members || []);
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    const users = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setAllUsers(users);
  };

  // Listen for chat messages
  const listenForMessages = () => {
    onSnapshot(collection(db, "channels", channel.id, "messages"), (snapshot) => {
      setMessages(snapshot.docs.map((doc) => doc.data()));
    });
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messagesRef = collection(db, "channels", channel.id, "messages");
    await addDoc(messagesRef, {
      text: newMessage,
      sender: auth.currentUser.email, 
      timestamp: serverTimestamp(),
    });

    setNewMessage(""); // Clear input after sending
  };

  const BackToDashboard = () => {
    navigate("/Member");
  };

  useEffect(() => {
    if (!user) return;
  
    const userRef = doc(db, "users", user.uid);
  
    updateDoc(userRef, { status: "online" }); // Set online when logged in
  
    const handleOffline = () => updateDoc(userRef, { status: "offline" });
    window.addEventListener("beforeunload", handleOffline);
  
    return () => {
      handleOffline();
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, [user]);
  
  // Call function in useEffect
  useEffect(() => {
    fetchUsersWithStatus();
  }, []);

  useEffect(() => {
    if (!user) return;
  
    const userRef = doc(db, "users", user.uid);
  
    updateDoc(userRef, { status: "online" }); // Set online when logged in
  
    const handleOffline = () => updateDoc(userRef, { status: "offline" });
    window.addEventListener("beforeunload", handleOffline);
  
    return () => {
      handleOffline();
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, [user]);
  
  // Fetch users with status (Add this function)
  const fetchUsersWithStatus = async () => {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    const users = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setAllUsers(users);
  };
  
  // Call function in useEffect
  useEffect(() => {
    fetchUsersWithStatus();
  }, []);

  return (
    <div>
      <h1>Channel: {channel.name}</h1>

      <div>
  <h2>Members</h2>
  <ul style={{ listStyleType: "none", padding: 0 }}>
    {members.map((member) => {
      const user = allUsers.find((u) => u.email === member);
      return (
        <li key={member}>
          {member} - 
          <span style={{ color: user?.status === "online" ? "green" : "red" }}>
            {user?.status || "offline"}
          </span>
        </li>
      );
    })}
  </ul>
</div>

      {/* Chat Section */}
      <div>
        <h2>Chat</h2>
        <div className="chat-window">
          {messages.map((msg, index) => (
            <p key={index}>
              <strong>{msg.sender}:</strong> {msg.text}
            </p>
          ))}
        </div>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
      <button onClick={BackToDashboard}>Go back to Dashboard</button>
    </div>
  );
};

export default MemberChannel;
