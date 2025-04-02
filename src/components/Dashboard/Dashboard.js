import React, { useEffect, useState } from "react";
import { auth, db } from "../../config/firebase";
import { signOut } from "firebase/auth";
import { doc, deleteDoc, getDoc, getDocs, collection, query, where, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import NewChannelPrompt from "./NewChannelPrompt";
import PublicChannelsPrompt from "./PublicChannelsPrompt";

const Dashboard = () => {
  const [user] = useAuthState(auth);
  const [username, setUsername] = useState('');
  const [admin, setAdmin] = useState(false);
  const [defaultChannels, setDefaultChannels] = useState([]);
  const [privateChannels, setPrivateChannels] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [showJoinChannelModal, setShowJoinChannelModal] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false); // State to toggle online users list
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
          setDefaultChannels(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        }
      );

      const privateChannelsUnsub = onSnapshot(
        admin
          ? collection(db, "privateChannels")
          : query(collection(db, "privateChannels"), where("members", "array-contains", user.email)),
        (snapshot) => {
          setPrivateChannels(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
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
        }));
      setAllUsers(usersData);
    });

    fetchUserData();
    const unsubscribeChannels = subscribeToChannels();

    return () => {
      fetchUsers();
      unsubscribeChannels();
    };
  }, [user, admin]);

  const goToChannel = (channel) => navigate(`/channel/${channel.id}`, { state: { channel } });
  const goToFriends = () => navigate("/friends");
  const goToProfile = () => navigate("/profile");
  const handleLogout = async () => {
    await updateDoc(doc(db, "users", user.uid), {
      status: "inactive",
      lastSeen: serverTimestamp()
    });
    await signOut(auth);
    navigate("/");
  };

  const deleteChannel = async (channelId) => {
    if (!admin) return;
    await deleteDoc(doc(db, "channels", channelId));
    setDefaultChannels(prev => prev.filter(c => c.id !== channelId));
  };

  return (
    <div className="dashboard-layout">
      {/* Top Navigation Bar */}
      <nav className="navbar is-link is-fixed-top">
        <div className="navbar-brand">
          <div className="navbar-item">
            <h1 className="title is-4 has-text-white">Chat Dashboard</h1>
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
                      width: "32px", // Set width
                      height: "32px", // Set height (same as width)
                      borderRadius: "50%", // Make it perfectly round
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
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className={`columns is-gapless mt-6 ${showOnlineUsers ? "has-sidebar" : ""}`}>
        {/* Channels Column */}
        <div className={`column ${showOnlineUsers ? "is-three-quarters" : "is-fullwidth"}`}>
          <section className="section">
            <div className="container">
              <div className="level">
                <div className="level-left">
                  <h2 className="title is-3 has-text-black">Your Channels</h2>
                </div>
                <div className="level-right">
                  <button className="button is-info" onClick={() => setShowNewChannelModal(true)}>
                    <span className="icon">
                      <i className="fas fa-plus"></i> {/* Font Awesome Plus Icon */}
                    </span>
                    <span>New Channel</span>
                  </button>
                </div>
              </div>

              {/* Default Channels Section */}
              <div className="box">
                <h3 className="subtitle is-5 has-text-link">Public Channels</h3>
                <div className="buttons is-info are-small">
                  {defaultChannels.map((channel) => (
                    <button
                      key={channel.id}
                      className={`button ${activeChannel?.id === channel.id ? "is-warning" : "is-info"}`}
                      onClick={() => goToChannel(channel)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setActiveChannel(channel);
                      }}
                    >
                      {channel.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Private Channels Section */}
              <div className="box">
                <h3 className="subtitle is-5 has-text-link">
                  <span>Private Channels</span>
                </h3>
                <div className="buttons is-info are-small">
                  {privateChannels.map(channel => (
                    <button
                      key={channel.id}
                      className={`button ${activeChannel?.id === channel.id ? 'is-warning' : 'is-info'}`}
                      onClick={() => goToChannel(channel)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setActiveChannel(channel);
                      }}
                    >
                      {channel.name}
                    </button>
                  ))}
                </div>
              </div>

              {!admin && (
                <button 
                  className="button is-primary is-outlined"
                  onClick={() => setShowJoinChannelModal(true)}
                >
                  <span>Join Public Channel</span>
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Online Users Sidebar */}
        <div className="column is-narrow">
          {/* Online Users Button */}
          <div
            className="is-flex"
            style={{
              position: "fixed", // Fix the button to the viewport
              right: "0", // Align it to the rightmost part of the screen
              top: "4rem", // Stick it below the navbar
              zIndex: "10", // Ensure it stays above other elements
            }}
          >
            <button
              className={`button is-link ${showOnlineUsers ? "is-rounded" : ""} mb-3`} // Rounded when expanded
              style={{
                width: showOnlineUsers ? "300px" : "50px", // Match the sidebar width when expanded, small circle when collapsed
                height: "50px", // Keep height consistent
                borderRadius: showOnlineUsers ? "8px" : "50%", // Rounded corners when expanded, circle when collapsed
              }}
              onClick={() => setShowOnlineUsers(!showOnlineUsers)}
            >
              <span className="icon">
                <i className="fas fa-users"></i> {/* Font Awesome Users Icon */}
              </span>
              {showOnlineUsers && (
                <span className="ml-2">
                  Online Users ({allUsers.filter((u) => u.status === "active").length}) {/* Online user count */}
                </span>
              )}
            </button>
          </div>

          {/* Online Users Dropdown */}
          {showOnlineUsers && (
            <div
              className="box"
              style={{
                position: "fixed", // Fix the dropdown to the viewport
                right: "0", // Align it to the rightmost part of the screen
                top: "7rem", // Position it below the button
                width: "100%", // Full width of the sidebar
                maxWidth: "300px", // Optional: Limit the sidebar width
                height: "calc(100vh - 7rem)", // Make it take the remaining height of the viewport
                overflowY: "auto", // Enable scrolling for the friend list
                zIndex: "9", // Ensure it stays below the button
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
                        <span>{user.displayName}</span> {/* Display the displayName */}
                        <span className="tag is-light is-pulled-right">
                          {user.status === "active"
                            ? "Online"
                            : formatDistanceToNow(user.lastSeen?.toDate() || new Date(), {
                                addSuffix: true,
                              })}
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
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setShowNewChannelModal(false)}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Create New Channel</p>
              <button className="delete" onClick={() => setShowNewChannelModal(false)}></button>
            </header>
            <section className="modal-card-body">
              <NewChannelPrompt onClose={() => setShowNewChannelModal(false)} />
            </section>
          </div>
        </div>
      )}

      {showJoinChannelModal && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setShowJoinChannelModal(false)}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Join Public Channel</p>
              <button className="delete" onClick={() => setShowJoinChannelModal(false)}></button>
            </header>
            <section className="modal-card-body">
              <PublicChannelsPrompt onClose={() => setShowJoinChannelModal(false)} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;