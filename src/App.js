import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login/Login";
import Register from "./components/Login/Register";
import FriendList from "./components/FriendsList/FriendList";
import PrivateChannel from "./components/Channels/PrivateChannel";
import OfflineFriendList from "./components/Offline/OfflineFriendList";
import Dashboard from "./components/Dashboard/Dashboard"
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/friends" element={<FriendList />} />
        <Route path="/privchannel/:id" element={<PrivateChannel />} />
        <Route path="/OfflineFriendList" element={<OfflineFriendList />} />
        <Route path="/Dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
