import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Register from "./components/Register";
import AdminDash from "./components/AdminDash";
import AdminChannel from "./components/AdminChannel";
import MemberDash from "./components/MemberDash";
import MemberChannel from "./components/MemberChannel";
import MembersFriendsList from "./components/MemberFriendsList";
import AdminsFriendsList from "./components/AdminFriendsList";
import OfflineFriendList from "./components/OfflineFriendList";
import "bulma/css/bulma.min.css";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/Admin"
          element={
            <ProtectedRoute>
              <AdminDash />
            </ProtectedRoute>
          }
        />
        <Route path="" />
        <Route
          path="/Member"
          element={
            <ProtectedRoute>
              <MemberDash />
            </ProtectedRoute>
          }
        />
        <Route path="" />
        <Route path="/Afriends" element={<AdminsFriendsList />} />
        <Route path="/channelA/:id" element={<AdminChannel />} />
        <Route path="/Mfriends" element={<MembersFriendsList />} />
        <Route path="/channelM/:id" element={<MemberChannel />} />
        <Route path="/OfflineFriendList" element={<OfflineFriendList />} />
      </Routes>
    </Router>
  );
}

export default App;
