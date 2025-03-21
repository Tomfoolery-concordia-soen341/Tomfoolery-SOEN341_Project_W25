import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
    doc,
    updateDoc,
    arrayUnion,
    getDoc,
    collection,
    getDocs,
    onSnapshot,
    addDoc,
    serverTimestamp,
    query,
    arrayRemove
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import {auth, db} from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { deleteDoc } from "firebase/firestore";

const PrivateChannel = () => {
    const { state } = useLocation();
    const { channel } = state;
    const [user] = useAuthState(auth);
    const [admin, setAdmin] = useState(false);
    const [owner, setOwner] = useState(false);
    const [ownerEmail, setOwnerEmail] = useState("");
    const [members, setMembers] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // List of all users
    const [selectedMember, setSelectedMember] = useState(""); // Selected member from dropdown
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");


    // Fetch the channel's data
    const fetchChannelData = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.data().role === "admin") {
            setAdmin(true);
        }

        const channelRef = doc(db, "privateChannels", channel.id);
        const channelSnap = await getDoc(channelRef);
        if (channelSnap.exists()) {
            setMembers(channelSnap.data().members || []);
            setOwnerEmail(channelSnap.data().owner);
        }
        if (channelSnap.data().owner === user.email) {
            setOwner(true);
        } else {
            setOwner(false);
        }
    }

    // Fetch all users
    const fetchUsers = async () => {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        const users = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        setAllUsers(users);
    };

    // Add a member to the channel
    const addMember = async () => {
        if (!selectedMember) {
            alert("Please select a member.");
            return;
        }

        const channelRef = doc(db, "privateChannels", channel.id);
        await updateDoc(channelRef, {
            members: arrayUnion(selectedMember), // Add the selected member to Firestore
        });

        setMembers((prev) => [...prev, selectedMember]); // Update local members state
        setSelectedMember(""); // Clear dropdown
        alert(`Added ${selectedMember} to ${channel.name}`);
    };
    // Listen for chat messages
    const retrieveMessages = () => {
        const messagesRef = collection(db, "privateChannels", channel.id, "messages");

        onSnapshot(messagesRef, (snapshot) => {
            const messagesData = snapshot.docs.map((doc) => ({
                id: doc.id, // Include the document ID
                ...doc.data(), // Include the document data
            }));
            setMessages(messagesData); // Update state with messages
        });
    };

    // Send message
    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        const messagesRef = collection(db, "privateChannels", channel.id, "messages");
        await addDoc(messagesRef, {
            text: newMessage,
            sender: auth.currentUser.email,
            timestamp: serverTimestamp(),
        });

        setNewMessage(""); // Clear input after sending
    };

    const leaveChannel = async () => {
        if (owner) {
            const confirm = window.confirm(
                "Do you want to leave this channel? This action will not delete the channel.",
            );
            if (!confirm) return;
        } else {
            const confirm = window.confirm(
                "Do you want to leave this channel?",
            );
            if (!confirm) return;
        }


        const channelRef = doc(db, "privateChannels", channel.id);
        await updateDoc(channelRef, {members: arrayRemove(user.email)})
            .then(() => {BackToDashboard()})

    }

    useEffect(() => {
        fetchChannelData();
        fetchUsers(); // Fetch the list of users
        sendMessage();
        retrieveMessages();
    }, []);

    const BackToDashboard = () => {
        if (admin) {
            navigate("/Admin");
        } else {
            navigate("/Member");
        }
    };

    return (
        <div>
            <h1>Private Channel: {channel.name}</h1>

            {admin ? <div>
                <h3>Owner: {ownerEmail}</h3>
            </div> : <div>
                <button onClick = {leaveChannel}>Leave Channel</button>
            </div> }

            {(owner || admin) ? <div>
                <h2>Members</h2>
                <ul style={{listStyleType: "none", padding: 0}}>
                    {members.map((member, index) => (
                        <li key={index}>{member}</li>
                    ))}
                </ul>
            </div> : null }

            {(owner || admin) ? <div>
                <h3>Add Member</h3>
                <div>
                    <select
                        value={selectedMember}
                        onChange={(e) => setSelectedMember(e.target.value)}
                    >
                        <option value="">Select a member</option>
                        {allUsers
                            .filter((user) => !members.includes(user.email)) // Filter out already-added members
                            .map((user) => (
                                <option key={user.id} value={user.email}>
                                    {user.email}
                                </option>
                            ))}
                    </select>
                    <button onClick={addMember}>Add Member</button>
                </div>
                <button onClick={BackToDashboard}>Go back to Dashboard</button>
            </div> : null }

            {/* Chat Section */}
            <div>
                <h2>Chat</h2>
                <div className="chat-window">
                    {messages.map((msg, index) => (
                        <p key={index}>
                            <strong>{msg.sender}:</strong> {msg.text}
                        </p>
                    ))}
                </div>
                <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button onClick={sendMessage}>Send</button>
            </div>
            <button onClick={BackToDashboard}>Go back to Dashboard</button>
        </div>
    );
};

export default PrivateChannel;