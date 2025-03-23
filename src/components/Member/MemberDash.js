import React, { useEffect, useState } from "react";
import { auth, db } from "../../config/firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import NewChannelPrompt from "../dialogPrompts/NewChannelPrompt";
import PublicChannelsPrompt from "../dialogPrompts/PublicChannelsPrompt";
import "../dialogPrompts/Modal.css";

const MemberDash = () => {
  const [user] = useAuthState(auth);
  const [channels, setChannels] = useState([]);
  const [defaultChannels, setDefaultChannels] = useState([]);
  const [privateChannels, setPrivateChannels] = useState([]);
  const [publicChannels, setPublicChannels] = useState([]);
  const [dialogNewChannel, setDialogNewChannel] = useState(false);
  const [dialogJoinChannel, setDialogJoinChannel] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchChannels();
    }
  }, [user, dialogNewChannel]);

  const GoToFriendsList = () => {
    navigate("/Mfriends");
  };

  const GoToChannel = (channel) => {
    navigate(`/channelM/${channel.id}`, { state: { channel } });
  };

  const GoToPrivChannel = (channel) => {
    navigate(`/privchannel/${channel.id}`, { state: { channel } });
  };

  const fetchChannels = async () => {
    if (!user) return;
    const channelRef = collection(db, "channels");
    const q = query(channelRef, where("members", "array-contains", user.email));
    const querySnapshot = await getDocs(q);
    const channelList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setChannels(channelList);

    const pubQuerySnapshot = await getDocs(channelRef);
    const pubChannelList = pubQuerySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setPublicChannels(pubChannelList);

    const qdefault = query(channelRef, where("isDefault", "==", true));
    const defaultQuerySnapshot = await getDocs(qdefault);
    const defaultChannelList = defaultQuerySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setDefaultChannels(defaultChannelList);

    const privChannelRef = collection(db, "privateChannels");
    const qpriv = query(privChannelRef, where("members", "array-contains", user.email));
    const privQuerySnapshot = await getDocs(qpriv);
    const privChannelList = privQuerySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setPrivateChannels(privChannelList);
  };

  const Logout = async () => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    try {
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(),
        status: "inactive", // Set status to inactive on logout
      });
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error during logout:", error);
      alert("Failed to log out properly.");
    }
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
          justifyContent: "space-between",
        }}
      >
        {/* Top Section */}
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>
            Member Dashboard
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

          {/* Create Private Channel Button */}
          <button
            onClick={() => setDialogNewChannel(true)}
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
            Create Private Channel
          </button>

          {/* Join Public Channel Button */}
          <button
            onClick={() => setDialogJoinChannel(true)}
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
            Join Public Channel
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
              </li>
            ))}
          </ul>
        </div>

        {/* Your Channels Section */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>
            Your Channels
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
              </li>
            ))}
          </ul>
        </div>
      </div>

    {/* New Channel Prompt */}
    {dialogNewChannel &&
    createPortal(
      <div className="modal is-active">
        <div className="modal-background" onClick={() => setDialogNewChannel(false)}></div>
        <div className="modal-card">
          <NewChannelPrompt onClose={() => setDialogNewChannel(false)} />
        </div>
      </div>,
      document.body
    )}  

    {dialogJoinChannel &&
      createPortal(
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setDialogJoinChannel(false)}></div>
          <div className="modal-card">
            <PublicChannelsPrompt onClose={() => setDialogJoinChannel(false)} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MemberDash;