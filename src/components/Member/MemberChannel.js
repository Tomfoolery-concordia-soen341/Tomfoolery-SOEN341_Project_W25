import React, { useState, useEffect } from "react";
import {doc, getDoc, collection, addDoc, onSnapshot, serverTimestamp, updateDoc, arrayRemove,} from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import {useLocation, useNavigate} from "react-router-dom";
import {useAuthState} from "react-firebase-hooks/auth";

const MemberChannel = () => {
  //basic variables: authentication, the channel we are in and the state.
  const [user] = useAuthState(auth);
  const { state } = useLocation();
  const { channel } = state;
  //channel default vars
  const [isDefault, setIsDefault] = useState(false);
  //display member  vars
  const [members, setMembers] = useState([]);
  //message sending vars
  const [messages, setMessages] = useState([]); 
  const [newMessage, setNewMessage] = useState("");
  //navigation var
  const navigate = useNavigate();

  //continuous updates
  useEffect(() => {
    GetMessages(); //every new message will update
  }, []);

  // Listen for chat messages
  const GetMessages = () => {
    //get the data for each message
    onSnapshot(collection(db, "channels", channel.id, "messages"), (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  };

  //send message function
  const SendMessage = async () => {
    if (!newMessage.trim()) return; //if no new message, return
    //if there is a message, put in the database
    await addDoc(collection(db, "channels", channel.id, "messages"), {
      text: newMessage,
      sender: auth.currentUser.email, 
      timestamp: serverTimestamp(),
    });
    //clear the new message sent, wait for new one
    setNewMessage("");
  };
  //return to dashboard
  const BackToDashboard = () => {
    navigate("/Member");
  };

  //leaving channel function
  const leaveChannel = async () => {
    const confirm = window.confirm(
        "Do you want to leave this channel?",
    );
    if (!confirm) return;

    const channelRef = doc(db, "channels", channel.id);
    await updateDoc(channelRef, {members: arrayRemove(user.email)})
    .then(() => {BackToDashboard()})
  }


  return (
    <div>
      <h1>Channel: {channel.name}</h1>

      {!isDefault ? <div>
        <button onClick = {leaveChannel}>Leave Channel</button>
        <p></p>
        <h2>Channel Members</h2>
        <ul>
          {members.map((member, index) => (
            <li key={index}>{member}</li>
          ))}
        </ul>
      </div> : null }

      {/* Chat Section */}
      <div>
        <h2>Chat</h2>
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
        <button onClick={SendMessage}>Send</button>
      </div>
      <button onClick={BackToDashboard}>Go back to Dashboard</button>
    </div>
  );
};

export default MemberChannel;
