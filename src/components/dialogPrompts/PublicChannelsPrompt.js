import {useAuthState} from "react-firebase-hooks/auth";
import {auth, db} from "../../config/firebase";
import React, {useEffect, useState} from "react";
import {arrayUnion, collection, doc, getDocs, updateDoc} from "firebase/firestore";
import { useNavigate } from "react-router-dom";


export default function PublicChannelsPrompt({onClose}) {
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
        //const request = channel.request;
        const check = (element) => element === user.email;
        console.log(members);
        if(members.some(check)) {
            navigate(`/channelM/${channel.id}`, { state: { channel } });
        } else {

            const channelRef = doc(db, "channels", channel.id);
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
            <h3>Public Channels</h3>
            <ul>
                {publicChannels.map((channel) => (
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