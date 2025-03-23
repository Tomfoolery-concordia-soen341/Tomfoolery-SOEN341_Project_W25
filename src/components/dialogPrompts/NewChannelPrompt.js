import React, { useEffect, useState } from "react";
import { addDoc, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

export default function NewChannelPrompt({ onClose }) {
  const [user] = useAuthState(auth);
  const [admin, setAdmin] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [def, setDef] = useState(false);
  const [error, setError] = useState("");

  const CreateChannel = async () => {
    if (!channelName.trim()) {
      setError("Channel name cannot be empty.");
      return;
    }

    try {
      const channelRef = collection(db, "channels");
      const q = query(channelRef, where("name", "==", channelName));
      const querySnapshot = await getDocs(q);

      const privChannelRef = collection(db, "privateChannels");
      const p = query(privChannelRef, where("name", "==", channelName));
      const privQuerySnapshot = await getDocs(p);

      // Check if the channel name already exists
      if (!querySnapshot.empty || !privQuerySnapshot.empty) {
        setError("A channel with this name already exists.");
        return;
      }

      // Create a regular channel (admin only)
      if (!privacy && admin) {
        await addDoc(channelRef, {
          name: channelName,
          members: [user.email],
          isDefault: def,
        });
        alert("Public channel created successfully!");
      }
      // Create a private channel
      else if (privacy || !admin) {
        await addDoc(privChannelRef, {
          name: channelName,
          owner: user.email,
          members: [user.email],
        });
        alert("Private channel created successfully!");
      }

      // Reset form and close modal
      setChannelName("");
      setPrivacy(false);
      setDef(false);
      setError("");
      onClose();
    } catch (err) {
      console.error("Error creating channel:", err);
      setError("Failed to create channel. Please try again.");
    }
  };

  const checkAdmin = async () => {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists() && userDoc.data().role === "admin") {
      setAdmin(true);
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []); // Run only once on mount

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Create New Channel</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body">
          {error && (
            <div className="notification is-danger">
              {error}
            </div>
          )}
          <div className="field">
            <label className="label">Channel Name</label>
            <div className="control">
              <input
                className="input"
                type="text"
                placeholder="Enter Channel Name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />
            </div>
          </div>
          {admin && (
            <div className="field">
              <div className="control">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={privacy}
                    onChange={(e) => setPrivacy(e.target.checked)}
                  />
                  {" "}Private
                </label>
              </div>
              {!privacy && (
                <div className="control">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={def}
                      onChange={(e) => setDef(e.target.checked)}
                    />
                    {" "}Default Channel
                  </label>
                </div>
              )}
            </div>
          )}
        </section>
        <footer className="modal-card-foot">
          <button className="button is-success" onClick={CreateChannel}>
            Save
          </button>
          <button className="button" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}