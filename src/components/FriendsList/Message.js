import React, { useState, useEffect, useRef } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const MessageModal = ({ isOpen, onClose, friend, onlineUsers }) => {
  const [user] = useAuthState(auth);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]); // State to store conversation log
  const chatContainerRef = useRef(null); // Ref to scroll to the bottom of the chat

  const isRecipientOnline = onlineUsers.some((u) => u.email === friend.email);

  useEffect(() => {
    if (isOpen && friend) {
      fetchMessages();
    }
  }, [isOpen, friend]);

  const fetchMessages = () => {
    const chatId =
      user.email < friend.email
        ? `${user.email}_${friend.email}`
        : `${friend.email}_${user.email}`;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(fetchedMessages);

      // Scroll to the bottom of the chat
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });

    return unsubscribe;
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Message cannot be empty.");
      return;
    }

    try {
      const chatId =
        user.email < friend.email
          ? `${user.email}_${friend.email}`
          : `${friend.email}_${user.email}`;

      const chatDocRef = doc(db, "chats", chatId);

      // Check if the chat document exists
      const chatDoc = await getDoc(chatDocRef);
      if (!chatDoc.exists()) {
        // If the chat document doesn't exist, create it
        await setDoc(chatDocRef, {
          users: [user.email, friend.email],
          createdAt: serverTimestamp(),
        });
      }

      // Add the message to the `messages` subcollection
      const messagesCollectionRef = collection(chatDocRef, "messages");
      await addDoc(messagesCollectionRef, {
        sender: user.email,
        recipient: friend.email,
        text: message,
        timestamp: serverTimestamp(),
        status: isRecipientOnline ? "delivered" : "sent",
      });

      setConfirmation(
        isRecipientOnline
          ? "Message delivered!"
          : "Message sent. Recipient will see it when online."
      );
      setMessage("");
    } catch (err) {
      setError("Failed to send message: " + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Message {friend.email}</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body">
          {/* Conversation Log */}
          <div
            className="box"
            style={{
              height: "300px",
              overflowY: "auto",
              marginBottom: "1rem",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9",
            }}
            ref={chatContainerRef}
          >
            {messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.sender === user.email ? "flex-end" : "flex-start",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: msg.sender === user.email ? "#3273dc" : "#f0f0f0",
                      color: msg.sender === user.email ? "#fff" : "#000",
                      padding: "0.75rem",
                      borderRadius: "12px",
                      maxWidth: "70%",
                      wordWrap: "break-word",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>{msg.sender === user.email ? "You" : friend.email}:</strong>{" "}
                      {msg.text}
                    </p>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: msg.sender === user.email ? "#d0d0d0" : "#888",
                        marginTop: "0.5rem",
                        display: "block",
                        textAlign: "right",
                      }}
                    >
                      {msg.timestamp
                        ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p>No messages yet.</p>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
            <div className="control is-expanded" style={{ flexGrow: 1 }}>
              <input
                className="input"
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  width: "100%", // Ensure the input takes up all available space
                }}
              />
            </div>
            <div className="control">
              <button className="button is-link" type="submit" style={{ minWidth: "80px" }}>
                Send
              </button>
            </div>
            <div className="control">
              <button className="button" type="button" onClick={onClose} style={{ minWidth: "80px" }}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default MessageModal;