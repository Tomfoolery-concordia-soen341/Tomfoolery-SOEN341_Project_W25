import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  collection,
  orderBy,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  arrayRemove,
  query,
  where,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../config/firebase";
import ContextMenu from "../ContextMenu/ContextMenu";

// Utility function to fetch channel data
const fetchChannelData = async (channelId, user, setAdmin, setMembers, setOwnerEmail, setRequests, setOwner) => {
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.data().role === "admin") setAdmin(true);

  const channelSnap = await getDoc(doc(db, "privateChannels", channelId));
  if (channelSnap.exists()) {
    const channelData = channelSnap.data();
    setMembers(channelData.members || []);
    setOwnerEmail(channelData.owner);
    setRequests(channelData.request || []);
    setOwner(channelData.owner === user.email);
  }
};

// Utility function to fetch all users
const fetchAllUsers = async (setAllUsers) => {
  const querySnapshot = await getDocs(collection(db, "users"));
  const users = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  setAllUsers(users);
};

// Fetch user display names and map them to their emails
const fetchUserDisplayNames = async () => {
  const querySnapshot = await getDocs(collection(db, "users"));
  const userMap = {};
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    userMap[data.email] = data.displayName; // Map email to displayName
  });
  return userMap;
};

// Add this function to fetch online users
const fetchOnlineUsers = async (setOnlineUsers) => {
  const querySnapshot = await getDocs(
    query(collection(db, "users"), where("isOnline", "==", true))
  );
  const onlineUsers = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  setOnlineUsers(onlineUsers);
};

