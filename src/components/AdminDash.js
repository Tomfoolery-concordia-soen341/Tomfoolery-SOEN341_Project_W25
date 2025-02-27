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

const AdminDash = () => {
  const [user] = useAuthState(auth);
  const [channels, setChannels] = useState([]); // State to store the list of channels
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
    navigate(`/channel/${channel.id}`, { state: { channel } });
  };
  const Logout = () => {
    navigate("/");
  };
  useEffect(() => {
    fetchChannels();
  }, []);

  const DeleteChannel = async function (channel) {

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);


    if (!userSnap.exists() || !userSnap.data().isAdmin) {
      alert("You do not have permission to delete this channel");
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to delete this channel?");
    if (confirmDelete)
      return;

    const channelRef = collection(db, "channels");
    const q = query(channelRef, where("id", "==", channel));

    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        alert("Channel not found");
        return;
      }

      const channelDoc = querySnapshot.docs[0];
      await deleteDoc(doc(db, "channels", channelDoc.id));
      setChannels(channels.filter((c) => c.id !== channelDoc.id));

    } catch (error) {
      console.error("Error deleting channel", error);
    }
  }

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
            <li
              key={channel.id}
              className="Channel"
              onClick={() => GoToChannel(channel)
              }>
             <button onClick={() => DeleteChannel(channel.id)}>Delete</button> 
              {channel.name}
            </li>
          ))}
        </ul>
      </div>
      <button onClick={Logout}>Log out</button>
    </div>
  );
};

export default AdminDash;