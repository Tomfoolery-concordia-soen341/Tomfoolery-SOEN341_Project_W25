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
import PrivateChannel from "./components/PrivateChannel";

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
        <Route path="/privchannel/:id" element={<PrivateChannel />} />
        <Route path="/Mfriends" element={<MembersFriendsList />} />
        <Route path="/channelM/:id" element={<MemberChannel />} />
      </Routes>
    </Router>
  );
}

export default App;
