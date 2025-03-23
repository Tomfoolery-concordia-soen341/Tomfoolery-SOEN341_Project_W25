import React, { useState, useEffect, useRef } from "react"; // Add useRef
import { useLocation, useNavigate } from "react-router-dom";
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
import { useAuthState } from "react-firebase-hooks/auth";

const MemberChannel = () => {
  const { state } = useLocation();
  const { channel } = state;
  const [user] = useAuthState(auth);
  const [isDefault, setIsDefault] = useState(false);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const navigate = useNavigate();

  // Create a ref for the chat messages container
  const messagesEndRef = useRef(null);

  // Function to scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    const messagesRef = collection(db, "channels", channel.id, "messages");

    onSnapshot(messagesRef, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id, // Include the document ID
        ...doc.data(), // Include the document data
      }));

      // Sort messages by timestamp in ascending order
      const sortedMessages = messagesData.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return a.timestamp.toDate() - b.timestamp.toDate();
        }
        return 0; // Fallback if timestamps are missing
      });

      setMessages(sortedMessages); // Update state with sorted messages
    });
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messagesRef = collection(db, "channels", channel.id, "messages");
    await addDoc(messagesRef, {
      text: newMessage,
      sender: auth.currentUser.email,
      timestamp: serverTimestamp(), // Add a server-side timestamp
    });

    setNewMessage(""); // Clear input after sending
  };

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent default behavior (e.g., new line in input)
      sendMessage(); // Send the message
    }
  };

  // Leave channel
  const leaveChannel = async () => {
    const confirm = window.confirm("Do you want to leave this channel?");
    if (!confirm) return;

    const channelRef = doc(db, "channels", channel.id);
    await updateDoc(channelRef, { members: arrayRemove(user.email) }).then(() => {
      BackToDashboard();
    });
  };

  const BackToDashboard = () => {
    navigate("/Member");
  };

  useEffect(() => {
    fetchChannelData();
    listenForMessages();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#36393f",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "240px",
          backgroundColor: "#2f3136",
          padding: "16px",
          borderRight: "1px solid #202225",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between", // Push buttons to the bottom
        }}
      >
        {/* Top Section */}
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>
            Channel: {channel.name}
          </h1>

          {/* Members Section */}
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
              Members
            </h2>
            <ul style={{ listStyle: "none", padding: "0" }}>
              {members.map((member, index) => (
                <li
                  key={index}
                  style={{ fontSize: "14px", color: "#b9bbbe", marginBottom: "4px" }}
                >
                  {member}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div>
          {/* Leave Channel Button */}
          {!isDefault && (
            <button
              onClick={leaveChannel}
              style={{
                width: "100%",
                backgroundColor: "#ff416c",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "8px",
                fontSize: "14px",
                cursor: "pointer",
                transition: "background 0.3s ease",
                marginBottom: "8px",
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#ff4b2b")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#ff416c")}
            >
              Leave Channel
            </button>
          )}

          {/* Back to Dashboard Button */}
          <button
            onClick={BackToDashboard}
            style={{
              width: "100%",
              backgroundColor: "#7289da",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "8px",
              fontSize: "14px",
              cursor: "pointer",
              transition: "background 0.3s ease",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#677bc4")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#7289da")}
            >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#36393f",
        }}
      >
        {/* Chat Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            backgroundColor: "#36393f",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: "16px",
                display: "flex",
                alignItems: "flex-start",
                width: "100%",
              }}
            >
              <div
                style={{
                  backgroundColor: "#40444b",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  width: "100%",
                  maxWidth: "100%",
                }}
              >
                <strong style={{ color: "#7289da", fontSize: "14px" }}>
                  {msg.sender}:
                </strong>
                <p style={{ color: "#fff", fontSize: "14px", margin: "4px 0 0 0" }}>
                  {msg.text}
                </p>
              </div>
            </div>
          ))}
          {/* Empty div to act as the scroll target */}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div
          style={{
            padding: "16px",
            backgroundColor: "#40444b",
            borderTop: "1px solid #202225",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown} // Add keydown event listener
              placeholder="Type a message..."
              style={{
                flex: 1,
                backgroundColor: "#36393f",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "8px 12px",
                fontSize: "14px",
                marginRight: "8px",
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                backgroundColor: "#7289da",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "8px 16px",
                fontSize: "14px",
                cursor: "pointer",
                transition: "background 0.3s ease",
              }}
              onMouseOver={(e) => (e.target.backgroundColor = "#677bc4")}
              onMouseOut={(e) => (e.target.backgroundColor = "#7289da")}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberChannel;