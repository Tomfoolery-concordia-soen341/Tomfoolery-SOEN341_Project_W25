import React, {useState, useEffect, useRef} from "react";
import { useLocation } from "react-router-dom";
import {doc, updateDoc, arrayUnion, getDoc, collection, orderBy, getDocs, onSnapshot, addDoc, serverTimestamp, arrayRemove, query} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import {auth, db} from "../../config/firebase";
import { useNavigate } from "react-router-dom";
import { deleteDoc } from "firebase/firestore";
import "../Dashboard/Dashboard.css"

const PrivateChannel = () => {
    const { state } = useLocation();
    const { channel } = state;
    const [user] = useAuthState(auth);
    //boolean values for private channel control
    const [admin, setAdmin] = useState(false);
    const [owner, setOwner] = useState(false);
    const [ownerEmail, setOwnerEmail] = useState("");
    const [members, setMembers] = useState([]);

    //list of all users to add
    const [allUsers, setAllUsers] = useState([]);
    //selected members on dropdown
    const [selectedMember, setSelectedMember] = useState("");
    //return function
    const navigate = useNavigate();
    //message handling
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const chatEndRef = useRef(null);

    //request handling
    const [requestToUpdate, setRequestToUpdate] = useState(false);
    const [requests, setRequests] = useState([]);

    // Fetch the channel's data
    const fetchChannelData = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.data().role === "admin") {
            setAdmin(true);
        }

        const channelSnap = await getDoc(doc(db, "privateChannels", channel.id));
        if (channelSnap.exists()) {
            const channelData = channelSnap.data();
            console.log("Channel data:", channelData); // Log the entire channel data
            setMembers(channelData.members || []);
            setOwnerEmail(channelData.owner);
            setRequests(channelData.request || []); // Fetch the requests field
            console.log("Requests:", channelData.request); // Log the requests field
        }
        if (channelSnap.data().owner === user.email) {
            setOwner(true);
        } else {
            setOwner(false);
        }
    }

    useEffect(() => {
        chatEndRef.current.scrollIntoView({behavior: "smooth"});
    }, [messages]);

    // Fetch all users
    const fetchUsers = async () => {
        const querySnapshot = await getDocs(collection(db, "users"));
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
        await updateDoc(doc(db, "privateChannels", channel.id), {
            members: arrayUnion(selectedMember), // Add the selected member to Firestore
        });

        setMembers((prev) => [...prev, selectedMember]); // Update local members state
        setSelectedMember(""); // Clear dropdown
        alert(`Added ${selectedMember} to ${channel.name}`);
    };

    // Listen for chat messages
    const GetMessages = () => {
        const sorter = query(collection(db, "privateChannels", channel.id, "messages"), orderBy("timestamp"));
        onSnapshot(sorter, (snapshot) => {
            const messagesData = snapshot.docs.map((doc) => ({
                id: doc.id, // Include the document ID
                ...doc.data(), // Include the document data
            }));
            setMessages(messagesData); // Update state with messages
        });
    };

    //send message function
    const sendMessage = async () => {
        if (!newMessage.trim()) return; // if there are no messages.

        //add the new message to the database
        addDoc(collection(db, "privateChannels", channel.id, "messages"), {
            text: newMessage,
            sender: auth.currentUser.email,
            timestamp: serverTimestamp(),
        })
            //after it adds, then it will clear the message
            .then(() => {
                //clear the new message, wait for new one.
                setNewMessage("");
            })
            //error handling
            .catch((error) => {
                console.error("Error sending message:", error);
                alert("Failed to send message.");
            });
    };

    //leave the channel, meaning you won't be able to get back for free.
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

        await updateDoc(doc(db, "privateChannels", channel.id), {members: arrayRemove(user.email)})
            .then(() => {BackToDashboard()})

    }

    //delete message function
    const DeleteMessage = async (message) => {
        //exception handling
        if (!message || !channel) {
            console.log("Message or channel is invalid:", message, channel);
            alert("Invalid message or channel ID.");
            return;
        }

        //console check
        console.log("Message ID to delete:", message.id);

        //pop-up message yes or no
        const confirmDelete = window.confirm("Delete this message?");

        //if no, return
        if (!confirmDelete) return;

        //if yes, try to delete
        try {
            //delete message from database
            await deleteDoc(doc(db, `privateChannels/${channel.id}/messages`, message.id));

            //update the chat
            setMessages(messages.filter((msg) => msg.id !== message.id));

            //confirmation
            alert("Message deleted successfully.");
        } catch (error) {
            //error handling
            console.error("Error deleting message:", error);
            alert("Failed to delete message.");
        }
    };

    const logger = (msg) => {
        console.log (msg)
    }
    //accept requests to join a channel
    const AcceptRequest = async (requester) => {
        //reference
        const channelRef = doc(db, "privateChannels", channel.id);
        //when accepted, will add the user to the channel
        await updateDoc(channelRef, {
            members: arrayUnion(requester),
            request: arrayRemove(requester),
        });
        //confirmation message
        alert(`Accepted ${requester} to ${channel.name}`);
        //wait for another request reset the variable.
        setRequestToUpdate(true);
    }

    //delete requests to a channel
    const DeleteRequest = async (requester) => {
        //update the document of requests, and remove the request
        await updateDoc(doc(db, "privateChannels", channel.id), {
            request: arrayRemove(requester),
        });
        //confirmation
        alert(`Rejected ${requester} request for ${channel.name}`);
        //accept requests again. new requests will show again.
        setRequestToUpdate(true);
    }


    useEffect(() => {
        fetchChannelData()
            .then(() => fetchUsers())
            .then(() => GetMessages())
            .then(() => setRequestToUpdate(false)) //stop updating
            .catch((error) => {
                console.error("Error fetching data:", error);
            });
    }, [requestToUpdate]);


    const BackToDashboard = () => {
        navigate("/Dashboard");
    };
    return (
        <div>
            <h1>{channel.isDefault ? "Public " : "Private "}Channel: {channel.name}</h1>

            {admin ? <div>
                <h3>Owner: {ownerEmail}</h3>
            </div> :
                <div>
                    {channel.isDefault ? null : <button onClick={leaveChannel}>Leave Channel</button>}
                </div>
            }
            {(owner || admin) ? <div>
            <h2>Members</h2>
                <ul style={{listStyleType: "none", padding: 0}}>
                    {members.map((member, index) => (
                        <li key={index}>{member}</li>
                    ))}
                </ul>
            </div> : null
            }

            {(owner || admin) ? <div>
                <h3>Requests</h3>
                <ul style={{listStyleType: "none", padding: 0}}>
                    {requests.map((member, index) => (
                        <li key={index}> {member}
                            {member.name}
                            <button onClick={(e) => {
                                e.stopPropagation();
                                AcceptRequest(member);
                            }}> Accept
                            </button>
                            <button onClick={(e) => {
                                e.stopPropagation();
                                DeleteRequest(member);
                            }}> Delete
                            </button>
                        </li>
                    ))}
                </ul>
            </div> : null}


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
            </div> : null }


            <div>
                <h2>Chat</h2>
                <div className="chat-container">
                    <ul className="chat-window">
                        {messages.map((msg, index) => (
                            <p key={index}>
                                <strong>{msg.sender}:</strong> {msg.text}
                                {(owner || admin) ? <button onClick={() => DeleteMessage(msg)}>Delete</button> : null}
                            </p>
                        ))}
                    </ul>
                </div>
                <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button onClick={sendMessage}>Send</button>
                <div ref={chatEndRef}></div>
            </div>
            <button onClick={BackToDashboard}>Go back to Dashboard</button>
        </div>
    );
};

export default PrivateChannel;