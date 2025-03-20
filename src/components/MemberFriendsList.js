import React, { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
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
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";

const MemberFriendsList = () => {
  const [user, loading] = useAuthState(auth); // Add loading state
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [offlineMessages, setOfflineMessages] = useState([]);

  useEffect(() => {
    if (loading) return; // Wait until authentication state is resolved
    if (user) {
      fetchFriends();
      const unsubscribe = fetchOfflineMessages();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user, loading]);

  const ReturnHomePage = () => {
    navigate("/Member");
  };

  const fetchFriends = async () => {
    if (!user) return;
    const userSnapshot = await getDocs(
      query(collection(db, "users"), where("email", "==", user.email))
    );
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      setFriends(userData.friends || []);
    }
  };

  const fetchOfflineMessages = () => {
    if (!user || !user.email) {
      console.log("User not fully authenticated, skipping fetch.");
      return () => {};
    }

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
        setError(null); // Clear error when data loads successfully
      },
      (error) => {
        console.error(
          "Error fetching offline messages:",
          error.code,
          error.message
        );
        setError(`Failed to load offline messages: ${error.message}`);
      }
    );

    return () => unsubscribe();
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
    setFriends((prevFriends) => [...prevFriends, friend.email]);
    setSearchEmail("");
    setConfirmation("User added as friend!");
  };

  const removeFriend = async (friend) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { friends: arrayRemove(friend) });
      setFriends((prevFriends) =>
        prevFriends.filter((email) => email !== friend)
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
      const chatId = [user.email, friend].sort().join("_");
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("timestamp"));
      onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map((doc) => doc.data()));
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
    });
    setNewMessage("");
  };

  const markOfflineMessageAsRead = async (messageId) => {
    const messageRef = doc(db, "offlineMessages", messageId);
    await updateDoc(messageRef, { read: true });
    // No need to manually filter; onSnapshot will update automatically
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

  return (
    <div>
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
              onClick={() => selectFriend(friend)}
            >
              {friend}
            </li>
          ))
        ) : (
          <p>No friends added yet</p>
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
          <p>
            <button onClick={CloseChat}>Close Chat</button>
            <button onClick={() => removeFriend(selectedFriend)}>
              Remove Friend
            </button>
          </p>
        </div>
      )}
      <button onClick={ReturnHomePage}>Go back to the Dashboard</button>
    </div>
  );
};

export default MemberFriendsList;
