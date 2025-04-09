import React from "react";
import Navbar from "../Navbar/Navbar";

const Layout = ({ children, username, admin, handleLogout, showOnlineUsers, setShowOnlineUsers, onlineUserCount }) => {
  return (
    <div className="layout">
      <Navbar
        username={username}
        admin={admin}
        handleLogout={handleLogout}
        showOnlineUsers={showOnlineUsers}
        setShowOnlineUsers={setShowOnlineUsers}
        onlineUserCount={onlineUserCount}
      />
      <div className="content" style={{ marginTop: "4rem" }}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
