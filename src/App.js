import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login/Login";
import Register from "./components/Login/Register";
//import FriendList from "./components/FriendsList/FriendList";
import Channel from "./components/Channels/Channel";
import FriendList from "./components/FriendsList/FriendList.js";
import Dashboard from "./components/Dashboard/Dashboard";
import ProfilePage from "./components/Profile/ProfilePage";
import TicTacToe from "./components/Game/TicTacToe";

import "bulma/css/bulma.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import GameLobby from "./components/GameLobby/GameLobby";
import ConnectFourPage from "./components/ConnectFourPage";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/friends" element={<FriendList />} />
        <Route path="/channels/:id" element={<Channel />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Profile" element={<ProfilePage />} />
        <Route path="/TicTacToe" element={<TicTacToe />} />
        <Route path="/connect-four/:roomID" element={<ConnectFourPage />} />
        <Route path="/game-lobby" element={<GameLobby />} />
        <Route path="/tic-tac-toe/:roomId" element={<TicTacToe />} />
      </Routes>
    </Router>
  );
}

export default App;
