import React, {useEffect, useRef, useState} from "react";
import { auth, db } from "../config/firebase";
import { signOut } from "firebase/auth";
import {doc, getDocs, collection, query, where, updateDoc, serverTimestamp, onSnapshot,} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { deleteDoc } from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import {createPortal} from "react-dom";
import NewChannelPrompt from "./dialogPrompts/NewChannelPrompt";
import "./dialogPrompts/Modal.css"
import PublicChannelsPrompt from "./dialogPrompts/PublicChannelsPrompt";
import {formatDistanceToNow} from "date-fns";

//context menu imports
import ContextMenu from "./ContextMenu/ContextMenu";
import "./ContextMenu/ContextMenu.css";
import "./CMDashboard.css";

const styles = {
  statusDot: {
    height: "10px",
    width: "10px",
    borderRadius: "50%",
    display: "inline-block",
    marginRight: "5px",
  },
  online: {
    backgroundColor: "green",
  },
  offline: {
    backgroundColor: "red",
  },
};

const Dashboard = () => {
  const [user] = useAuthState(auth);

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

  // context menu vars
  const contextMenuRef = useRef(null);
  const chatEndRef = useRef(null);
  const [FirstSelect, setFirstSelect] = useState(null);
  const [quotedMessage, setSelectedChannel] = useState(null); // State for quoted message
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
    if (admin)
    navigate("/Afriends"); // Redirect to the friends list page
    else
      navigate("/Mfriends");
  };

  const GoToChannel = (channel) => {
    if (admin)
    navigate(`/privchannel/${channel.id}`, { state: { channel } });
    else
      navigate(`/privchannel/${channel.id}`, { state: { channel } });
  };

  const GoToPrivChannel = (channel) => {
    navigate(`/privchannel/${channel.id}`, { state: { channel } });
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
    <div>
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
      <h1>Dashboard</h1>
      <p>
        Logged in as: <strong>{user?.email}</strong>
      </p>
      <p>You are an {admin ? "Admin!" : "Member!"}</p>
      <label>Create a text channel</label>
      <div>
        <button onClick={() => setDialogShow(true)}>
          Create a New Channel
        </button>
        {dialogShow && createPortal(
            <div className = "overlay"><NewChannelPrompt onClose={ () => setDialogShow(false)} /></div>,
            document.body
        )}
      </div>
      <div>
        <h2>Channels</h2>
        <h3>Default Channels</h3>
        <ul>
          {defaultChannels.map((channel) => (
              <li
                  key={channel.id}
                  className="ChannelA"
                  onContextMenu={(e) => handleOnContextMenu(e, channel)}
                  onClick={() => GoToChannel(channel)}
              >
                {channel.name}
              </li>
          ))}
        </ul>
        <h3>Private Channels</h3>
        <ul>
          {privateChannels.map((channel) => (
              <li
                  key={channel.id}
                  className="ChannelA"
                  onContextMenu={(e) => handleOnContextMenu(e, channel)}
                  onClick={() => GoToPrivChannel(channel)}
              >
                {channel.name}
              </li>
          ))}
        </ul>
        <div>
          {!admin && !owner ? <button onClick={() => setDialogJoinChannel(true)}>
            Join a private channel
          </button> : null}

          {dialogJoinChannel && createPortal(
              <div className="overlay"><PublicChannelsPrompt onClose={() => setDialogJoinChannel(false)}/></div>,
              document.body
          )}
        </div>
        <h2>Registered Users</h2>
        <ul>
          {allUsers.length > 0 ? (
              allUsers.map((registeredUser, index) => (
                  <li key={index}>
              <span
                  style={{
                    ...styles.statusDot,
                    ...(isOnline(registeredUser.status)
                        ? styles.online
                        : styles.offline),
                  }}
              ></span>
                    {registeredUser.email} - {registeredUser.role}{" "}
                    <span>
                ({formatLastSeen(registeredUser.lastSeen, registeredUser.status)}
                      )
              </span>
                  </li>
              ))
          ) : (
              <p>No other registered users found</p>
          )}
        </ul>
      </div>
      <div>
        <h1>Access your Friends list!</h1>
        <button onClick={GoToFriendsList}>Go to Friends List</button>
      </div>
      <button onClick={Logout}>Log out</button>
    </div>
  );
};

export default Dashboard;
