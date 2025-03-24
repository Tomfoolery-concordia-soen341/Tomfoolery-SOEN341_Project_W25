import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {doc, updateDoc, arrayUnion, getDoc, collection, getDocs, onSnapshot, addDoc, serverTimestamp, arrayRemove,} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import {auth, db} from "../../config/firebase";
import { useNavigate } from "react-router-dom";
import { deleteDoc } from "firebase/firestore";

//component
const AdminChannel = () => {
  //basic variables: authentication, the channel we are in and the state.
  const { state } = useLocation();
  const { channel } = state;
  const [user] = useAuthState(auth);
  // message functions
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  //used to navigate between pages
  const navigate = useNavigate();
  //fetch data for channel
  const [isDefault, setIsDefault] = useState(false);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  // drill down selecting members
  const [selectedMember, setSelectedMember] = useState("");
  // fetch users
  const [allUsers, setAllUsers] = useState([]);
  //request functions to join a channel
  const [requestToUpdate, setRequestToUpdate] = useState(false);

  //return to dashboard function
  const BackToDashboard = () => {
    //this is for admins only
    navigate("/Admin");
  };

  //add members function
  const AddMember = async () => {
    if (!selectedMember) {
      //error handling.
      alert("Please select a member.");
      return;
    }

    // add members to Firestore
    await updateDoc(doc(db, "channels", channel.id), {
      members: arrayUnion(selectedMember)
    });

    // update local members state, added to the channel
    setMembers((prev) => [...prev, selectedMember]);
    //after adding, clear the variable for a new member to be added later.
    setSelectedMember("");
    //send a confirmation message
    alert(`Added ${selectedMember} to ${channel.name}`);
  };

  //retrieve message in the channel
  const GetMessages = () => {
    //get the data for each message
    onSnapshot(collection(db, "channels", channel.id, "messages"), (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  };

  // send message function
  const SendMessage = async () => {
    //if there is no message, or rather empty message, do nothing
    if (!newMessage.trim()) return;

    //store the message into the database, with the user and the time it was sent.
    await addDoc(collection(db, "channels", channel.id, "messages"), {
      text: newMessage,
      sender: auth.currentUser.email,
      timestamp: serverTimestamp(),
    });
    //set the message that was just sent as nothing.
    setNewMessage(""); // Clear input after sending
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
      await deleteDoc(doc(db, `channels/${channel.id}/messages`, message.id));

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
  }

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
  }

  //continuous updates when requests are sent.
  useEffect
  (() => {
      GetMessages(); //retrieve messages
      setRequestToUpdate(false); //stop updating
    }, [requestToUpdate]);

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
                  AcceptRequest(member);
                }}> Accept </button>
                  <button onClick = {(e) => {
                    e.stopPropagation();
                    DeleteRequest(member);
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
            <button onClick={AddMember}>Add Member</button>
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
                  <button onClick={() => DeleteMessage(msg)}>Delete</button>
                </p>
            ))}
          </div>
          <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
          />
          <button onClick={SendMessage}>Send</button>
        </div>
        <button onClick={BackToDashboard}>Go back to Dashboard</button>
      </div>
  );
};

export default AdminChannel;