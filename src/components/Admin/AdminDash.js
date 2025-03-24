import React, { useEffect, useState } from "react";
import { auth, db } from "../../config/firebase";
import { signOut } from "firebase/auth";
import {doc, getDocs, collection, query, where, updateDoc, serverTimestamp,} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { deleteDoc } from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import {createPortal} from "react-dom";
import NewChannelPrompt from "../dialogPrompts/NewChannelPrompt";
import "../dialogPrompts/Modal.css"

const AdminDash = () => {
  const [user] = useAuthState(auth);

  const [channels, setChannels] = useState([]);
  const [defaultChannels, setDefaultChannels] = useState([]);
  const [privateChannels, setPrivateChannels] = useState([]);
  const navigate = useNavigate();
  const [dialogShow, setDialogShow] = useState(false);

  //get channel vars
  const [admin, setAdmin] = useState(false);
  const [owner, setOwner] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [members, setMembers] = useState([]);

  //get channel data
  const fetchRoles = async () => {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.data().role === "admin") {
      setAdmin(true);
    }
  }

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
    }))
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
    fetchRoles()
        .then(r => fetchChannels());
  }, [dialogShow]);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>
        Logged in as: <strong>{user?.email}</strong>
      </p>
      <p>You are an Admin!</p>
      <label>Create a text channel</label>
      <div>
        <button onClick={() => setDialogShow(true)}>
          Create a New Channel
        </button>
        {dialogShow && createPortal(
            <div className = "overlay"><NewChannelPrompt onClose={ () => setDialogShow(false)} /></div>,
            document.body
        )}
      </div>
      <div>
        <h2>Channels</h2>
        <h3>Default Channels</h3>
        <ul>
          {defaultChannels.map((channel) => (
              <li
                  key={channel.id}
                  className="ChannelA"
                  onClick={() => GoToChannel(channel)}
              >
                <button
                    onClick={(e) => {
                      e.stopPropagation();
                      DeleteChannel(channel.id);
                    }}
                >
                  Delete
                </button>
                {channel.name}
              </li>
          ))}
        </ul>
        <h3>Private Channels</h3>
        <ul>
          {privateChannels.map((channel) => (
            <li
              key={channel.id}
              className="ChannelA"
              onClick={() => GoToPrivChannel(channel)}
            >
              {admin || owner ? <button
                  onClick={(e) => {
                    e.stopPropagation();
                    DeleteChannel(channel.id);
                  }}
              >
                Delete
              </button>: null }
              {channel.name}
            </li>
          ))}
        </ul>
        <h3>Public Channels</h3>
        <ul>
          {channels.map((channel) => (
              <li
                  key={channel.id}
                  className="ChannelA"
                  onClick={() => GoToChannel(channel)}
              >
                <button
                    onClick={(e) => {
                      e.stopPropagation();
                      DeleteChannel(channel.id);
                    }}
                >
                  Delete
                </button>
                {channel.name}
              </li>
          ))}
        </ul>
      </div>
      <div>
        <h1>Access your Friends list!</h1>
        <button onClick={GoToFriendsList}>Go to Friends List</button>
      </div>
      <button onClick={Logout}>Log out</button>
    </div>
  );
};

export default AdminDash;
