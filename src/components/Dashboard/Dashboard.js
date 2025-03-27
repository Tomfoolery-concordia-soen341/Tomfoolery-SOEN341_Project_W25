import React, {useEffect, useRef, useState} from "react";
import { auth, db } from "../../config/firebase";
import { signOut } from "firebase/auth";
import {doc, getDocs, collection, query, where, updateDoc, serverTimestamp, onSnapshot,} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { deleteDoc } from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import {createPortal} from "react-dom";
import NewChannelPrompt from "../Channels/NewChannelPrompt";
import "../Channels/Modal.css"
import PublicChannelsPrompt from "../Channels/PublicChannelsPrompt";
import {formatDistanceToNow} from "date-fns";
import "./Dashboard.css"

//context menu imports
import ContextMenu from "../ContextMenu/ContextMenu";
import "../ContextMenu/ContextMenu.css";
import "./Dashboard.css";

const Dashboard = () => {
  const [user] = useAuthState(auth);
  const [username, setUsername] = useState('');
  const [channels, setChannels] = useState([]);
  const [defaultChannels, setDefaultChannels] = useState([]);
  const [privateChannels, setPrivateChannels] = useState([]);
  const navigate = useNavigate();
  const [dialogShow, setDialogShow] = useState(false);
  const [allUsers, setAllUsers] = useState([]); // New state for all registered users

  //get channel vars
  const [admin, setAdmin] = useState(false);
  const [owner, setOwner] = useState(false);

  //channel request
  const [dialogJoinChannel, setDialogJoinChannel] = useState(false);

  //get channel data
  const fetchData = async () => {
    // Fetch roles
    const userDoc = await getDoc(doc(db, "users", user.uid));
    //check if you are an admin
    const isAdmin = userDoc.data().role === "admin";
    setAdmin(isAdmin);

    //get default channels
    const channelRef = collection(db, "channels");
    const BaseChannels = query(channelRef, where("isDefault", "==", true));
    const defaultQuerySnapshot = await getDocs(BaseChannels);
    const defaultChannelList = defaultQuerySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setDefaultChannels(defaultChannelList);

    //if admin, you get all channels
    if (isAdmin) {
      const privateQuerySnapshot = await getDocs(collection(db, "privateChannels"));
      const privateChannelList = privateQuerySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPrivateChannels(privateChannelList);
    } else {
      //if not, you are member, only get access to the channels you are invited to
      const privateQuerySnapshot = await getDocs(
          query(collection(db, "privateChannels"), where("members", "array-contains", user.email))
      );
      const privateChannelList = privateQuerySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPrivateChannels(privateChannelList);
    }
  };
  const fetchAllUsers = () => {
    if (!user) return;
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(
        usersRef,
        (snapshot) => {
          const usersData = snapshot.docs
              .map((doc) => ({
                username: doc.data().username,
                email: doc.data().email,
                lastSeen: doc.data().lastSeen || null,
                status: doc.data().status || "inactive",
                role: doc.data().role || "unknown",
              }))
              .filter((registeredUser) => registeredUser.email !== user.email);
          setAllUsers([...usersData]);
        },
        (error) => {
          console.error("Error fetching all users:", error);
        }
    );
    return unsubscribe;
  };

  useEffect(() => {
    if (user) {
      const fetchUsername = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username || user.email); // Fallback to email if no username
        }
      };
      fetchUsername().then(r => null);
    }
  }, [user]);

  // context menu vars
  const contextMenuRef = useRef(null);
  const [contextMenu, setContextMenu] = useState({
    position: {
      x: 0,
      y: 0,
    },
    toggled: false,
    message: null, // Track the right-clicked message
  });

  const formatLastSeen = (timestamp, status) => {
    if (status === "active") return "Online";
    if (!timestamp) return "Offline";
    const date = timestamp.toDate();
    return `Last seen: ${formatDistanceToNow(date, { addSuffix: true })}`;
  };

  const isOnline = (status) => {
    return status === "active";
  };

  const GoToFriendsList = () => {
    navigate("/friends"); // Redirect to the friends list page
  };

  const GoToChannel = (channel) => {
    navigate(`/privchannel/${channel.id}`, { state: { channel } });
  };

  const GoToProfile = () => {
      navigate(`/Profile`, { });
  };

  const Logout = async () => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    try {
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(), // Optional: update lastSeen on logout
        status: "inactive", // Set status to inactive
      });
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error during logout:", error);
      alert("Failed to log out properly.");
    }
  };

  const DeleteChannel = async (channelId) => {
    if (!channelId) {
      alert("Invalid channel ID.");
      return;
    }

    // Check if the current user is an admin
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || userSnap.data().role !== "admin") {
      alert("Not an Admin");
      return;
    }

    const confirmDelete = window.confirm(
      "Confirm?"
    );
    if (!confirmDelete) return;
    console.log("check", channelId.isDefault)
    try {
      if (channelId.isDefault === "true") {
        await deleteDoc(doc(db, "channels", channelId));
        setDefaultChannels((prevChannels) => prevChannels.filter((channel) => channel.id !== channelId));
      } else {
        await deleteDoc(doc(db, "privateChannels", channelId));
        setPrivateChannels((prevChannels) => prevChannels.filter((channel) => channel.id !== channelId));
      }
      alert("Channel deleted successfully.");
    } catch (error) {
      console.error("Error deleting channel:", error);
      alert("Failed to delete channel.");
    }
  };

  const handleOnContextMenu = (e, channel) => {
    e.preventDefault();

    const contextMenuAttr = contextMenuRef.current?.getBoundingClientRect();
    const isLeft = e.clientX < window?.innerWidth / 2;
    let x;
    let y = e.clientY;

    if (isLeft) {
      x = e.clientX;
    } else {
      x = e.clientX - (contextMenuAttr?.width || 0);
    }

    setContextMenu({
      position: { x, y },
      toggled: true,
      channel, // Pass the right-clicked channel
    });

    // Highlight the selected channel
    setChannels((prevChannels) =>
        prevChannels.map((ch) => ({
          ...ch,
          selected: ch.id === channel.id,
        }))
    );

    console.log("Context menu toggled:", true); // Debug log
    console.log("Right-clicked channel:", channel);
  };

  const resetContextMenu = () => {
    setChannels((prevChannels) =>
        prevChannels.map((ch) => ({
          ...ch,
          selected: false, // Remove highlight from all channels
        }))
    );

    setContextMenu({
      position: { x: 0, y: 0 },
      toggled: false,
      channel: null, // Clear the right-clicked channel
    });
  };

  useEffect(() => {
    function handler(e) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        resetContextMenu();
      }
    }

    document.addEventListener("click", handler);
    return () => {
      document.removeEventListener("click", handler);
    };
  },[contextMenu.toggled]); // Re-attach the listener when the menu is toggled



  useEffect(() => {
    fetchData().then(r => fetchAllUsers())
  }, [dialogShow]);

  return (
      <div className="dashboard-layout">
        {/* Main Content Area */}
        <main className="main-content">
          <header className="dashboard-header">
            <h1>Dashboard</h1>
            <div className="user-controls">
              <div className="user-info">
                <div className="user-avatar">
                  {username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="user-name">{username || user?.email}</div>
                  <div className="user-role">{admin ? "Admin" : "Member"} </div>
                </div>
              </div>
              {/*friends button next to name and logout*/}
              <section className="friends-section">
                <button className="btn btn-primary" onClick={GoToFriendsList}>
                  Go to Friends List
                </button>
              </section>
              <button className="btn profile-btn" onClick={GoToProfile}>
                Profile
              </button>
              <button className="btn logout-btn" onClick={Logout}>
                Logout
              </button>
            </div>
          </header>

          {/*channels and display of each channel by buttons*/}
          <section className="channel-management">
            <div className="create-channel">
              <button
                  className="btn btn-primary"
                  onClick={() => setDialogShow(true)}
              >
                Create New Channel
              </button>
              {dialogShow && createPortal(
                  <div className="overlay">
                    <NewChannelPrompt onClose={() => setDialogShow(false)} />
                  </div>,
                  document.body
              )}
            </div>

            {/*list of channels*/}
            {/*first is default channels*/}
            <div className="channels-container">
              <div className="channel-section">
                <h2>Default Channels</h2>
                <div className="channel-grid">
                  {defaultChannels.map((channel) => (
                      <div
                          key={channel.id}
                          className="channel-card"
                          onContextMenu={(e) => handleOnContextMenu(e, channel)}
                          onClick={() => GoToChannel(channel)}
                      >
                        <span className="channel-name">{channel.name}</span>
                      </div>
                  ))}
                </div>
              </div>
              {/*private channels here*/}
              <div className="channel-section">
                <h2>Private Channels</h2>
                <div className="channel-grid">
                  {privateChannels.map((channel) => (
                      <div
                          key={channel.id}
                          className="channel-card"
                          onContextMenu={(e) => handleOnContextMenu(e, channel)}
                          onClick={() => GoToChannel(channel)}
                      >
                        <span className="channel-name">{channel.name}</span>
                        {!admin && !owner && (
                            <button
                                className="btn join-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDialogJoinChannel(true);
                                }}
                            >
                              Join
                            </button>
                        )}
                      </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

        </main>

        {/*sidebar on the right for registered users.*/}
        {/*maybe add a serach function so you can serach the person, right click context menu and add them, or directly go to DMs*/}
        <aside className="users-sidebar">
          <h2>Online Users ({allUsers.filter(u => isOnline(u.status)).length})</h2>
          <div className="users-list">
            {allUsers.length > 0 ? (
                allUsers.map((user, index) => (
                    <div key={index} className="user-card">
              <span className={`status-indicator ${
                  isOnline(user.status) ? 'status-online' : 'status-offline'
              }`}></span>
                      <div className="user-info">
                        <span className="username">{user.username}</span>
                        {/*<span className="user-role">{user.role}</span>*/}
                      </div>
                      <div className="user-status">
                        {isOnline(user.status) ? "Online" : formatLastSeen(user.lastSeen, user.status)}
                      </div>
                    </div>
                ))
            ) : (
                <p className="no-users">No users found</p>
            )}
          </div>
        </aside>

        {/*context menu for our right click stuff*/}
        {/*two functions for now, join and delete*/}
        {/*MAybe add the DM directly or like add as friend*/}
        <ContextMenu
            contextMenuRef={contextMenuRef}
            isToggled={contextMenu.toggled}
            positionX={contextMenu.position.x}
            positionY={contextMenu.position.y}
            buttons={[
              {
                text: "Join",
                icon: "",
                onClick: () => {
                  GoToChannel(contextMenu.channel);
                  resetContextMenu();
                },
                isSpacer: false,
                show: true,
              },
              {
                text: "Delete",
                icon: "",
                onClick: () => {
                  if (contextMenu.channel) {
                    DeleteChannel(contextMenu.channel.id).then(() => resetContextMenu());
                  }
                },
                isSpacer: false,
                show: admin,
              },
            ]}
        />
      </div>
  );
};

export default Dashboard;