// Component for Requests List
const RequestsList = ({ requests, AcceptRequest, DeleteRequest }) => (
  <div className="mt-5">
    <h3 className="title is-5">Requests</h3>
    <ul>
      {requests.map((requester, index) => (
        <li key={index} className="mb-2">
          {requester}
          <div className="buttons mt-2">
            <button
              className="button is-success is-small"
              onClick={() => AcceptRequest(requester)}
            >
              Accept
            </button>
            <button
              className="button is-danger is-small"
              onClick={() => DeleteRequest(requester)}
            >
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

// Component for Add Member Form
const AddMemberForm = ({ allUsers, members, selectedMember, setSelectedMember, addMember }) => (
  <div className="mt-5">
    <div className="field has-addons">
      <div className="control is-expanded">
        <div className="select is-fullwidth">
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
          >
            <option value="">Select a member</option>
            {allUsers
              .filter((user) => !members.includes(user.email))
              .map((user) => (
                <option key={user.id} value={user.email}>
                  {user.email}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="control">
        <button className="button is-link" onClick={addMember}>
          Add
        </button>
      </div>
    </div>
  </div>
);

const Channel = () => {
  const { state } = useLocation();
  const { channel } = state;
  const [user] = useAuthState(auth);
  const [admin, setAdmin] = useState(false);
  const [owner, setOwner] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [requests, setRequests] = useState([]);
  const [contextMenu, setContextMenu] = useState({
    position: { x: 0, y: 0 },
    toggled: false,
    message: null,
  });
  const [quotedMessage, setQuotedMessage] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]); // State for online users
  const [userDisplayNames, setUserDisplayNames] = useState({}); // State for email-to-displayName mapping
  const navigate = useNavigate();
  const chatContainerRef = useRef(null);
  const contextMenuRef = useRef(null);

  // Scroll to the bottom of the chat
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Add member
  const addMember = async () => {
    if (!selectedMember) {
      alert("Please select a member.");
      return;
    }
    await updateDoc(doc(db, "privateChannels", channel.id), {
      members: arrayUnion(selectedMember),
    });
    setMembers((prev) => [...prev, selectedMember]);
    setSelectedMember("");
    alert(`Added ${selectedMember} to ${channel.name}`);
  };

  // Accept or delete request
  const handleRequest = async (requester, action) => {
    const channelRef = doc(db, "privateChannels", channel.id);
    if (action === "accept") {
      await updateDoc(channelRef, {
        members: arrayUnion(requester),
        request: arrayRemove(requester),
      });
      alert(`Accepted ${requester} to ${channel.name}`);
    } else if (action === "reject") {
      await updateDoc(channelRef, {
        request: arrayRemove(requester),
      });
      alert(`Rejected ${requester} request for ${channel.name}`);
    }
    fetchChannelData(channel.id, user, setAdmin, setMembers, setOwnerEmail, setRequests, setOwner);
  };

  // Get messages and include displayName
  const getMessages = async () => {
    const userMap = await fetchUserDisplayNames();
    const sorter = query(
      collection(db, "privateChannels", channel.id, "messages"),
      orderBy("timestamp")
    );
    onSnapshot(sorter, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          displayName: userMap[data.sender] || data.sender,
        };
      });
      setMessages(messagesData);
    });
  };

  // Send message, including the quoted message if present
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await addDoc(collection(db, "privateChannels", channel.id, "messages"), {
      text: newMessage,
      sender: auth.currentUser.email,
      timestamp: serverTimestamp(),
      quotedMessage: quotedMessage
        ? {
            sender: quotedMessage.sender,
            text: quotedMessage.text,
          }
        : null,
    });

    setNewMessage("");
    setQuotedMessage(null);
  };

  // Handle quoting a message
  const handleQuoteMessage = (message) => {
    setQuotedMessage(message);
  };

  // Leave channel
  const leaveChannel = async () => {
    const confirm = window.confirm(
      "Do you want to leave this channel? This action cannot be undone."
    );
    if (!confirm) return;
    await updateDoc(doc(db, "privateChannels", channel.id), {
      members: arrayRemove(user.email),
    });
    navigate("/Dashboard");
  };

  // Handle right-click on a message
  const handleOnContextMenu = (e, message) => {
    e.preventDefault();
    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      toggled: true,
      message,
    });

    setMessages((prevMessages) =>
      prevMessages.map((msg) => ({
        ...msg,
        selected: msg.id === message.id,
      }))
    );
  };

  // Close the context menu when clicking outside
  const handleClickOutside = (e) => {
    if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
      setContextMenu((prev) => ({ ...prev, toggled: false }));
      setMessages((prevMessages) =>
        prevMessages.map((msg) => ({ ...msg, selected: false }))
      );
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    console.log("User:", user);
    if (!user) {
      console.error("User is not authenticated.");
      return;
    }
    fetchChannelData(channel.id, user, setAdmin, setMembers, setOwnerEmail, setRequests, setOwner);
    fetchAllUsers(setAllUsers);
    getMessages();
    fetchOnlineUsers(setOnlineUsers); // Fetch online users when the component mounts
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch user display names when the component mounts
  useEffect(() => {
    const fetchAndSetUserDisplayNames = async () => {
      const displayNames = await fetchUserDisplayNames();
      setUserDisplayNames(displayNames);
    };
    fetchAndSetUserDisplayNames();
  }, []);

  // Context menu buttons
  const contextMenuButtons = [
    {
      text: "Reply",
      icon: "💬",
      onClick: () => {
        console.log("Reply to message:", contextMenu.message);
        handleQuoteMessage(contextMenu.message);
      },
    },
    {
      text: "Delete",
      icon: "🗑️",
      show: admin || owner,
      onClick: () => {
        console.log("Delete message:", contextMenu.message);
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== contextMenu.message.id)
        );
      },
    },
  ];

  // Function to toggle the sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div
      className="columns is-gapless"
      style={{ height: "100vh", gap: "0.5rem" }}
    >
      {/* Left Sidebar */}
      <div
        className="column is-one-quarter p-4 has-background-light"
        style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
      >
        <div>
          <h1 className="title is-4" style={{ display: "flex", alignItems: "center" }}>
            {channel.isDefault ? (
              <span className="icon" style={{ marginRight: "8px" }}>
                <i className="fas fa-globe"></i> {/* Font Awesome Globe icon for public channels */}
              </span>
            ) : (
              <span className="icon" style={{ marginRight: "8px" }}>
                <i className="fas fa-lock"></i> {/* Font Awesome Lock icon for private channels */}
              </span>
            )}
            {channel.name}
          </h1>
          {admin && <p className="subtitle is-6">Owner: {ownerEmail}</p>}
          <p className="subtitle is-6 mt-3">
            <strong>Channel Owner:</strong> {ownerEmail}
          </p>
          <hr style={{ borderColor: "black", border: "inset" }} /> {/* Horizontal line styled as black */}
          {(owner || admin) && requests.length > 0 && (
            <RequestsList
              requests={requests}
              AcceptRequest={(requester) => handleRequest(requester, "accept")}
              DeleteRequest={(requester) => handleRequest(requester, "reject")}
            />
          )}
        </div>
        <div style={{ marginTop: "auto" }}>
          {!admin && !channel.isDefault && (
            <button
              className="button is-danger is-fullwidth mb-2"
              onClick={leaveChannel}
            >
              <span className="icon">
                <i className="fas fa-sign-out-alt"></i> {/* Font Awesome icon for leaving */}
              </span>
              <span>Leave Channel</span>
            </button>
          )}
          <button
            className="button is-link is-fullwidth"
            onClick={() => navigate("/Dashboard")}
          >
            <span className="icon">
              <i className="fas fa-arrow-left"></i> {/* Font Awesome icon for back */}
            </span>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`column ${isSidebarOpen ? "is-two-quarters" : "is-three-quarters"} p-4`}
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <div
          className="box"
          style={{
            flex: "1",
            overflowY: "auto",
            borderRadius: "12px",
            padding: "1rem",
            marginBottom: "0.5rem",
            marginTop: "0.5rem",
            backgroundColor: "#f9f9f9",
          }}
          ref={chatContainerRef}
        >
          <ul>
            {messages.map((msg, index) => (
              <li
                key={index}
                onContextMenu={(e) => handleOnContextMenu(e, msg)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.sender === user.email ? "flex-end" : "flex-start", // Align based on sender
                  marginBottom: "0.5rem",
                }}
              >
                {msg.quotedMessage && (
                  <div
                    style={{
                      backgroundColor: "#f0f0f0",
                      borderLeft: "4px solid #3273dc",
                      padding: "0.5rem",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      color: "#555",
                      borderRadius: "8px",
                      maxWidth: "60%",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>In reply to:</strong> {userDisplayNames[msg.quotedMessage.sender] || msg.quotedMessage.sender}: {msg.quotedMessage.text}
                    </p>
                  </div>
                )}
                <div
                  style={{
                    backgroundColor: msg.sender === user.email ? "#3273dc" : "#f0f0f0", // Blue for sender, gray for receiver
                    color: msg.sender === user.email ? "#fff" : "#000", // White text for sender, black for receiver
                    padding: "0.75rem",
                    borderRadius: "12px",
                    maxWidth: "60%",
                    wordWrap: "break-word",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    position: "relative", // Ensure the timestamp aligns properly
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <strong>{userDisplayNames[msg.sender] || msg.sender}:</strong> {msg.text}
                  </p>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: msg.sender === user.email ? "#d0d0d0" : "#888",
                      display: "block",
                      marginTop: "0.5rem",
                      textAlign: msg.sender === user.email ? "right" : "left", // Align timestamp based on sender
                    }}
                  >
                    {msg.timestamp
                      ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Just now"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="field has-addons">
          {quotedMessage && (
            <div className="box mb-2" style={{ backgroundColor: "#f0f0f0" }}>
              <p>
                <strong>{quotedMessage.sender}:</strong> {quotedMessage.text}
              </p>
              <button
                className="delete"
                onClick={() => setQuotedMessage(null)}
                style={{ float: "right" }}
              ></button>
            </div>
          )}
          <div className="control is-expanded">
            <input
              className="input"
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />
          </div>
          <div className="control">
            <button className="button is-link" onClick={sendMessage}>
              <span className="icon">
                <i className="fas fa-paper-plane"></i> {/* Font Awesome icon for sending */}
              </span>
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Right Sidebar */}
      {isSidebarOpen && (
        <div
          className="column is-one-quarter p-4 has-background-light"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderLeft: "1px solid #ddd",
          }}
        >
          {/* Channel Members List */}
          <div className="mt-4">
            <h3 className="title is-5">Channel Members</h3>
            <ul>
              {members.map((member, index) => {
                const memberData = allUsers.find((user) => user.email === member); // Find the user data from allUsers
                const isOnline = memberData?.status === "active"; // Check if the status is "active"
                const displayName = memberData?.displayName || member; // Fallback to email if displayName is not found

                return (
                  <li key={index} className="mb-2" style={{ display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: isOnline ? "green" : "red", // Green for active, red for inactive
                        display: "inline-block",
                        marginRight: "8px",
                        marginLeft: "8px",
                      }}
                    ></span>
                    {displayName}
                  </li>
                );
              })}
            </ul>
          </div>
              {/* Add Member Form */}
          {(owner || admin) && (
            <AddMemberForm
              allUsers={allUsers}
              members={members}
              selectedMember={selectedMember}
              setSelectedMember={setSelectedMember}
              addMember={addMember}
            />
          )}
          {/* <button
            className="button is-danger mt-auto"
            onClick={toggleSidebar}
          >
            Close Sidebar
          </button> */}
        </div>
      )}

      {/* Toggle Sidebar Button */}
      <button
        className={`button ${!isSidebarOpen ? "is-primary" : "is-danger"}`}
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 1000,
          borderRadius: "50%", // Make the button circular
          width: "3rem", // Set width for the circular button
          height: "3rem", // Set height for the circular button
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
        onClick={toggleSidebar}
      >
        <span className="icon">
          <i className={`fas ${!isSidebarOpen ? "fa-users" : "fa-times"}`}></i> {/* Font Awesome icons */}
        </span>
      </button>

      {/* Context Menu */}
      <ContextMenu
        position={contextMenu.position}
        isToggled={contextMenu.toggled}
        buttons={contextMenuButtons}
        contextMenuRef={contextMenuRef}
        closeMenu={() => setContextMenu((prev) => ({ ...prev, toggled: false }))}
      />
    </div>
  );
};

export default Channel;