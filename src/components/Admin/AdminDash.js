import React, { useEffect, useState } from "react";
import { auth, db } from "../../config/firebase";
import { signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import NewChannelPrompt from "../dialogPrompts/NewChannelPrompt";
import "../dialogPrompts/Modal.css";

const AdminDash = () => {
  const [user] = useAuthState(auth);
  const [channels, setChannels] = useState([]);
  const [defaultChannels, setDefaultChannels] = useState([]);
  const [privateChannels, setPrivateChannels] = useState([]);
  const navigate = useNavigate();
  const [dialogShow, setDialogShow] = useState(false);

  // Fetch all channels from Firestore
  const fetchChannels = async () => {
    const channelRef = collection(db, "channels");
    const qndefault = query(channelRef, where("isDefault", "!=", true));
    const querySnapshot = await getDocs(channelRef);
    const channelList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setChannels(channelList);

    const qdefault = query(channelRef, where("isDefault", "==", true));
    const defaultQuerySnapshot = await getDocs(qdefault);
    const defaultChannelList = defaultQuerySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setDefaultChannels(defaultChannelList);

    const privChannelRef = collection(db, "privateChannels");
    const privQuerySnapshot = await getDocs(privChannelRef);
    const privChannelList = privQuerySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setPrivateChannels(privChannelList);
  };

  const GoToFriendsList = () => {
    navigate("/Afriends"); // Redirect to the friends list page
  };

  const GoToChannel = (channel) => {
    navigate(`/channelA/${channel.id}`, { state: { channel } });
  };

  const GoToPrivChannel = (channel) => {
    navigate(`/privchannel/${channel.id}`, { state: { channel } });
  };

  const Logout = async () => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    try {
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(), // Optional: update lastSeen on logout
        status: "inactive", // Set status to inactive
      });
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error during logout:", error);
      alert("Failed to log out properly.");
    }
  };

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

    const confirmDelete = window.confirm(
      "Do you really want to delete this channel?"
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "channels", channelId));
      setChannels(channels.filter((channel) => channel.id !== channelId));
      alert("Channel deleted successfully.");
    } catch (error) {
      console.error("Error deleting channel:", error);
      alert("Failed to delete channel.");
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [dialogShow]);

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
          justifyContent: "space-between",
        }}
      >
        {/* Top Section */}
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>
            Admin Dashboard
          </h1>
          <div
            style={{
              backgroundColor: "#40444b",
              padding: "8px",
              borderRadius: "4px",
              marginBottom: "16px",
            }}
          >
            <p style={{ fontSize: "14px", color: "#b9bbbe" }}>
              Logged in as: <strong>{user?.email}</strong>
            </p>
          </div>

          {/* Create Channel Button */}
          <button
            onClick={() => setDialogShow(true)}
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
              marginBottom: "16px",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#677bc4")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#7289da")}
          >
            Create a New Channel
          </button>

          {/* Friends List Button */}
          <button
            onClick={GoToFriendsList}
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
              marginBottom: "16px",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#677bc4")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#7289da")}
          >
            Go to Friends List
          </button>
        </div>

        {/* Bottom Section */}
        <div>
          {/* Logout Button */}
          <button
            onClick={Logout}
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
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#ff4b2b")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#ff416c")}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          padding: "16px",
          backgroundColor: "#36393f",
          overflowY: "auto",
        }}
      >
        {/* Default Channels Section */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>
            Default Channels
          </h2>
          <ul style={{ listStyle: "none", padding: "0" }}>
            {defaultChannels.map((channel) => (
              <li
                key={channel.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#40444b",
                  padding: "8px",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  cursor: "pointer",
                  transition: "background 0.3s ease",
                }}
                onClick={() => GoToChannel(channel)}
                onMouseOver={(e) => (e.target.style.backgroundColor = "#4f545c")}
                onMouseOut={(e) => (e.target.style.backgroundColor = "#40444b")}
              >
                <span>{channel.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    DeleteChannel(channel.id);
                  }}
                  style={{
                    backgroundColor: "#ff416c",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "background 0.3s ease",
                  }}
                  onMouseOver={(e) => (e.target.backgroundColor = "#ff4b2b")}
                  onMouseOut={(e) => (e.target.backgroundColor = "#ff416c")}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Private Channels Section */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>
            Private Channels
          </h2>
          <ul style={{ listStyle: "none", padding: "0" }}>
            {privateChannels.map((channel) => (
              <li
                key={channel.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#40444b",
                  padding: "8px",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  cursor: "pointer",
                  transition: "background 0.3s ease",
                }}
                onClick={() => GoToPrivChannel(channel)}
                onMouseOver={(e) => (e.target.style.backgroundColor = "#4f545c")}
                onMouseOut={(e) => (e.target.style.backgroundColor = "#40444b")}
              >
                <span>{channel.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    DeleteChannel(channel.id);
                  }}
                  style={{
                    backgroundColor: "#ff416c",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "background 0.3s ease",
                  }}
                  onMouseOver={(e) => (e.target.backgroundColor = "#ff4b2b")}
                  onMouseOut={(e) => (e.target.backgroundColor = "#ff416c")}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Public Channels Section */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>
            Public Channels
          </h2>
          <ul style={{ listStyle: "none", padding: "0" }}>
            {channels.map((channel) => (
              <li
                key={channel.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#40444b",
                  padding: "8px",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  cursor: "pointer",
                  transition: "background 0.3s ease",
                }}
                onClick={() => GoToChannel(channel)}
                onMouseOver={(e) => (e.target.style.backgroundColor = "#4f545c")}
                onMouseOut={(e) => (e.target.style.backgroundColor = "#40444b")}
              >
                <span>{channel.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    DeleteChannel(channel.id);
                  }}
                  style={{
                    backgroundColor: "#ff416c",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "background 0.3s ease",
                  }}
                  onMouseOver={(e) => (e.target.backgroundColor = "#ff4b2b")}
                  onMouseOut={(e) => (e.target.backgroundColor = "#ff416c")}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* New Channel Prompt */}
      {dialogShow &&
        createPortal(
          <div className="overlay">
            <NewChannelPrompt onClose={() => setDialogShow(false)} />
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminDash;