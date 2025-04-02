import React, { useEffect, useState } from "react";
import { auth, db } from "../../config/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import MessageModal from "./Message"; // Import the MessageModal component

const FriendList = () => {
  const [user] = useAuthState(auth);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control the modal visibility
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchOnlineUsers();
    }
  }, [user]);

  const fetchOnlineUsers = () => {
    const q = query(collection(db, "users"), where("isOnline", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOnlineUsers(snapshot.docs.map((doc) => doc.data()));
    });
    return unsubscribe;
  };

  const searchUsers = async (queryText) => {
    if (!queryText.trim()) {
      setSearchResults([]);
      return;
    }

    const usersRef = collection(db, "users");

    // Query for both email and username
    const q = query(
      usersRef,
      where("email", ">=", queryText),
      where("email", "<=", queryText + "\uf8ff")
    );

    const usernameQuery = query(
      usersRef,
      where("username", ">=", queryText),
      where("username", "<=", queryText + "\uf8ff")
    );

    const [emailSnapshot, usernameSnapshot] = await Promise.all([
      getDocs(q),
      getDocs(usernameQuery),
    ]);

    // Combine results from both queries
    const emailResults = emailSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const usernameResults = usernameSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Merge results and remove duplicates
    const combinedResults = [
      ...emailResults,
      ...usernameResults.filter(
        (usernameResult) =>
          !emailResults.some((emailResult) => emailResult.id === usernameResult.id)
      ),
    ];

    setSearchResults(combinedResults);
  };

  const fetchFriends = async () => {
    setLoading(true);
    try {
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
            id: doc.id,
            ...doc.data(),
          }));
          setFriends(friendsData);
        } else {
          setFriends([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const addFriend = async (friend) => {
    if (!user || friend.email === user?.email) {
      setError("You cannot add yourself as a friend!");
      return;
    }
    if (friends.some((f) => f.email === friend.email)) {
      setError("You are already friends with this person.");
      return;
    }
    await updateDoc(doc(db, "users", user.uid), {
      friends: arrayUnion(friend.email),
    });
    setFriends((prevFriends) => [...prevFriends, friend]);
    setSearchEmail("");
    setConfirmation("User added as friend!");
  };

  const removeFriend = async (friendEmail) => {
    if (!user || !friendEmail) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        friends: arrayRemove(friendEmail),
      });
      setFriends((prevFriends) =>
        prevFriends.filter((friend) => friend.email !== friendEmail)
      );
      setSelectedFriend(null);
      setConfirmation("User removed from friends list!");
    } catch (err) {
      setError("Failed to remove friend. Please try again.");
    }
  };

  const openMessageModal = (friend) => {
    setSelectedFriend(friend);
    setIsModalOpen(true);
  };

  const closeMessageModal = () => {
    setSelectedFriend(null);
    setIsModalOpen(false);
  };

  return (
    <div className="columns">
      {/* Left Column: Add Friends */}
      <div className="column is-half">
        <h2 className="title is-4">Add Friends</h2>
        <div className="field">
          <div className="control">
            <input
              className="input"
              type="email"
              placeholder="Enter user email"
              value={searchEmail}
              onChange={(e) => {
                setSearchEmail(e.target.value);
                searchUsers(e.target.value); // Trigger search on input change
              }}
            />
          </div>
        </div>
        <ul>
          {searchResults.map((result) => (
            <li key={result.id}>
              {result.email}{" "}
              <button
                className="button is-small is-success"
                onClick={() => addFriend(result)}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Column: Friends List */}
      <div className="column is-half">
        <h2 className="title is-4">Friends</h2>
        <ul>
          {loading ? (
            <p>Loading friends...</p>
          ) : friends.length > 0 ? (
            friends.map((friend) => (
              <li
                key={friend.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px", // Add spacing between list items
                }}
              >
                <span>{friend.email}</span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="button is-small is-primary"
                    onClick={() => openMessageModal(friend)}
                  >
                    Message
                  </button>
                  <button
                    className="button is-small is-danger"
                    onClick={() => removeFriend(friend.email)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))
          ) : (
            <p>No friends added yet</p>
          )}
        </ul>
      </div>

      {/* Error and Confirmation Messages */}
      {error && (
        <div className="notification is-danger">
          <button className="delete" onClick={() => setError(null)}></button>
          {error}
        </div>
      )}
      {confirmation && (
        <div className="notification is-success">
          <button
            className="delete"
            onClick={() => setConfirmation(null)}
          ></button>
          {confirmation}
        </div>
      )}

      {/* Message Modal */}
      <MessageModal
        isOpen={isModalOpen}
        onClose={closeMessageModal}
        friend={selectedFriend}
        onlineUsers={onlineUsers}
      />

      {/* Back to Dashboard Button */}
      <div style={{ position: "fixed", bottom: "20px", left: "20px" }}>
        <button
          className="button is-link"
          onClick={() => navigate("/dashboard")} // Navigate to the dashboard route
        >
          <span className="icon">
            <i className="fa-solid fa-arrow-left"></i> {/* Font Awesome exit icon */}
          </span>
          <span>Back to Dashboard</span>
        </button>
      </div>
    </div>
  );
};

export default FriendList;