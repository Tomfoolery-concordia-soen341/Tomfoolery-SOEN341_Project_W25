import {useAuthState} from "react-firebase-hooks/auth";
import {auth, db} from "../../config/firebase";
import React, {useEffect, useState} from "react";
import {arrayUnion, collection, where, doc, getDocs, updateDoc, addDoc, onSnapshot} from "firebase/firestore";
import { useNavigate } from "react-router-dom";


export default function PublicChannelsPrompt({onClose}) {
    const [user] = useAuthState(auth);
    const [privateChannels, setPrivateChannels] = useState([]);
    const navigate = useNavigate();

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
        const unsubscribe = onSnapshot(collection(db, "privateChannels"), (snapshot) => {
            const filteredChannels = snapshot.docs
                .filter((doc) => !doc.data().members?.includes(user.email))
                .map((doc) => ({ id: doc.id, ...doc.data() }));
            setPrivateChannels(filteredChannels);
        });

        return () => unsubscribe();
    }, [user.email])

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