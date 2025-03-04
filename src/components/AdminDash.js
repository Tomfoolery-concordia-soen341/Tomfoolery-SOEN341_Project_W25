import React, { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { signOut } from "firebase/auth";
import { doc, getDocs,  addDoc, collection, query, where,} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { deleteDoc } from "firebase/firestore";
import { getDoc } from "firebase/firestore";


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
    navigate(`/channelA/${channel.id}`, { state: { channel } });
  };
  const Logout = () => {
    signOut(auth).then(() => navigate("/"));
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

    const confirmDelete = window.confirm("do you really want to delete this channel?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "channels", channelId)); // Delete the specific channel
      setChannels(channels.filter((channel) => channel.id !== channelId));
      alert("Channel deleted successfully.");
    } catch (error) {
      console.error("Error deleting channel:", error);
      alert("Failed to delete channel.");
    }
  };
  useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Logged in as: <strong>{user?.email}</strong></p>
      <p>You are an Admin!</p>
      <label>Create a text channel</label>
      <button onClick={CreateChannel}>Create</button>
      <div>
        <h2>Channels</h2>
        <ul>
          {channels.map((channel) => (
              <li
                  key={channel.id}
                  className="ChannelA"
                  onClick={() => GoToChannel(channel)}
              >
                <button onClick={(e) => {
                  e.stopPropagation();
                  DeleteChannel(channel.id);
                }}>Delete
                </button>
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