import React, {useState, useEffect, useRef} from "react";
import {useLocation} from "react-router-dom";
import {
    doc,
    updateDoc,
    arrayUnion,
    getDoc,
    where,
    collection,
    orderBy,
    getDocs,
    onSnapshot,
    addDoc,
    serverTimestamp,
    arrayRemove,
    query,
} from "firebase/firestore";
import {useAuthState} from "react-firebase-hooks/auth";
import {auth, db} from "../../config/firebase";
import {useNavigate} from "react-router-dom";
import {deleteDoc} from "firebase/firestore";
import "./Channel.css";
import ContextMenu from "../ContextMenu/ContextMenu";
import {format, formatDistanceToNow} from "date-fns";

const Channel = () => {
    const {state} = useLocation();
    const {channel} = state;
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
    const [quotedMessage, setQuotedMessage] = useState(null); // State for quoted message
    const [newMessageNotification, setNewMessageNotification] = useState({
        show: false,
        count: 0
    });

    //request handling
    const [requestToUpdate, setRequestToUpdate] = useState(false);
    const [requests, setRequests] = useState([]);


    //status handling
    const [membersWithStatus, setMembersWithStatus] = useState([]);

    //context menu
    const contextMenuRef = useRef(null);
    const [contextMenu, setContextMenu] = useState({
        position: {
            x: 0,
            y: 0,
        },
        toggled: false,
        message: null, //track the right-clicked message
    });

    // Fetch the channel's data
    const fetchChannelData = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.data().role === "admin") {
            setAdmin(true);
        }

        const channelSnap = await getDoc(doc(db, "channels", channel.id));
        if (channelSnap.exists()) {
            const channelData = channelSnap.data();
            console.log("Channel data:", channelData);

            // Set basic channel data
            const memberEmails = channelData.members || [];
                setMembers(memberEmails);
                setOwnerEmail(channelData.owner);
                setRequests(channelData.request || []);

            // Fetch complete user data for each member
            if (memberEmails.length > 0) {
                // Query all users where email is in our members list
                const usersQuery = query(
                    collection(db, "users"),
                    where("email", "in", memberEmails)
                );

                const querySnapshot = await getDocs(usersQuery);

                // Map through results to get complete user data
                const membersData = querySnapshot.docs.map((doc) => ({
                    id: doc.id, // the random document ID
                    ...doc.data(), // all user data including email, status, etc.
                }));

                // Create a map for quick lookup by email
                const membersMap = {};
                membersData.forEach((member) => {
                    membersMap[member.email] = member;
                });

                // Combine with original member list to maintain order
                const completeMembers = memberEmails.map((email) => ({
                    email,
                    ...(membersMap[email] || {status: "unknown"}), // fallback if user not found
                }));

                setMembersWithStatus(completeMembers);
                console.log("Complete members data:", completeMembers);
            }
        }

        if (channelSnap.data().owner === user.email) {
            setOwner(true);
        } else {
            setOwner(false);
        }
    };

    // Fetch all users
    const fetchUsers = async () => {
        const querySnapshot = await getDocs(collection(db, "users"));
        const users = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        setAllUsers(users);
    };

    //add member function
    const addMember = async () => {
        if (!selectedMember) {
            alert("Please select a member.");
            return;
        }
        await updateDoc(doc(db, "channels", channel.id), {
            members: arrayUnion(selectedMember), // Add the selected member to Firestore
        });

        setMembers((prev) => [...prev, selectedMember]); // Update local members state
        setSelectedMember(""); // Clear dropdown
        alert(`Added ${selectedMember} to ${channel.name}`);
    };

    //get messages for chat
    const GetMessages = () => {
        const sorter = query(
            collection(db, "channels", channel.id, "messages"),
            orderBy("timestamp")
        );


        onSnapshot(sorter, (snapshot) => {
            const messagesData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            console.log(messagesData)
            // Check if new messages arrived
            if (messagesData.length > messages.length) {
                const lastMessage = messagesData[messagesData.length - 1];

                // Only notify if message isn't from current user
                if (lastMessage.sender !== user.email) {
                    setNewMessageNotification(prev => ({
                        show: true,
                        count: prev.count + 0.5
                    }));
                }
            }
            setMessages(messagesData);
        });
    };

    //send message function
    const sendMessage = async () => {
        if (!newMessage.trim()) return; // if there are no messages.

        // Get the current user's data to include username
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        //add the new message to the database
        addDoc(collection(db, "channels", channel.id, "messages"), {
            text: newMessage,
            sender: auth.currentUser.email,
            senderUsername: userData.displayName,
            timestamp: serverTimestamp(),
            quotedMessage: quotedMessage
                ? {
                    sender: quotedMessage.sender,
                    senderUsername: quotedMessage.senderUsername, // Include username in quoted message
                    text: quotedMessage.text,
                }
                : null, // Include quoted message details
        })
            //after it adds, then it will clear the message
            .then(() => {
                //clear the new message, wait for new one.
                setNewMessage("");
                setQuotedMessage(null); // Clear quoted message after sending
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
                "Do you want to leave this channel? This action will not delete the channel."
            );
            if (!confirm) return;
        } else {
            const confirm = window.confirm("Do you want to leave this channel?");
            if (!confirm) return;
        }

        await updateDoc(doc(db, "channels", channel.id), {
            members: arrayRemove(user.email),
        }).then(() => {
            BackToDashboard();
        });
    };

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
            await deleteDoc(
                doc(db, `channel/${channel.id}/messages`, message.id)
            );

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

    //accept requests to join a channel
    const AcceptRequest = async (requester) => {
        //reference
        const channelRef = doc(db, "channels", channel.id);
        //when accepted, will add the user to the channel
        await updateDoc(channelRef, {
            members: arrayUnion(requester),
            request: arrayRemove(requester),
        });
        //confirmation message
        alert(`Accepted ${requester} to ${channel.name}`);
        //wait for another request reset the variable.
        setRequestToUpdate(true);
    };

    //delete requests to a channel
    const DeleteRequest = async (requester) => {
        //update the document of requests, and remove the request
        await updateDoc(doc(db, "channels", channel.id), {
            request: arrayRemove(requester),
        });
        //confirmation
        alert(`Rejected ${requester} request for ${channel.name}`);
        //accept requests again. new requests will show again.
        setRequestToUpdate(true);
    };
    //context menu
    const resetContextMenu = () => {
        setMessages((prevMessages) =>
            prevMessages.map((message) => ({
                ...message,
                selected: false, // Remove highlight from all messages
            }))
        );

        setContextMenu({
            position: {
                x: 0,
                y: 0,
            },
            toggled: false,
            message: null, // Clear the right-clicked message
        });
    };
    const handleOnContextMenu = (e, rightClick) => {
        e.preventDefault();

        if (!contextMenuRef.current) {
            console.error("Context menu ref is not assigned.");
            return;
        }

        const contextMenuAttr = contextMenuRef.current.getBoundingClientRect();
        const isLeft = e.clientX < window?.innerWidth / 2;
        let x;
        let y = e.clientY;

        if (isLeft) {
            x = e.clientX;
        } else {
            x = e.clientX - contextMenuAttr.width;
        }

        setContextMenu({
            position: {
                x,
                y,
            },
            toggled: true,
            message: rightClick, // Pass the right-clicked message
        });

        // Update the messages state to highlight the selected message
        setMessages((prevMessages) =>
            prevMessages.map((message) => ({
                ...message,
                selected: message.id === rightClick.id, // Highlight the selected message
            }))
        );

        console.log("Context menu toggled:", true); // Debug log
        console.log("Right-clicked item:", rightClick);
    };

    //status
    const formatLastSeen = (timestamp, status) => {
        if (status === "active") return "Online";
        if (!timestamp) return "Offline";
        const date = timestamp.toDate();
        return `Last seen: ${formatDistanceToNow(date, {addSuffix: true})}`;
    };
    const isOnline = (status) => {
        return status === "active";
    };

    //context menu toggling
    useEffect(() => {
        function handler(e) {
            if (
                contextMenuRef.current &&
                !contextMenuRef.current.contains(e.target)
            ) {
                resetContextMenu();
            }
        }

        document.addEventListener("click", handler);
        return () => {
            document.removeEventListener("click", handler);
        };
    }, [contextMenu.toggled]);

    //update when there is a request
    useEffect(() => {
        fetchChannelData()
            .then(() => fetchUsers())
            .then(() => GetMessages())
            .then(() => setRequestToUpdate(false)) //stop updating
            .catch((error) => {
                console.error("Error fetching data:", error);
            });
    }, [requestToUpdate]);

    //return function
    const BackToDashboard = () => {
        navigate("/Dashboard");
    };

    //sending time
    const formatMessageTime = (timestamp: any) => {
        if (!timestamp) return 'Sending...';
        try {
            return (" ") + format(timestamp?.toDate(), 'y')  + ("-") +
                           format(timestamp?.toDate(), 'MM') + ("-") +
                           format(timestamp?.toDate(), 'dd') + (" ") +
                           format(timestamp?.toDate(), 'h:mm a');
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="channel-layout">
            {/* left is channel info */}
            <div className="channel-info-column">
                <div className="channel-info">
                    <h1>{channel.isDefault ? "Public " : "Private "}Channel:  <br/>{channel.name} </h1>
                    {(admin && !channel.isDefault) && <div className="owner-info">Owner: {ownerEmail}</div>}
                        <div style={{'font-size':'23px'}}> Be careful to not share and personal information such as your password! </div>
                    {!admin && !channel.isDefault && (
                        <button className="leave-channel-btn" onClick={leaveChannel}>
                            Leave Channel
                        </button>
                    )}

                    {(owner) && requests.length > 0 && (
                        <div className="requests-section">
                            <h3>Requests</h3>
                            <ul className="requests-list">
                                {requests.map((member, index) => (
                                    <li key={index}>
                                        {member.name}
                                        <div className="request-actions">
                                            <button
                                                className="accept-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    AcceptRequest(member);
                                                }}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className="delete-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    DeleteRequest(member);
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {(owner) && (
                        <div className="add-member-section">
                            <h3>Add Member</h3>
                            <div className="member-selector">
                                <select
                                    value={selectedMember}
                                    onChange={(e) => setSelectedMember(e.target.value)}
                                    className="member-dropdown"
                                >
                                    <option value="">Select a member</option>
                                    {allUsers
                                        .filter((user) => !members.includes(user.email))
                                        .map((user) => (
                                            <option key={user.id} value={user.email}>
                                                {user.email}
                                            </option>
                                        ))}
                                </select>
                                <button className="add-member-btn" onClick={addMember}>
                                    Add Member
                                </button>
                            </div>
                        </div>
                    )}

                    <button className="back-btn" onClick={BackToDashboard}>
                        Go back to Dashboard
                    </button>
                </div>
            </div>

            {/* middle is chat */}
            <div className="channel-chat-column">
                <div className="chat-area">
                    <ul className="scrollable-content chat-window">
                        {messages.map((msg, index) => (
                            <li
                                key={index}
                                onContextMenu={(e) => handleOnContextMenu(e, msg)}
                                className={`message ${msg.selected ? "selected" : ""}`}
                            >
                                <strong>{msg.senderUsername}</strong>
                               <t style={{'font-size':'13px'}}> {formatMessageTime(msg.timestamp)}</t>
                                <div >{msg.text}</div>
                                {msg.quotedMessage && (
                                    <div className="reply-message">
                                        <strong>Replying to {msg.quotedMessage.senderUsername}</strong>
                                        <div> {msg.quotedMessage.text}</div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>

                    {quotedMessage && (
                        <div className="reply-message-preview">
                            <p>
                                <strong>Replying to</strong>
                                <div>
                                    {quotedMessage.sender}: {quotedMessage.text}
                                </div>
                            </p>
                            <button
                                style = {{background: '#e8acac'}}
                                onClick={() => setQuotedMessage(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    {newMessageNotification.show && (
                        <div
                            className="new-message-notification"
                            onClick={() => {
                                setNewMessageNotification({ show: false, count: 0 });
                            }}
                        >
                            {newMessageNotification.count} new message(s) ↓
                        </div>
                    )}
                    <div className="message-input-container">
                        <input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="message-input"
                        />
                        <button className="send-btn" onClick={sendMessage}>
                            Send
                        </button>
                    </div>


                    <div ref={chatEndRef}></div>
                </div>
            </div>
            {/* on the right is the membersl */}
            <div className="channel-members-column">
                <div className="members-section">
                    <h2>Members</h2>
                    <ul className="scrollable-content members-list">
                        {membersWithStatus.map((member, index) => (
                            <div key={index} className="member-card">
                <span
                    className={`status-indicator ${
                        isOnline(member.status) ? "status-online" : "status-offline"
                    }`}
                ></span>
                                <div className="user-info">
                                    <span className="username">{member.displayName}</span>
                                    {/*<span className="user-role">{user.role}</span>*/}
                                </div>
                                <div className="user-status">
                                    {isOnline(member.status)
                                        ? "Online"
                                        : formatLastSeen(member.lastSeen, member.status)}
                                </div>
                            </div>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Context Menu (no changes needed here) */}
            <ContextMenu
                contextMenuRef={contextMenuRef}
                isToggled={contextMenu.toggled}
                positionX={contextMenu.position.x}
                positionY={contextMenu.position.y}
                buttons={[
                    {
                        text: "Reply",
                        icon: "",
                        onClick: () => {
                            setQuotedMessage({
                                sender: contextMenu.message.sender,
                                senderUsername: contextMenu.message.senderUsername,
                                text: contextMenu.message.text
                            });
                            resetContextMenu();
                        },
                        isSpacer: false,
                    },
                    {
                        text: "Delete Message",
                        icon: "",
                        onClick: () => {
                            DeleteMessage(contextMenu.message).then(() => resetContextMenu());
                        },
                        isSpacer: false,
                        show: admin,
                    },
                ]}
            />
        </div>
    );
};

export default Channel;
