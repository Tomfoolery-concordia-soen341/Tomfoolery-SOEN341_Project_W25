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
import { formatDistanceToNow } from "date-fns";

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

const AdminFriendsList = () => {
  const [user, loading] = useAuthState(auth);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (user) {
      updateLastSeen();
      fetchFriends();
      const unsubscribe = fetchAllUsers();
      return () => unsubscribe();
    }
  }, [user, loading]);

  const ReturnHomePage = () => {
    navigate("/Admin");
  };

  const updateLastSeen = async () => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      lastSeen: serverTimestamp(),
      status: "active", // Set status to active when online
    });
  };

  const handleLogout = async () => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);

    try {
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(), // Update lastSeen on logout
        status: "inactive", // Set status to inactive
      });
      await auth.signOut();
      navigate("/");
    } catch (err) {
      setError(`Logout failed: ${err.message}`);
    }
  };

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
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const usersData = snapshot.docs
        .map((doc) => ({
          email: doc.data().email,
          lastSeen: doc.data().lastSeen || null,
          status: doc.data().status || "inactive",
          role: doc.data().role || "unknown",
        }))
        .filter((registeredUser) => registeredUser.email !== user.email);
      setAllUsers(usersData);
    });
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
    if (!user) return;
    if (friend.email === user?.email) {
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
    if (status === "active") return "Online"; // No timestamp when active
    if (!timestamp) return "Offline"; // No timestamp if null
    const date = timestamp.toDate();
    return `Last seen: ${formatDistanceToNow(date, { addSuffix: true })}`; // Show timestamp when inactive
  };

  const isOnline = (status) => {
    return status === "active";
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
                (
                {formatLastSeen(registeredUser.lastSeen, registeredUser.status)}
                )
              </span>
            </li>
          ))
        ) : (
          <p>No other registered users found</p>
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
      {/* {user && <button onClick={handleLogout}>Logout</button>} */}
    </div>
  );
};

export default AdminFriendsList;
