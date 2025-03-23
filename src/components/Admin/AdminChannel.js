import React, { useState, useEffect, useRef } from "react"; // Add useRef
import { useLocation } from "react-router-dom";
import {
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  arrayRemove,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../config/firebase";
import { useNavigate } from "react-router-dom";

const AdminChannel = () => {
  const { state } = useLocation();
  const { channel } = state;
  const [user] = useAuthState(auth);
  const [isDefault, setIsDefault] = useState(false);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // List of all users
  const [selectedMember, setSelectedMember] = useState(""); // Selected member from dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State to control dropdown visibility
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [requestToUpdate, setRequestToUpdate] = useState(false);

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

  // Fetch the channel's data
  const fetchChannelData = async () => {
    const channelRef = doc(db, "channels", channel.id);
    const channelSnap = await getDoc(channelRef);
    if (channelSnap.exists()) {
      setMembers(channelSnap.data().members || []);
      setRequests(channelSnap.data().request || []);
      setIsDefault(channelSnap.data().isDefault);
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

  // Add a member to the channel
  const addMember = async () => {
    if (!selectedMember) {
      alert("Please select a member.");
      return;
    }

    const channelRef = doc(db, "channels", channel.id);
    await updateDoc(channelRef, {
      members: arrayUnion(selectedMember), // Add the selected member to Firestore
    });

    setMembers((prev) => [...prev, selectedMember]); // Update local members state
    setSelectedMember(""); // Clear dropdown selection
    setIsDropdownOpen(false); // Close the dropdown
    alert(`Added ${selectedMember} to ${channel.name}`);
  };

  // Listen for chat messages
  const retrieveMessages = () => {
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

  // Delete message
  const DeleteMessage = async (messageId) => {
    if (!messageId || !channel) {
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
      await deleteDoc(doc(db, `channels/${channel.id}/messages`, messageId));
      setMessages(messages.filter((message) => message.id !== messageId));
      alert("Message deleted successfully.");
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message.");
    }
  };

  const acceptRequest = async (requester) => {
    const channelRef = doc(db, "channels", channel.id);
    await updateDoc(channelRef, {
      members: arrayUnion(requester),
      request: arrayRemove(requester),
    });
    alert(`Accepted ${requester} to ${channel.name}`);
    setRequestToUpdate(true);
  };

  const deleteRequest = async (requester) => {
    const channelRef = doc(db, "channels", channel.id);
    await updateDoc(channelRef, {
      request: arrayRemove(requester),
    });
    alert(`Rejected ${requester} request for ${channel.name}`);
    setRequestToUpdate(true);
  };

  useEffect(() => {
    fetchChannelData();
    fetchUsers(); // Fetch the list of users
    retrieveMessages();
    setRequestToUpdate(false);
  }, [requestToUpdate]);

  const BackToDashboard = () => {
    navigate("/Admin");
  };

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
          <div
            style={{
              backgroundColor: "#40444b",
              padding: "8px",
              borderRadius: "4px",
              marginBottom: "16px",
            }}
          >
            <p style={{ fontSize: "14px", color: "#b9bbbe" }}>Admin Permissions ON</p>
          </div>

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

          {/* Requests Section */}
          {!isDefault && (
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
                Requests
              </h2>
              <ul style={{ listStyle: "none", padding: "0" }}>
                {requests.map((requester, index) => (
                  <li
                    key={index}
                    style={{ fontSize: "14px", color: "#b9bbbe", marginBottom: "4px" }}
                  >
                    {requester}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        acceptRequest(requester);
                      }}
                      style={{
                        backgroundColor: "#7289da",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        marginLeft: "8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        transition: "background 0.3s ease",
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRequest(requester);
                      }}
                      style={{
                        backgroundColor: "#ff416c",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        marginLeft: "8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        transition: "background 0.3s ease",
                      }}
                    >
                      Reject
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div>
          {/* Add Member Section */}
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
              Add Member
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                style={{
                  marginTop: "8px",
                  backgroundColor: "#40444b",
                  borderRadius: "4px",
                  padding: "8px",
                }}
              >
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  style={{
                    width: "100%",
                    backgroundColor: "#36393f",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">Select a member</option>
                  {allUsers
                    .filter((user) => !members.includes(user.email)) // Filter out already-added members
                    .map((user) => (
                      <option key={user.id} value={user.email}>
                        {user.email}
                      </option>
                    ))}
                </select>
                <button
                  onClick={addMember}
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
                    marginTop: "8px",
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = "#677bc4")}
                  onMouseOut={(e) => (e.target.style.backgroundColor = "#7289da")}
                >
                  Add Selected Member
                </button>
              </div>
            )}
          </div>

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
              <button
                onClick={() => DeleteMessage(msg.id)}
                style={{
                  backgroundColor: "#ff416c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  marginLeft: "8px",
                  cursor: "pointer",
                  fontSize: "12px",
                  transition: "background 0.3s ease",
                }}
                onMouseOver={(e) => (e.target.backgroundColor = "#ff4b2b")}
                onMouseOut={(e) => (e.target.backgroundColor = "#ff416c")}
              >
                Delete
              </button>
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

export default AdminChannel;