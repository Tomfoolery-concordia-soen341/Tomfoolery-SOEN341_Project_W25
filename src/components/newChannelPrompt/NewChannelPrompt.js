import React, {useState} from "react";
import {addDoc, collection, getDocs, query, where} from "firebase/firestore";
import {db} from "../../config/firebase";
import "./Modal.css"

export default function NewChannelPrompt({onClose}) {
    const [channelName, setChannelName] = useState("");
    const [privacy, setPrivacy] = useState(false);

    const CreateChannel = async () => {
        if (channelName) {
            const channelRef = collection(db, "channels");
            const q = query(channelRef, where("name", "==", channelName));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                const newChannel = await addDoc(channelRef, {
                    name: channelName,
                    members: [], // Initialize with an empty members array
                    isPrivate: privacy,
                });
            } else {
                alert("Channel already exists");
            }
        }
    };

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
                <div>
                    <label>
                        Private
                        <input value = {privacy} type = "checkbox" onChange={(e) => setPrivacy(e.target.checked)} />
                    </label>
                </div>
            </p>
            <div>
                <button onClick={() => {CreateChannel(); onClose();}}>Save</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};