import React, { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where, doc, updateDoc ,serverTimestamp} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";

const MemberDash = () => {
  const [user] = useAuthState(auth);
  const [channels, setChannels] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchChannels();
    }
  }, [user]);

  const GoToFriendsList = () => {
    navigate("/Mfriends");
  };

  const GoToChannel = (channel) => {
    navigate(`/channelM/${channel.id}`, { state: { channel } });
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
    <div>
      <h1>Dashboard</h1>
      <p>
        Logged in as: <strong>{user?.email}</strong>
      </p>
      You are a Member!
      <div>
        <h2>Channels</h2>
        <ul>
          {channels.map((channel) => (
            <li
              className="Channel"
              key={channel.id}
              onClick={() => GoToChannel(channel)}
            >
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

export default MemberDash;