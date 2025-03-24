import React, { useEffect, useState } from "react";
import { auth, db } from "../../config/firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where, doc, updateDoc ,serverTimestamp} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import NewChannelPrompt from "../dialogPrompts/NewChannelPrompt"
import {createPortal} from "react-dom";
import PublicChannelsPrompt from "../dialogPrompts/PublicChannelsPrompt";

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
      fetchChannels().then(r => null);
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
      }))
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
    <div>
      <h1>Dashboard</h1>
      <p>
        Logged in as: <strong>{user?.email}</strong>
      </p>
      You are a Member!
      <div>
        <h2>Channels</h2>
          <h3>Default Channels</h3>
          <ul>
              {defaultChannels.map((channel) => (
                  <li
                      className="Channel"
                      key={channel.id}
                      onClick={() => GoToChannel(channel)}
                  >
                      {channel.name}
                  </li>
              ))}
          </ul>
          <h3>Private Channels</h3>
          <ul>
              {privateChannels.map((channel) => (
                  <li
                      className="Channel"
                      key={channel.id}
                      onClick={() => GoToPrivChannel(channel)}
                  >
                      {channel.name}
                  </li>
              ))}
          </ul>
          <label>Create a private channel</label>
          <div>
              <button onClick={() => setDialogNewChannel(true)}>
                  Create a New Channel
              </button>
              {dialogNewChannel && createPortal(
                  <div className = "overlay"><NewChannelPrompt onClose={ () => setDialogNewChannel(false)} /></div>,
                  document.body
              )}
          </div>
          <h3>Your Channels</h3>
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
          <div>
              <button onClick={() => setDialogJoinChannel(true)}>
                  Join a public channel
              </button>
              {dialogJoinChannel && createPortal(
                  <div className = "overlay"><PublicChannelsPrompt onClose={ () => setDialogJoinChannel(false)} /></div>,
                  document.body
              )}
          </div>
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