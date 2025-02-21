import React, { useState } from "react";

const ChatApp = () => {
  const [channels, setChannels] = useState(["General", "Random", "Support"]);
  const [selectedChannel, setSelectedChannel] = useState("General");
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello everyone!", user: "User1", timestamp: "10:00 AM" },
    { id: 2, text: "Hi there!", user: "User2", timestamp: "10:05 AM" },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    // Fetch messages for the selected channel (Firebase integration would go here)
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        text: newMessage,
        user: "You", // Replace with actual user data
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages([...messages, message]);
      setNewMessage("");
      // Send message to Firebase (Firebase integration would go here)
    }
  };

  return (
    <div className="chat-app columns is-fullheight">
      {/* Sidebar */}
      <div className="column is-one-quarter sidebar">
        <aside className="menu">
          <p className="menu-label">Channels</p>
          <ul className="menu-list">
            {channels.map((channel) => (
              <li key={channel}>
                <a
                  className={selectedChannel === channel ? "is-active" : ""}
                  onClick={() => handleChannelSelect(channel)}
                >
                  {channel}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Main Chat Area */}
      <div className="column is-three-quarters main-chat">
        <div className="chat-header">
          <h2 className="title is-4">#{selectedChannel}</h2>
        </div>

        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className="message">
              <div className="message-header">
                <span className="username">{message.user}</span>
                <span className="timestamp">{message.timestamp}</span>
              </div>
              <div className="message-body">{message.text}</div>
            </div>
          ))}
        </div>

        <div className="chat-input">
          <div className="field has-addons">
            <div className="control is-expanded">
              <input
                className="input"
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
            </div>
            <div className="control">
              <button className="button is-primary" onClick={handleSendMessage}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;