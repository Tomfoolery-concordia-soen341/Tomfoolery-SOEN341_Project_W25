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
      style={{
        height: "100vh", // Ensure the container takes the full viewport height
        display: "flex",
        flexDirection: "column", // Make the layout column-based
      }}
    >
      {/* Navbar */}
      <nav className="navbar is-link is-fixed-top">
        <div className="navbar-brand">
          <div className="navbar-item">
            <span className="icon" style={{ marginRight: "8px", fontSize: "1.5rem" }}>
              {channel.isDefault ? (
                <i className="fas fa-globe"></i> // Font Awesome Globe icon for public channels
              ) : (
                <i className="fas fa-lock"></i> // Font Awesome Lock icon for private channels
              )}
            </span>
            <h1 className="title is-4 has-text-white">Channel</h1>
          </div>
        </div>

        <div className="navbar-menu">
          <div className="navbar-start">
            <div className="navbar-item">
              <button
                className="button is-info is-medium"
                onClick={() => navigate("/dashboard")}
              >
                <span className="icon">
                  <i className="fas fa-arrow-left"></i>
                </span>
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>

          <div className="navbar-end">
            <div className="navbar-item has-dropdown is-hoverable">
              <div className="navbar-link is-flex is-align-items-center">
                <figure className="image is-32x32 mr-2">
                  <div
                    className="is-rounded has-background-info has-text-white is-flex is-justify-content-center is-align-items-center"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                    }}
                  >
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                </figure>
                <span>{user?.email}</span>
                {admin && <span className="tag ml-2">Admin</span>}
              </div>
              <div className="navbar-dropdown">
                <a className="navbar-item" onClick={() => navigate("/profile")}>
                  <span className="icon">
                    <i className="fas fa-user"></i>
                  </span>
                  <span>Profile</span>
                </a>
                <a className="navbar-item" onClick={() => navigate("/friends")}>
                  <span className="icon">
                    <i className="fas fa-users"></i>
                  </span>
                  <span>Friends</span>
                </a>
                <hr className="navbar-divider" />
                <a
                  className="navbar-item"
                  onClick={async () => {
                    await updateDoc(doc(db, "users", user.uid), {
                      status: "inactive",
                      lastSeen: serverTimestamp(),
                    });
                    await auth.signOut();
                    navigate("/");
                  }}
                >
                  <span className="icon">
                    <i className="fas fa-sign-out-alt"></i>
                  </span>
                  <span>Logout</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div
        style={{
          flex: 1, // Allow the main content to take the remaining space
          display: "flex",
          overflow: "hidden", // Prevent scrolling for the entire layout
          marginTop: "3rem", // Add margin to push content below the navbar
        }}
      >
        {/* Left Sidebar */}
        <div
          className="column is-one-quarter p-4 has-background-light"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflowY: "auto", // Allow scrolling within the sidebar if content overflows
            marginTop: "1rem", // Add margin to avoid overlap with navbar
          }}
        >
          <div>
            <h1 className="title is-4" style={{ display: "flex", alignItems: "center" }}>
              <span className="icon" style={{ marginRight: "8px" }}>
                <i className="fas fa-comments"></i> {/* Generic chat icon for any channel */}
              </span>
              {channel.name}
            </h1>
            <p className="subtitle is-6 mt-3">
              <strong>Channel Owner:</strong> {channel.isDefault ? "Public" : ownerEmail}
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
                className="button is-danger is-fullwidth"
                onClick={leaveChannel}
              >
                <span className="icon">
                  <i className="fas fa-sign-out-alt"></i> {/* Font Awesome icon for leaving */}
                </span>
                <span>Leave Channel</span>
              </button>
            )}
                     </div>
        </div>

        {/* Chat Area */}
        <div
          className={`column ${isSidebarOpen ? "is-two-quarters" : "is-three-quarters"} p-4`}
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%", // Extend to the full height of the page
            overflowY: "hidden", // Prevent scrolling for the entire chat area
          }}
        >
          <div
            className="box"
            style={{
              flex: "1",
              overflowY: "auto", // Allow scrolling within the chat messages
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
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      maxWidth: "60%", // Set a maximum width for the wrapper
                      wordWrap: "break-word",
                    }}
                  >
                    {msg.quotedMessage && (
                      <div
                        style={{
                          backgroundColor: "rgba(128, 128, 128, 0.2)", // Slightly transparent grey
                          borderLeft: "4px solid #3273dc",
                          padding: "0.5rem",
                          fontSize: "0.9rem",
                          color: "#555",
                          borderRadius: "8px 8px 0 0", // Rounded corners only at the top
                          wordWrap: "break-word",
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
                        borderRadius: msg.quotedMessage ? "0 0 12px 12px" : "12px", // Rounded corners only at the bottom if quoted
                        wordWrap: "break-word",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
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
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div
            className="field has-addons"
            style={{
              marginTop: "auto", // Push the message box to the bottom
              backgroundColor: "#f9f9f9",
            }}
          >
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
              right: "10px",
              overflowY: "auto", // Allow scrolling within the sidebar if content overflows
              marginTop: "1rem", // Add margin to avoid overlap with navbar
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
      </div>

      {/* Toggle Sidebar Button */}
      {!channel.isDefault && (
        <button
          className={`button ${!isSidebarOpen ? "is-primary" : "is-danger"}`}
          style={{
            position: "absolute",
            top: "5rem", // Adjust position to avoid overlap with navbar
            right: "10px",
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
      )}

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