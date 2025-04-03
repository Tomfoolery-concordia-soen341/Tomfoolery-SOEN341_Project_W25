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
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
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
      fetchFriendRequests();
      fetchSentFriendRequests(); // Fetch sent friend requests
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
    const q = query(usersRef, where("email", ">=", queryText), where("email", "<=", queryText + "\uf8ff"));
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setSearchResults(results);
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

  const fetchFriendRequests = async () => {
    if (!user) return;
    const userSnapshot = await getDocs(
      query(collection(db, "users"), where("email", "==", user.email))
    );
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      const requests = userData.friendRequests || [];
      setFriendRequests(requests);
    }
  };

  const fetchSentFriendRequests = async () => {
    if (!user) return;
    const userSnapshot = await getDocs(
      query(collection(db, "users"), where("email", "==", user.email))
    );
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      const sentRequests = userData.sentFriendRequests || [];
      setSentFriendRequests(sentRequests);
    }
  };

  const sendFriendRequest = async (friend) => {
    if (!user || friend.email === user?.email) {
      setError("You cannot send a friend request to yourself!");
      return;
    }
    if (friends.some((f) => f.email === friend.email)) {
      setError("This user is already in your friends list!");
      return;
    }
    if (sentFriendRequests.includes(friend.email)) {
      setError("You have already sent a friend request to this user!");
      return;
    }
    try {
      const friendRef = doc(db, "users", friend.id);
      await updateDoc(friendRef, {
        friendRequests: arrayUnion(user.email),
      });
      await updateDoc(doc(db, "users", user.uid), {
        sentFriendRequests: arrayUnion(friend.email),
      });
      setSearchEmail("");
      setSentFriendRequests((prev) => [...prev, friend.email]);
      setConfirmation("Friend request sent!");
    } catch (err) {
      setError("Failed to send friend request. Please try again.");
    }
  };

  const acceptFriendRequest = async (friendEmail) => {
    if (!user || !friendEmail) return;  
    try {
      await updateDoc(doc(db, "users", user.uid), {
        friends: arrayUnion(friendEmail),
        friendRequests: arrayRemove(friendEmail),
      });
      const friendSnapshot = await getDocs(
        query(collection(db, "users"), where("email", "==", friendEmail))
      );
      if (!friendSnapshot.empty) {
        const friendData = friendSnapshot.docs[0].data();
        await updateDoc(doc(db, "users", friendSnapshot.docs[0].id), {
          friends: arrayUnion(user.email),
        });
        setFriends((prevFriends) => [...prevFriends, friendData]);
      }
      setFriendRequests((prevRequests) =>
        prevRequests.filter((email) => email !== friendEmail)
      );
      setConfirmation("Friend request accepted!");
    } catch (err) {
      setError("Failed to accept friend request. Please try again.");
    }
  };

  const declineFriendRequest = async (friendEmail) => {
    if (!user || !friendEmail) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        friendRequests: arrayRemove(friendEmail),
      });
      setFriendRequests((prevRequests) =>
        prevRequests.filter((email) => email !== friendEmail)
      );
      setConfirmation("Friend request declined!");
    } catch (err) {
      setError("Failed to decline friend request. Please try again.");
    }
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
    <div className="columns is-white has-background-light ml-4 mb-4" style={{ gap: "20px" }}>
      {/* Left Column: Add Friends */}
      <div className="column is-one-third box" style={{ borderRadius: "20px" }}>
        <h2 className="title is-4 ml-4 mt-4">Add Friends</h2>
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
                onClick={() => sendFriendRequest(result)}
              >
                Send Request
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Column: Friends, Incoming Friend Requests, Sent Friend Requests */}
      <div className="column is-two-thirds has-background-light">
        <div className="container" style={{ gap: "20px" }}>
          {/* Row 1: Friends */}
          <div className="box">
            <h2 className="title is-4 mt-4">Friends</h2>
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
                      marginBottom: "4px",
                    }}
                  >
                    <span>{friend.email}</span>
                    <div>
                      <button
                        className="button is-small is-primary"
                        onClick={() => openMessageModal(friend)}
                        style={{ marginRight: "5px" }}
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

          {/* Row 2: Incoming Friend Requests */}
          <div className="box">
            <h2 className="title is-4 mt-4">Incoming Friend Requests</h2>
            <ul>
              {friendRequests.length > 0 ? (
                friendRequests.map((request) => (
                  <li
                    key={request}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px",
                    }}
                  >
                    <span>
                      <i className="fa-solid fa-user-clock" style={{ marginRight: "8px" }}></i>
                      {request}
                    </span>
                    <div>
                      <button
                        className="button is-small is-success"
                        onClick={() => acceptFriendRequest(request)}
                        style={{ marginRight: "5px" }}
                      >
                        Accept
                      </button>
                      <button
                        className="button is-small is-danger"
                        onClick={() => declineFriendRequest(request)}
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <p>No friend requests</p>
              )}
            </ul>
          </div>

          {/* Row 3: Sent Friend Requests */}
          <div className="box">
            <h2 className="title is-4 mt-4">Sent Friend Requests</h2>
            <ul>
              {sentFriendRequests.length > 0 ? (
                sentFriendRequests.map((request) => (
                  <li key={request}>
                    <span>
                      <i className="fa-solid fa-paper-plane" style={{ marginRight: "8px" }}></i>
                      {request}
                    </span>
                  </li>
                ))
              ) : (
                <p>No sent friend requests</p>
              )}
            </ul>
          </div>
        </div>
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