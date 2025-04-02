
import React, { useState, useEffect } from "react";
import { db, auth } from "../../config/firebase"; // Adjust path to your firebase config
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./OfflineFriendList.css"; // Reuse or create styles as needed
import { signInAnonymously } from "firebase/auth";
const OfflineFriendList = () => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const sendOfflineMessage = async (e) => {
    e.preventDefault();
    if (!recipientEmail.trim() || !message.trim()) {
      setError("Please enter both an email and a message.");
      return;
    }

    try {
      // Add the message to a public "offlineMessages" collection
      await addDoc(collection(db, "offlineMessages"), {
        recipient: recipientEmail,
        text: message,
        sender: "Anonymous (Offline)", // You can customize this
        timestamp: serverTimestamp(),
        read: false, // Optional: Track if the message has been read
      });

      setConfirmation(
        "Message sent successfully! The recipient will see it when they log in."
      );
      setRecipientEmail("");
      setMessage("");
      setError(null);
    } catch (err) {
      setError("Failed to send message. Please try again.");
      console.error(err);
    }
  };

  useEffect(() => {
    signInAnonymously(auth).catch((err) =>
      console.error("Anonymous login failed:", err)
    );
  }, []);

  const returnToLogin = () => {
    navigate("/"); // Redirect back to login page
  };

  const closeConfirmation = () => {
    setConfirmation(null);
  };

  const closeError = () => {
    setError(null);
  };

  return (
    <div className="OuterContainer">
      <div className="FormContainer">
        <h1>Send Offline Message</h1>
        <form onSubmit={sendOfflineMessage} className="FormSubmit">
          <div>
            <label className="Email">Recipient Email</label>
            <input
              className="InputEmail"
              type="email"
              placeholder="Enter recipient's email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="Message">Message</label>
            <textarea
              className="InputMessage"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="SendButton">
            Send Message
          </button>
        </form>

        {confirmation && (
          <div className="confirmation-popup">
            <div className="confirmation-content">
              <h3>Success</h3>
              <p>{confirmation}</p>
              <button onClick={closeConfirmation}>Close</button>
            </div>
          </div>
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

        <button onClick={returnToLogin} className="BackButton">
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default OfflineFriendList;
