import React, {useEffect, useState, useRef} from "react";
import {auth, db} from "../../config/firebase";
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    arrayUnion,
    addDoc,
    orderBy,
    onSnapshot,
    serverTimestamp,
    arrayRemove,
} from "firebase/firestore";
import {useAuthState} from "react-firebase-hooks/auth";
import {useNavigate} from "react-router-dom";
import {formatDistanceToNow} from "date-fns";
import ContextMenu from "../ContextMenu/ContextMenu";
import "../ContextMenu/ContextMenu.css";
import "./FriendList.css";

const styles = {
    statusDot: {
        height: "10px",
        width: "10px",
        borderRadius: "50%",
        display: "inline-block",
        marginRight: "5px",
    },
    online: {
        backgroundColor: "green",
    },
    offline: {
        backgroundColor: "red",
    },
};

const FriendList = () => {
    //user authentication
    const [user] = useAuthState(auth);

    //searching
    const [searchEmail, setSearchEmail] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const searchUsers = async () => {
        if (!searchEmail.trim()) return;
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", searchEmail));
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        setSearchResults(results);
    };
    const closeSearch = () => {
        setSearchResults([]);
        setSearchEmail("");
    };

    //friends
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
    //update friend list when a user gets to the page
    useEffect(() => {
        updateLastSeen()
            .then(r => fetchFriends())
    }, [user]);

    //friend handling
    const fetchFriends = async () => {
        if (!user) return;
        const userSnapshot = await getDocs(
            query(collection(db, "users"), where("email", "==", user.email))
        );
        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            const friendEmails = userData.friends || [];

            if (friendEmails.length > 0) {
                const friendsQuery = query(collection(db, "users"), where("email", "in", friendEmails));
                const friendsSnapshot = await getDocs(friendsQuery);

                const friendsData = friendsSnapshot.docs.map((doc) => ({
                    id: doc.id, // the random document ID
                    ...doc.data(), // all user data including email, status, etc.
                }));

                // Create a map for quick lookup by email
                const membersMap = {};
                friendsData.forEach((friend) => {
                    membersMap[friend.email] = friend;
                });

                // Combine with original member list to maintain order
                const allFriends = friendEmails.map((email) => ({
                    email,
                    ...(membersMap[email] || {status: "unknown"}), // fallback if user not found
                }));

                setFriends(allFriends);
            } else {
                setFriends([]);
            }
        }
    };
    const addFriend = async (friend) => {
        if (!user || friend.email === user?.email) {
            setError("You cannot add yourself as a friend!");
            return;
        }

        if (friends.some(f => f.email === friend.email)) {
            setError("You are already friends with this person.");
            console.log("success")
            return;
        }

        await updateDoc(doc(db, "users", user.uid), {friends: arrayUnion(friend.email)});
        setFriends((prevFriends) => [
            ...prevFriends,
            {
                email: friend.email,
                lastSeen: friend.lastSeen || null,
                status: friend.status || "inactive",
            },
        ]);
        setSearchEmail("");
        setConfirmation("User added as friend!");
    };
    const removeFriend = async (friendEmail) => {
        if (!user || !friendEmail) return;
        try {
            await updateDoc(doc(db, "users", user.uid), {friends: arrayRemove(friendEmail)});
            setFriends((prevFriends) =>
                prevFriends.filter((friend) => friend.email !== friendEmail)
            );
            setSelectedFriend(null);
            setConfirmation("User removed from friends list!");
        } catch (err) {
            setError("Failed to remove friend. Please try again.");
        }
    };
    const selectFriend = async (friend) => {
        if (selectedFriend === friend) {
            setSelectedFriend(null); //closes the opened tab.
        } else {
            //set the friend as the selected one
            setSelectedFriend(friend);
            setFirstSelect(friend)
            const chatId = [user.email, friend].sort().join("_");
            const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp"));
            onSnapshot(q, (snapshot) => {
                setMessages(snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()})));
            });
        }
    };

    //messaging
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [quotedMessage, setQuotedMessage] = useState(null);

    //message function
    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedFriend) return;
        const chatId = [user.email, selectedFriend].sort().join("_");
        const messagesRef = collection(db, "chats", chatId, "messages");
        await addDoc(messagesRef, {
            text: newMessage,
            sender: user.email,
            timestamp: serverTimestamp(),
            quotedMessage: quotedMessage
                ? {
                    sender: quotedMessage.sender,
                    text: quotedMessage.text,
                }
                : null, // Include quoted message details
        });
        setNewMessage("");
        setQuotedMessage(null); // Clear quoted message after sending
    };
    const closeChat = () => {
        setSelectedFriend(null);
        setMessages([]);
    };

    //errors
    const [error, setError] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    const closeError = () => setError(null);
    const closeConfirmation = () => setConfirmation(null);

    //update status
    const updateLastSeen = async () => {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            lastSeen: serverTimestamp(),
            status: "active", // Set status to active on login
        });
    };
    const formatLastSeen = (timestamp, status) => {
        if (status === "active") return "Online";
        if (!timestamp) return "Offline";
        const date = timestamp.toDate();
        return `Last seen: ${formatDistanceToNow(date, {addSuffix: true})}`;
    };
    const isOnline = (status) => {
        return status === "active";
    };

    //context menu
    const contextMenuRef = useRef(null);
    const chatEndRef = useRef(null);
    const [FirstSelect, setFirstSelect] = useState(null);
    const [contextMenu, setContextMenu] = useState({
        position: {
            x: 0,
            y: 0,
        },
        toggled: false,
        message: null, //track the right-clicked message
    });

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
    //when you press an empty space context menu closes
    useEffect(() => {
        function handler(e) {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
                resetContextMenu();
            }
        }

        document.addEventListener("click", handler);
        return () => {
            document.removeEventListener("click", handler);
        };
    }, [contextMenu.toggled]);
    //prevents permanent auto-scrolling. only on send message and first time pressing on friend.
    useEffect(() => {
        if (chatEndRef.current) {
            if (selectedFriend && newMessage) {
                chatEndRef.current.scrollIntoView({behavior: selectedFriend ? "auto" : "smooth"});
            }
            if (FirstSelect) {

                chatEndRef.current.scrollIntoView({behavior: selectedFriend ? "auto" : "smooth"});
                setFirstSelect(null)
            }
        }
    }, [messages, selectedFriend]);

    //navigation
    const navigate = useNavigate();
    //navigate to dashboard
    const ReturnHomePage = () => {
        navigate("/Dashboard");
    };

    //css and display
    return (
        <div className="app-layout">
            <div className="left-column">
                {/*Add Friends START*/}
                <h2>Add Friends</h2>
                <input
                    value={searchEmail}
                    type="email"
                    className="input-add-friend"
                    placeholder="Enter user email"
                    onChange={(e) => setSearchEmail(e.target.value)}
                />
                <button className="btn-friends" onClick={searchUsers}>Search</button>
                <ul>
                    {searchResults.map((result) => (
                        <li key={result.id}>
                            {result.email}{" "}
                            <button onClick={() => addFriend(result)}>Add</button>
                            <button onClick={closeSearch}>Return</button>
                        </li>
                    ))}
                </ul>
                {/*Add Friends END*/}

                {/*Friends START*/}
                <h2>Friends</h2>
                <ul className={"friends-list"}>
                    {friends.length > 0 ? (
                        friends.map((friend, index) => (
                            <li key={index} onClick={() => selectFriend(friend.email)}>
                    <span
                        style={{
                            ...styles.statusDot,
                            ...(isOnline(friend.status)
                                ? styles.online
                                : styles.offline),
                        }}
                    >
                    </span>
                                {friend.username}{" "}
                                <span>({formatLastSeen(friend.lastSeen, friend.status)})</span>
                            </li>
                        ))
                    ) : (
                        <p>No friends added yet</p>
                    )}
                </ul>
                {/*Friends END*/}
                {/*CHAT RETURN FUNCTION*/}
                <button className="back-btn" onClick={ReturnHomePage}>Go back to the Dashboard</button>
            </div>

            {/*CHAT START*/}
            <div className="right-column">
                {selectedFriend && (
                    <div>
                        <h2>Chat with {selectedFriend}</h2>
                        <div className="chat-container">
                            <ul className="chat-window">
                                {messages.map((msg, index) => (
                                    <li
                                        key={index}
                                        onContextMenu={(e) => handleOnContextMenu(e, msg)}
                                        className={msg.selected ? "selected" : ""}
                                    >
                                        <strong>{msg.sender}:</strong> {msg.text}
                                        {msg.quotedMessage && (
                                            <div className="quoted-message">
                                                <p>
                                                    <strong>Quoting {msg.quotedMessage.sender}:</strong> {msg.quotedMessage.text}
                                                </p>
                                            </div>
                                        )}
                                    </li>
                                ))}
                                <div ref={chatEndRef}></div>
                            </ul>
                        </div>
                        {quotedMessage && (
                            <div className="quoted-message">
                                <p>
                                    <strong>Quoting {quotedMessage.sender}:</strong> {quotedMessage.text}
                                </p>
                                <button onClick={() => setQuotedMessage(null)}>Remove Quote</button>
                            </div>
                        )}
                        <input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                        />
                        <button onClick={sendMessage}>Send</button>
                        <p>
                            <button onClick={closeChat}>Close Chat</button>
                            <button onClick={() => removeFriend(selectedFriend)}>
                                Remove Friend
                            </button>
                        </p>
                    </div>
                )}
                {/*CHAT END*/}
            </div>
            {/*context menu*/}
            <ContextMenu
                contextMenuRef={contextMenuRef}
                isToggled={contextMenu.toggled}
                positionX={contextMenu.position.x}
                positionY={contextMenu.position.y}
                message={contextMenu.message} // Pass the right-clicked message
                buttons={[
                    {
                        text: "Reply",
                        icon: "",
                        onClick: () => {
                            setQuotedMessage(contextMenu.message); // Set the quoted message
                            resetContextMenu(); // Close the context menu
                        },
                        isSpacer: false,
                    },
                ]}
            />

            {/*Error handling START*/}
            {error && (
                <div className="error-popup">
                    <div className="error-content">
                        <h3>Error</h3>
                        <p>{error}</p>
                        <button onClick={closeError}>Close</button>
                    </div>
                </div>
            )}
            {confirmation && (
                <div className="confirmation-popup">
                    <div className="confirmation-content">
                        <h3>Confirmation</h3>
                        <p>{confirmation}</p>
                        <button onClick={closeConfirmation}>Close</button>
                    </div>
                </div>
            )}
            {/*Error handling END*/}
        </div>
    );
}

export default FriendList;