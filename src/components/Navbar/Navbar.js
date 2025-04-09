import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../config/firebase";
import { onSnapshot, collection } from "firebase/firestore";

const Navbar = ({ username, admin, handleLogout, showOnlineUsers, setShowOnlineUsers, onlineUserCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (location.pathname === "/Dashboard") {
      const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
        const usersData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            displayName: doc.data().displayName,
            status: doc.data().status || "inactive",
            lastSeen: doc.data().lastSeen || null,
          }))
          .sort((a, b) => (a.status === "active" && b.status !== "active" ? -1 : 1)); // Sort online users first
        setAllUsers(usersData);
      });

      return () => unsubscribe();
    }
  }, [location.pathname]);

  const goToProfile = () => navigate("/profile");
  const goToFriends = () => navigate("/friends");

  return (
    <nav className="navbar is-link is-fixed-top">
      <div className="navbar-brand">
        <div className="navbar-item">
          <h1 className="title is-4 has-text-white">
            {location.pathname === "/Dashboard" ? "Chat Dashboard" : "Other Page"}
          </h1>
        </div>
      </div>

      <div className="navbar-menu">
        <div className="navbar-end">
          <div className="navbar-item has-dropdown is-hoverable">
            <div className="navbar-link is-flex is-align-items-center">
              <figure className="image is-32x32 mr-2">
                <div
                  className="is-rounded has-background-info has-text-white is-flex is-justify-content-center is-align-items-center"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                  }}
                >
                  {username?.charAt(0).toUpperCase()}
                </div>
              </figure>
              <span>{username}</span>
              {admin && <span className="tag ml-2">Admin</span>}
            </div>
            <div className="navbar-dropdown">
              <a className="navbar-item" onClick={goToProfile}>
                <span className="icon">
                  <i className="fas fa-user"></i>
                </span>
                <span>Profile</span>
              </a>
              <a className="navbar-item" onClick={goToFriends}>
                <span className="icon">
                  <i className="fas fa-users"></i>
                </span>
                <span>Friends</span>
              </a>
              <hr className="navbar-divider" />
              <a className="navbar-item" onClick={handleLogout}>
                <span className="icon">
                  <i className="fas fa-sign-out-alt"></i>
                </span>
                <span>Logout</span>
              </a>
            </div>
          </div>

          {location.pathname === "/Dashboard" && (
            <div className="navbar-item">
              <button
                className={`button is-link is-medium ${showOnlineUsers ? "is-rounded" : ""}`}
                style={{
                  borderRadius: showOnlineUsers ? "8px" : "50%",
                }}
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
              >
                <span className="icon">
                  <i className="fas fa-users"></i>
                </span>
                {showOnlineUsers && (
                  <span className="ml-2">
                    Online Users ({allUsers.filter((u) => u.status === "active").length})
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {location.pathname === "/Dashboard" && showOnlineUsers && (
        <div
          className="box"
          style={{
            position: "fixed",
            right: "0",
            top: "4rem",
            width: "100%",
            maxWidth: "300px",
            height: "calc(100vh - 2rem)",
            overflowY: "auto",
          }}
        >
          <div className="menu">
            <ul className="menu-list">
              {allUsers.map((user) => (
                <li key={user.id}>
                  <a className="is-flex is-align-items-center py-2">
                    <span
                      className={`icon mr-3 ${
                        user.status === "active" ? "has-text-success" : "has-text-grey-light"
                      }`}
                    >
                      <i className="fas fa-circle"></i>
                    </span>
                    <span>{user.displayName}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
