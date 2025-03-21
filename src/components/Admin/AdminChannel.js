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
  arrayRemove,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import {auth, db} from "../../config/firebase";
import { useNavigate } from "react-router-dom";
import { deleteDoc } from "firebase/firestore";

const AdminChannel = () => {
  const { state } = useLocation();
  const { channel } = state;
  const [user] = useAuthState(auth);
  const [isDefault, setIsDefault] = useState(false);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // List of all users
  const [selectedMember, setSelectedMember] = useState(""); // Selected member from dropdown
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [requestToUpdate, setRequestToUpdate] = useState(false);


  // Fetch the channel's data
  const fetchChannelData = async () => {
    const channelRef = doc(db, "channels", channel.id);
    const channelSnap = await getDoc(channelRef);
    if (channelSnap.exists()) {
      setMembers(channelSnap.data().members || []);
      setRequests(channelSnap.data().request || []);
      setIsDefault(channelSnap.data().isDefault);
    }
  };

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

    const channelRef = doc(db, "channels", channel.id);
    await updateDoc(channelRef, {
      members: arrayUnion(selectedMember), // Add the selected member to Firestore
    });

    setMembers((prev) => [...prev, selectedMember]); // Update local members state
    setSelectedMember(""); // Clear dropdown
    alert(`Added ${selectedMember} to ${channel.name}`);
  };
  // Listen for chat messages
  const retrieveMessages = () => {
    const messagesRef = collection(db, "channels", channel.id, "messages");

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

    const messagesRef = collection(db, "channels", channel.id, "messages");
    await addDoc(messagesRef, {
      text: newMessage,
      sender: auth.currentUser.email,
      timestamp: serverTimestamp(),
    });

    setNewMessage(""); // Clear input after sending
  };

  const DeleteMessage = async (messageId) => { // No need for channelId parameter
    if (!messageId || !channel) { // Check selectedChannel
      console.log (messageId)
      console.log (channel)
      alert("Invalid message or channel ID.");
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || userSnap.data().role !== "admin") {
      alert("Stop trying already, you're not an Admin!");
      return;
    }

    const confirmDelete = window.confirm(
        "Do you commit to the sins of deleting this message???????"
    );
    if (!confirmDelete) return;

    try {
      // Use selectedChannel.id to get the channel ID
      await deleteDoc(doc(db, `channels/${channel.id}/messages`, messageId));
      setMessages(messages.filter((message) => message.id !== messageId));
      alert("Message deleted successfully.");
    } catch (error) { // Corrected the catch block
      console.error("Error deleting message:", error);
      alert("Failed to delete message.");
    }
  };

  const acceptRequest = async (requester) => {
    const channelRef = doc(db, "channels", channel.id);
    await updateDoc(channelRef, {
      members: arrayUnion(requester),
      request: arrayRemove(requester),
    });
    alert(`Accepted ${requester} to ${channel.name}`);
    setRequestToUpdate(true);
  }

  const deleteRequest = async (requester) => {
    const channelRef = doc(db, "channels", channel.id);
    await updateDoc(channelRef, {
      request: arrayRemove(requester),
    });
    alert(`Rejected ${requester} request for ${channel.name}`);
    setRequestToUpdate(true);
  }

  useEffect(() => {
    fetchChannelData();
    fetchUsers(); // Fetch the list of users
    sendMessage();
    retrieveMessages();
    setRequestToUpdate(false);
  }, [requestToUpdate]);

  const BackToDashboard = () => {
    navigate("/Admin");
  };

  return (
      <div>
        <h1>Public Channel: {channel.name}</h1>
        {channel.isDefault ? <p>New users will be automatically added to this default channel</p> : null}
        <div>
          Admin Permissions ON
        </div>
        {!isDefault ? <div>
          <h2>Members</h2>
          <ul style={{listStyleType: "none", padding: 0}}>
            {members.map((member, index) => (
                <li key={index}>{member}</li>
            ))}
          </ul>
          <h3>Requests</h3>
          <ul style={{listStyleType: "none", padding: 0}}>
            {requests.map((member, index) => (
                <li key={index}>{member}
                  <button onClick = {(e) => {
                  e.stopPropagation();
                  acceptRequest(member);
                }}> Accept </button>
                  <button onClick = {(e) => {
                    e.stopPropagation();
                    deleteRequest(member);
                  }}> Delete </button>
                </li>
            ))}
          </ul>
        </div> : null }

        {!isDefault ? <div>
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
                  <button onClick={() => DeleteMessage(msg.id)}>Delete</button>
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

export default AdminChannel;