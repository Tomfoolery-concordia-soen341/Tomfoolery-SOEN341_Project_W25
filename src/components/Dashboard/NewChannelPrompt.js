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

  const CreateChannel = async () => {
    if (channelName) {
      const channelRef = collection(db, "channels");
      const q = query(channelRef, where("name", "==", channelName));
      const querySnapshot = await getDocs(q);

      const privChannelRef = collection(db, "privateChannels");
      const p = query(privChannelRef, where("name", "==", channelName));
      const privQuerySnapshot = await getDocs(p);

      // To regular channels
      if (querySnapshot.empty && !privacy && admin) {
        await addDoc(channelRef, {
          name: channelName,
          members: [user.email],
          isDefault: def,
        });
      // To private channels
      } else if (privQuerySnapshot.empty && (privacy || !admin)) {
        await addDoc(privChannelRef, {
          name: channelName,
          owner: user.email,
          members: [user.email],
        });
      } else {
        alert("Channel already exists");
      }
    }
  };

  const checkAdmin = async () => {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.data().role === "admin") {
      setAdmin(true);
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  return (
    <div className="modal is-active">
      <div
        className="modal-background"
        onClick={onClose}
        style={{
          backgroundColor: "rgba(190, 179, 179, 0.43)", // Semi-transparent grey
        }}
      ></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Create New Channel</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body">
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
            <>
              <div className="field">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={privacy}
                    onChange={(e) => setPrivacy(e.target.checked)}
                  />
                  &nbsp; Private
                </label>
              </div>
              {!privacy && (
                <div className="field">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={def}
                      onChange={(e) => setDef(e.target.checked)}
                    />
                    &nbsp; Public Channel
                  </label>
                </div>
              )}
            </>
          )}
        </section>
        <footer className="modal-card-foot">
          <button
            className="button is-success"
            onClick={() => {
              CreateChannel();
              onClose();
            }}
          >
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