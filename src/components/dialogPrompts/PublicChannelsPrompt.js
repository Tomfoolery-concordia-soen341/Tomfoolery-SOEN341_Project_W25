import React, { useEffect, useState } from "react";
import { arrayUnion, collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../config/firebase";
import { useNavigate } from "react-router-dom";
import "./Modal.css"; // Ensure this file contains Bulma modal styles

export default function PublicChannelsPrompt({ onClose }) {
  const [user] = useAuthState(auth);
  const [publicChannels, setPublicChannels] = useState([]);
  const navigate = useNavigate();

  const fetchChannels = async () => {
    const channelRef = collection(db, "channels");
    const pubQuerySnapshot = await getDocs(channelRef);
    const pubChannelList = pubQuerySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setPublicChannels(pubChannelList);
  };

  const GoToChannel = async (channel) => {
    const members = channel.members;
    const check = (element) => element === user.email;

    if (members.some(check)) {
      navigate(`/channelM/${channel.id}`, { state: { channel } });
    } else {
      const channelRef = doc(db, "channels", channel.id);
      await updateDoc(channelRef, {
        request: arrayUnion(user.email),
      });
      alert("Requested to join");
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []); // Add dependency array to avoid unnecessary re-renders

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Public Channels</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body">
          <ul>
            {publicChannels.map((channel) => (
              <li
                key={channel.id}
                className="box"
                style={{
                  cursor: "pointer",
                  marginBottom: "10px",
                  backgroundColor: "#40444b",
                  color: "#fff",
                }}
                onClick={() => GoToChannel(channel)}
              >
                {channel.name}
              </li>
            ))}
          </ul>
        </section>
        <footer className="modal-card-foot">
          <button className="button" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}