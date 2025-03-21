import React, {useEffect, useState} from "react";
import {addDoc, collection, doc, getDoc, getDocs, query, where} from "firebase/firestore";
import {auth, db} from "../../config/firebase";
import "./Modal.css"
import {useAuthState} from "react-firebase-hooks/auth";

export default function NewChannelPrompt({onClose}) {
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

            //to regular channels
            if (querySnapshot.empty && !privacy && admin) {
                const newChannel = await addDoc(channelRef, {
                    name: channelName,
                    members: [user.email], // Initialize with an empty members array
                    isDefault: def,
                });

            //to private channels
            } else if (privQuerySnapshot.empty && (privacy || !admin)) {
                const newChannel = await addDoc(privChannelRef, {
                    name: channelName,
                    owner: user.email,
                    members: [user.email], // Initialize with an empty members array
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
    }

    useEffect(() => {
        checkAdmin();
    })

    return (
        <div className = "modal">
            <p>
                <div>
                    <label>
                        Channel Name:
                        <input value = {channelName} type = "text" placeholder="Enter Channel Name" onChange={(e) => setChannelName(e.target.value)} />
                    </label>
                </div>
                <p></p>
                { admin ?<div>
                    <div>
                        <label>
                            Private
                            <input value = {privacy} type = "checkbox" onChange={(e) => setPrivacy(e.target.checked)} />
                        </label>
                    </div>
                    {!privacy ? (
                    <div>
                        <label>
                            Default Channel
                            <input value = {def} type = "checkbox" onChange={(e) => setDef(e.target.checked)} />
                        </label>
                    </div>
                    ) : null}
                </div> : null }
            </p>
            <div>
                <button onClick={() => {CreateChannel(); onClose();}}>Save</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};