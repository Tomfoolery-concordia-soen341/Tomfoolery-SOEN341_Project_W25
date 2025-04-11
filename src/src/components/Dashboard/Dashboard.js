import React, { useEffect, useState } from "react";
import { auth, db } from "../../config/firebase";
import { signOut } from "firebase/auth";
import {
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import NewChannelPrompt from "./NewChannelPrompt";
import PublicChannelsPrompt from "./JoinPrivateChannel";

const Dashboard = () => {
  const [user] = useAuthState(auth);
  const [username, setUsername] = useState("");
  const [admin, setAdmin] = useState(false);
  const [defaultChannels, setDefaultChannels] = useState([]);
  const [privateChannels, setPrivateChannels] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [showJoinChannelModal, setShowJoinChannelModal] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      setUsername(userDoc.data().username || user.email);
      setAdmin(userDoc.data().role === "admin");
    };

    const subscribeToChannels = () => {
      const defaultChannelsUnsub = onSnapshot(
          query(collection(db, "channels"), where("isDefault", "==", true)),
          (snapshot) => {
            setDefaultChannels(
                snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            );
          }
      );

      const privateChannelsUnsub = onSnapshot(
          admin
              ? collection(db, "privateChannels")
              : query(
                  collection(db, "privateChannels"),
                  where("members", "array-contains", user.email)
              ),
          (snapshot) => {
            setPrivateChannels(
                snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            );
          }
      );

      return () => {
        defaultChannelsUnsub();
        privateChannelsUnsub();
      };
    };

    const fetchUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs
          .filter((doc) => doc.id !== user.uid)
          .map((doc) => ({
            id: doc.id,
            username: doc.data().username,
            email: doc.data().email,
            displayName: doc.data().displayName,
            status: doc.data().status || "inactive",
            lastSeen: doc.data().lastSeen || null,
          }))
          .sort((a, b) =>
              a.status === "active" && b.status !== "active" ? -1 : 1
          );
      setAllUsers(usersData);
    });

    fetchUserData();
    const unsubscribeChannels = subscribeToChannels();

    return () => {
      fetchUsers();
      unsubscribeChannels();
    };
  }, [user, admin]);

  const goToChannel = (channel) => {
    console.log(channel);
    navigate(`/channels/${channel.id}`, { state: { channel } });
  };

  const goToFriends = () => navigate("/friends");
  const goToProfile = () => navigate("/profile");
  const goToGameLobby = () => navigate("/game-lobby");
  const handleLogout = async () => {
    await updateDoc(doc(db, "users", user.uid), {
      status: "inactive",
      lastSeen: serverTimestamp(),
    });
    await signOut(auth);
    navigate("/");
  };

  const deleteChannel = async (channelId) => {
    if (!admin) return;
    await deleteDoc(doc(db, "channels", channelId));
    setDefaultChannels((prev) => prev.filter((c) => c.id !== channelId));
  };

  return (
      <div
          className="dashboard-layout has-background-light"
          style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        {/* Top Navigation Bar */}
        <nav className="navbar is-link is-fixed-top">
          <div className="navbar-brand">
            <div className="navbar-item">
              <h1 className="title is-4 has-text-white">Chat Dashboard</h1>
            </div>
          </div>

          <div className="navbar-menu">
            <div className="navbar-start">
              {/* Game Lobby Button */}
              <div className="navbar-item">
                <button
                    className="button is-primary is-medium"
                    onClick={goToGameLobby}
                >
                <span className="icon">
                  <i className="fas fa-gamepad"></i>
                </span>
                  <span>Game Lobby</span>
                </button>
              </div>
            </div>

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

              {/* Online Users Button in Navbar */}
              <div className="navbar-item">
                <button
                    className={`button is-link is-medium ${
                        showOnlineUsers ? "is-rounded" : ""
                    }`}
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
                    Online Users (
                        {allUsers.filter((u) => u.status === "active").length})
                  </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div
            className={`columns is-gapless mt-6 ${
                showOnlineUsers ? "has-sidebar" : ""
            }`}
            style={{ flex: 1 }}
        >
          {/* Channels Column */}
          <div
              className={`column ${
                  showOnlineUsers ? "is-three-quarters" : "is-fullwidth"
              }`}
          >
            <section className="section">
              <div className="container">
                <div className="level">
                  <div className="level-left">
                    <h2 className="title is-3 has-text-black">Your Channels</h2>
                  </div>
                  <div className="level-right">
                    <div className="buttons">
                      <button
                          className="button is-info is-medium"
                          onClick={() => setShowNewChannelModal(true)}
                      >
                      <span className="icon">
                        <i className="fas fa-plus"></i>
                      </span>
                        <span>New Channel</span>
                      </button>
                      {!admin && (
                          <button
                              className="button is-success is-outlined is-medium"
                              onClick={() => setShowJoinChannelModal(true)}
                          >
                        <span className="icon">
                          <i className="fas fa-sign-in-alt"></i>
                        </span>
                            <span>Join Private Channel</span>
                          </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Default Channels Section */}
                <div className="box">
                  <h3 className="subtitle is-5 has-text-link">
                  <span className="icon mr-2">
                    <i className="fas fa-globe"></i>
                  </span>
                    Public Channels
                  </h3>
                  <div className="buttons is-info are-small">
                    {defaultChannels.map((channel) => (
                        <button
                            key={channel.id}
                            className={`button ${
                                activeChannel?.id === channel.id
                                    ? "is-warning"
                                    : "is-info"
                            }`}
                            onClick={() => goToChannel(channel)}
                        >
                          {channel.name}
                        </button>
                    ))}
                  </div>
                </div>

                {/* Private Channels Section */}
                <div className="box">
                  <h3 className="subtitle is-5 has-text-link">
                  <span className="icon mr-2">
                    <i className="fas fa-lock"></i>
                  </span>
                    Private Channels
                  </h3>
                  <div className="buttons is-info are-small">
                    {privateChannels.map((channel) => (
                        <button
                            key={channel.id}
                            className={`button ${
                                activeChannel?.id === channel.id
                                    ? "is-warning"
                                    : "is-info"
                            }`}
                            onClick={() => goToChannel(channel)}
                        >
                          {channel.name}
                        </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Online Users Sidebar */}
          <div className="column is-narrow">
            {showOnlineUsers && (
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
                                user.status === "active"
                                    ? "has-text-success"
                                    : "has-text-grey-light"
                            }`}
                        >
                          <i className="fas fa-circle"></i>
                        </span>
                              <span>{user.displayName}</span>
                              <span className="tag is-light is-pulled-right">
                          {user.status === "active"
                              ? "Online"
                              : formatDistanceToNow(
                                  user.lastSeen?.toDate() || new Date(),
                                  {
                                    addSuffix: true,
                                  }
                              )}
                        </span>
                            </a>
                          </li>
                      ))}
                    </ul>
                  </div>
                </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showNewChannelModal && (
            <NewChannelPrompt onClose={() => setShowNewChannelModal(false)} />
        )}

        {showJoinChannelModal && (
            <PublicChannelsPrompt onClose={() => setShowJoinChannelModal(false)} />
        )}
      </div>
  );
};

export default Dashboard;