import {useAuthState} from "react-firebase-hooks/auth";
import {auth, db} from "../../config/firebase";
import React, {useEffect, useState} from "react";
import {arrayUnion, collection, doc, getDocs, updateDoc, addDoc} from "firebase/firestore";
import { useNavigate } from "react-router-dom";


export default function PublicChannelsPrompt({onClose}) {
    const [user] = useAuthState(auth);
    const [privateChannels, setPrivateChannels] = useState([]);
    const navigate = useNavigate();

    const fetchChannels = async () => {
        const channelRef = collection(db, "privateChannels");
        const privateQuerySnapshot = await getDocs(channelRef);
        const privateChannelList = privateQuerySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        setPrivateChannels(privateChannelList);
    };

    const GoToChannel = async (channel) => {
        const members = channel.members;
        //const request = channel.request;
        const check = (element) => element === user.email;
        console.log(members);
        if(members.some(check)) {
            navigate(`/channelM/${channel.id}`, { state: { channel } });
        } else {

            const channelRef = doc(db, "privateChannels", channel.id);
            await updateDoc(channelRef, {
                request: arrayUnion(user.email)
            });

            alert("Requested to join");
        }
    };

    useEffect(() => {
        fetchChannels();
    });

    return (
        <div className = "modal">
            <button onClick={onClose}>Close</button>
            <h3>Private Channels</h3>
            <ul>
                {privateChannels.map((channel) => (
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
    )
}