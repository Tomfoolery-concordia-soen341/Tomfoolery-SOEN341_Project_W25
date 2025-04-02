import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../config/firebase";
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function PublicChannelsPrompt({ onClose }) {
  const [user] = useAuthState(auth);
  const [privateChannels, setPrivateChannels] = useState([]);
  const navigate = useNavigate();

  const requestToJoinChannel = async (channel) => {
    const members = channel.members;
    const isMember = members.includes(user.email);

    if (isMember) {
      navigate(`/channelM/${channel.id}`, { state: { channel } });
    } else {
      const channelRef = doc(db, "privateChannels", channel.id);
      await updateDoc(channelRef, {
        request: arrayUnion(user.email),
      });

      alert("Request to join sent!");
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "privateChannels"), (snapshot) => {
      const filteredChannels = snapshot.docs
        .filter((doc) => !doc.data().members?.includes(user.email))
        .map((doc) => ({ id: doc.id, ...doc.data() }));
      setPrivateChannels(filteredChannels);
    });

    return () => unsubscribe();
  }, [user.email]);

  return (
    <div className="modal is-active">
      <div
        className="modal-background"
        onClick={onClose}
        style={{
          backgroundColor: "rgba(128, 128, 128, 0.5)", // Semi-transparent grey
        }}
      ></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Request to Join Private Channels</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body">
          <h3 className="title is-5">Available Private Channels</h3>
          <ul>
            {privateChannels.length > 0 ? (
              privateChannels.map((channel) => (
                <li
                  key={channel.id}
                  className="box"
                  style={{
                    cursor: "pointer",
                    padding: "10px",
                    marginBottom: "10px",
                  }}
                  onClick={() => requestToJoinChannel(channel)}
                >
                  {channel.name}
                </li>
              ))
            ) : (
              <p>No private channels available to join.</p>
            )}
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