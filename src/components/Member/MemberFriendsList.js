import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../../config/firebase";
import {collection, getDocs, query, where, doc, updateDoc, arrayUnion, addDoc, orderBy, onSnapshot, serverTimestamp, arrayRemove,} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import ContextMenu from "../ContextMenu/ContextMenu";
import "../ContextMenu/ContextMenu.css";
import "./MemberFriendsList.css";


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

const MemberFriendsList = () => {
  const [user, loading] = useAuthState(auth);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // New state for all registered users
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [offlineMessages, setOfflineMessages] = useState([]);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  // sprint 3 vars
  const contextMenuRef = useRef(null);
  const chatEndRef = useRef(null);
  const [FirstSelect, setFirstSelect] = useState(null);
  const [quotedMessage, setQuotedMessage] = useState(null); // State for quoted message
  const [contextMenu, setContextMenu] = useState({
    position: {
      x: 0,
      y: 0,
    },
    toggled: false,
    message: null, // Track the right-clicked message
  });

  useEffect(() => {
    if (loading) return;
    if (user) {
      updateLastSeen();
      fetchFriends();
      const unsubscribeFriends = fetchAllUsers(); // Fetch registered users
      const unsubscribeOffline = fetchOfflineMessages();
      return () => {
        if (unsubscribeFriends) unsubscribeFriends();
        if (unsubscribeOffline) unsubscribeOffline();
      };
    }
  }, [user, loading]);

  const ReturnHomePage = () => {
    navigate("/Member");
  };

  const updateLastSeen = async () => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      lastSeen: serverTimestamp(),
      status: "active", // Set status to active on login
    });
  };

  //prevents permanent auto-scrolling. only on send message and first time pressing on friend.
  useEffect(() => {
    if (chatEndRef.current) {
      if (selectedFriend && newMessage) {
        chatEndRef.current.scrollIntoView({behavior: selectedFriend ? "smooth" : "smooth"});
      }
      if (FirstSelect) {

        chatEndRef.current.scrollIntoView({behavior: selectedFriend ? "smooth" : "smooth"});
        setFirstSelect(null)
      }
    }
  }, [messages, selectedFriend]);

  const fetchFriends = async () => {
    if (!user) return;
    const userSnapshot = await getDocs(
      query(collection(db, "users"), where("email", "==", user.email))
    );
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      const friendEmails = userData.friends || [];

      if (friendEmails.length > 0) {
        const friendsQuery = query(
          collection(db, "users"),
          where("email", "in", friendEmails)
        );
        const friendsSnapshot = await getDocs(friendsQuery);
        const friendsData = friendsSnapshot.docs.map((doc) => ({
          email: doc.data().email,
          lastSeen: doc.data().lastSeen || null,
          status: doc.data().status || "inactive",
        }));
        setFriends(friendsData);
      } else {
        setFriends([]);
      }
    }
  };

  const fetchAllUsers = () => {
    if (!user) return;
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const usersData = snapshot.docs
          .map((doc) => ({
            email: doc.data().email,
            lastSeen: doc.data().lastSeen || null,
            status: doc.data().status || "inactive",
            role: doc.data().role || "unknown",
          }))
          .filter((registeredUser) => registeredUser.email !== user.email);
        setAllUsers([...usersData]);
      },
      (error) => {
        console.error("Error fetching all users:", error);
      }
    );
    return unsubscribe;
  };

  const fetchOfflineMessages = () => {
    if (!user || !user.email) return () => {};

    const offlineMessagesRef = collection(db, "offlineMessages");
    const q = query(
      offlineMessagesRef,
      where("recipient", "==", user.email),
      where("read", "==", false),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const offlineMsgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOfflineMessages(offlineMsgs);
      },
      (error) => {
        console.error("Error fetching offline messages:", error);
        setError(`Failed to load offline messages: ${error.message}`);
      }
    );
    return unsubscribe;
  };

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

  const addFriend = async (friend) => {
    if (!user || friend.email === user?.email) {
      setError("You cannot add yourself as a friend!");
      return;
    }
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { friends: arrayUnion(friend.email) });
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
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { friends: arrayRemove(friendEmail) });
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
      setSelectedFriend(null);
    } else {
      setSelectedFriend(friend);
      setFirstSelect(friend)
      const chatId = [user.email, friend].sort().join("_");
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("timestamp"));
      onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
    }
  };

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

  const markOfflineMessageAsRead = async (messageId) => {
    const messageRef = doc(db, "offlineMessages", messageId);
    await updateDoc(messageRef, { read: true });
  };

  const closeError = () => setError(null);
  const closeConfirmation = () => setConfirmation(null);
  const CloseSearch = () => {
    setSearchResults([]);
    setSearchEmail("");
  };
  const CloseChat = () => {
    setSelectedFriend(null);
    setMessages([]);
  };

  const formatLastSeen = (timestamp, status) => {
    if (status === "active") return "Online";
    if (!timestamp) return "Offline";
    const date = timestamp.toDate();
    return `Last seen: ${formatDistanceToNow(date, { addSuffix: true })}`;
  };

  const isOnline = (status) => {
    return status === "active";
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
    }, [contextMenu.toggled]); // Re-attach the listener when the menu is toggled

  return (
    <div>
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
      <h2>Add Friends</h2>
      <input
        value={searchEmail}
        type="email"
        placeholder="Enter user email"
        onChange={(e) => setSearchEmail(e.target.value)}
      />
      <button onClick={searchUsers}>Search</button>
      <ul>
        {searchResults.map((result) => (
          <li key={result.id}>
            {result.email}{" "}
            <button onClick={() => addFriend(result)}>Add</button>
            <button onClick={CloseSearch}>Return</button>
          </li>
        ))}
      </ul>

      <h2>Friends</h2>
      <ul>
        {friends.length > 0 ? (
          friends.map((friend, index) => (
            <li
              className="Friends List"
              key={index}
              onClick={() => selectFriend(friend.email)}
            >
              {friend.email}{" "}
              <span>({formatLastSeen(friend.lastSeen, friend.status)})</span>
            </li>
          ))
        ) : (
          <p>No friends added yet</p>
        )}
      </ul>

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
            <button onClick={CloseChat}>Close Chat</button>
            <button onClick={() => removeFriend(selectedFriend)}>
              Remove Friend
            </button>
          </p>
        </div>
      )}
        <h2>Registered Users</h2>
        <ul>
            {allUsers.length > 0 ? (
                allUsers.map((registeredUser, index) => (
                    <li key={index}>
              <span
                  style={{
                      ...styles.statusDot,
                      ...(isOnline(registeredUser.status)
                          ? styles.online
                          : styles.offline),
                  }}
              ></span>
                        {registeredUser.email} - {registeredUser.role}{" "}
                        <span>
                ({formatLastSeen(registeredUser.lastSeen, registeredUser.status)}
                            )
              </span>
                    </li>
                ))
            ) : (
                <p>No other registered users found</p>
            )}
        </ul>

        <h2>Offline Messages</h2>
        {offlineMessages.length > 0 ? (
            <ul>
                {offlineMessages.map((msg) => (
                    <li key={msg.id}>
                        <strong>From: {msg.sender}</strong> - {msg.text}{" "}
                        <button onClick={() => markOfflineMessageAsRead(msg.id)}>
                            Mark as Read
                        </button>
                    </li>
                ))}
            </ul>
        ) : (
            <p>No offline messages.</p>
        )}
      <button onClick={ReturnHomePage}>Go back to the Dashboard</button>
    </div>
  );
};

export default MemberFriendsList;