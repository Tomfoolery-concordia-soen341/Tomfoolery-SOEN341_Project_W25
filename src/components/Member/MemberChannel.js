import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  getDocs,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import {useLocation, useNavigate} from "react-router-dom";
import {useAuthState} from "react-firebase-hooks/auth"; // Import Firestore & Auth

const MemberChannel = () => {
  const [user] = useAuthState(auth);
  const [isDefault, setIsDefault] = useState(false);
  const [members, setMembers] = useState([]); 
  const [messages, setMessages] = useState([]); 
  const [newMessage, setNewMessage] = useState("");
  const { state } = useLocation();
  const { channel } = state;
  const navigate = useNavigate();

  useEffect(() => {
    fetchChannelData();
    listenForMessages();
  }, []);

  // Fetch channel members
  const fetchChannelData = async () => {
    const channelRef = doc(db, "channels", channel.id);
    const channelSnap = await getDoc(channelRef);
    if (channelSnap.exists()) {
      setMembers(channelSnap.data().members || []);
      setIsDefault(channelSnap.data().isDefault);
    }
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

  const leaveChannel = async () => {
    const confirm = window.confirm(
        "Do you want to leave this channel?",
    );
    if (!confirm) return;

    const channelRef = doc(db, "channels", channel.id);
    await updateDoc(channelRef, {members: arrayRemove(user.email)})
    .then(() => {BackToDashboard()})

  }

  return (
    <div>
      <h1>Channel: {channel.name}</h1>

      {!isDefault ? <div>
        <button onClick = {leaveChannel}>Leave Channel</button>
        <p></p>
        <h2>Channel Members</h2>
        <ul>
          {members.map((member, index) => (
            <li key={index}>{member}</li>
          ))}
        </ul>
      </div> : null }

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
