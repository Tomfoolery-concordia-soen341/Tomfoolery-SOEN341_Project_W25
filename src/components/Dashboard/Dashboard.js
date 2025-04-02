import React, {useEffect, useRef, useState} from "react";
import {auth, db} from "../../config/firebase";
import {signOut} from "firebase/auth";
import {
    doc,
    getDocs,
    collection,
    query,
    where,
    updateDoc,
    serverTimestamp,
    onSnapshot,
    addDoc, arrayUnion,
} from "firebase/firestore";
import {useAuthState} from "react-firebase-hooks/auth";
import {useNavigate} from "react-router-dom";
import {deleteDoc} from "firebase/firestore";
import {getDoc} from "firebase/firestore";
import {createPortal} from "react-dom";

import "../Channels/Modal.css"
import {formatDistanceToNow} from "date-fns";
import "./Dashboard.css"

//context menu imports
import ContextMenu from "../ContextMenu/ContextMenu";
import "../ContextMenu/ContextMenu.css";
import "./Dashboard.css";

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
        console.log (user)
        const userDoc = await getDoc(doc(db, "users", user.uid));
        //check if you are an admin
        const isAdmin = userDoc.data().role === "admin";
        setAdmin(isAdmin);

        //get default channels
        const channelRef = collection(db, "channels");
        const defaultChannels = query(channelRef, where("isDefault", "==", true));
        const privateChannels = query(channelRef, where("isDefault", "==", false));

        //load the public channels, everyone can see them
        const defaultQuerySnapshot = await getDocs(defaultChannels);
        const defaultChannelList = defaultQuerySnapshot.docs.map((doc) => ({
            id: doc.id, ...doc.data(),
        }));
        setDefaultChannels(defaultChannelList);

        //if admin, you get all channels
            const privateQuerySnapshot = await getDocs(privateChannels);
            const privateChannelList = privateQuerySnapshot.docs.map((doc) => ({
                id: doc.id, ...doc.data(),
            }));
            setPrivateChannels(privateChannelList);

    };
    const fetchAllUsers = () => {
        if (!user) return;
        const usersRef = collection(db, "users");
        const unsubscribe = onSnapshot(usersRef, (snapshot) => {
            const usersData = snapshot.docs
                .map((doc) => ({
                    displayName: doc.data().displayName,
                    email: doc.data().email,
                    lastSeen: doc.data().lastSeen || null,
                    status: doc.data().status || "inactive",
                    role: doc.data().role || "unknown",
                }))
                .filter((registeredUser) => registeredUser.email !== user.email);
            setAllUsers([...usersData]);
        }, (error) => {
            console.error("Error fetching all users:", error);
        });
        return unsubscribe;
    };

    useEffect (() => {

    })

    // context menu vars
    const contextMenuRef = useRef(null);
    const [contextMenu, setContextMenu] = useState({
        position: {
            x: 0, y: 0,
        }, toggled: false, message: null, // Track the right-clicked message
    });

    const formatLastSeen = (timestamp, status) => {
        if (status === "active") return "Online";
        if (!timestamp) return "Offline";
        const date = timestamp.toDate();
        return `Last seen: ${formatDistanceToNow(date, {addSuffix: true})}`;
    };

    const isOnline = (status) => {
        return status === "active";
    };

    const GoToFriendsList = () => {
        navigate("/friends"); // Redirect to the friends list page
    };

    const GoToChannel = (channel) => {
        navigate(`/channel/${channel.id}`, {state: {channel}});
    };

    const GoToPrivateChannel = async (channel) => {
        const members = channel.members;
        //const request = channel.request;
        const check = (element) => element === user.email;
        console.log(members);
        if(members.some(check)) {
            navigate(`/channel/${channel.id}`, { state: { channel } });
        } else {
            const channelRef = doc(db, "channels", channel.id);
            await updateDoc(channelRef, {
                request: arrayUnion(user.email)
            });

            alert("Requested to join");
        }
    };

    const GoToProfile = () => {
        navigate(`/Profile`, {});
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


    //channels
    const [channelName, setChannelName] = useState("");
    const [privacy, setPrivacy] = useState(false);

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

        const confirmDelete = window.confirm("Confirm?");
        if (!confirmDelete) return;
        console.log("check", channelId.isDefault)
        try {
            if (channelId.isDefault === "true") {
                await deleteDoc(doc(db, "channels", channelId));
                setDefaultChannels((prevChannels) => prevChannels.filter((channel) => channel.id !== channelId));
            } else {
                await deleteDoc(doc(db, "channels", channelId));
                setPrivateChannels((prevChannels) => prevChannels.filter((channel) => channel.id !== channelId));
            }
            alert("Channel deleted successfully.");
        } catch (error) {
            console.error("Error deleting channel:", error);
            alert("Failed to delete channel.");
        }
    };

    const CreateChannel = async (channelName) => {
        if (channelName) {
            const channelRef = collection(db, "channels");
            const q = query(channelRef, where("name", "==", channelName));
            const querySnapshot = await getDocs(q);

            console.log(privacy, admin, querySnapshot.empty)
            //to regular channels
            if (querySnapshot.empty && !privacy && admin) {
                const newChannel = await addDoc(channelRef, {
                    name: channelName,
                    members: [user.email], // Initialize with an empty members array
                    isDefault: !privacy,
                });

                //to private channels
            } else if (querySnapshot.empty && (privacy || !admin)) {
                const newChannel = await addDoc(channelRef, {
                    name: channelName,
                    owner: user.email,
                    members: [user.email], // Initialize with an empty members array
                    isDefault: !privacy
                });

            } else {
                alert("Channel already exists");
            }
        }
        else {
            alert ("Enter a channel name!")
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
            position: {x, y}, toggled: true, channel, // Pass the right-clicked channel
        });

        // Highlight the selected channel
        setChannels((prevChannels) => prevChannels.map((ch) => ({
            ...ch, selected: ch.id === channel.id,
        })));

        console.log("Context menu toggled:", true); // Debug log
        console.log("Right-clicked channel:", channel);
    };

    const resetContextMenu = () => {
        setChannels((prevChannels) => prevChannels.map((ch) => ({
            ...ch, selected: false, // Remove highlight from all channels
        })));

        setContextMenu({
            position: {x: 0, y: 0}, toggled: false, channel: null, // Clear the right-clicked channel
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
    }, [contextMenu.toggled]); // Re-attach the listener when the menu is toggled
    //after you create a channel, you will fetch the new channels
    useEffect(() => {
        if (!user) return;
        fetchData().then(r => fetchAllUsers())
    }, [dialogShow,defaultChannels,privateChannels, user]);


    return (<div className="dashboard-layout">
        {/*information and dashboard */}
        <div className="main-content">
            <h1 style={{color: '#ffffff'}}>Dashboard</h1>
            <div className="user-controls">
                <div className="user-info">
                    <div>
                        <div className="user-name">Welcome back, {user.displayName}!</div>
                        <div className="user-role">{admin ? "Admin" : "Member"} </div>
                    </div>
                </div>
                {/*friends button next to name and logout*/}
                <section className="friends-section">
                    <button className="btn btn-primary" style={{background: '#399c48'}} onClick={GoToFriendsList}>
                        Friends
                    </button>
                </section>
                <button className="btn btn-primary" style={{background: '#3498db'}} onClick={GoToProfile}>
                    Profile
                </button>
                <button className="btn btn-primary" style={{background: '#e74c3c'}} onClick={Logout}>
                    Logout
                </button>
            </div>
            {/*channels and display of each channel by buttons*/}
            <section className="channel-management">
                <div className="create-channel">
                    <button className="btn btn-primary" onClick={() => setDialogShow(true)}>
                        Create New Channel
                    </button>
                    {dialogShow ? <div className="overlay">
                        <div className="modal">
                            <p>
                                <div>
                                    <label>
                                        Channel Name:
                                        <input value={channelName} type="text" placeholder="Enter Channel Name"
                                               onChange={(e) => setChannelName(e.target.value)}/>
                                    </label>
                                </div>
                                <p></p>
                                {admin ? <div>
                                    <div>
                                        <label>
                                            Make private?
                                            <input value={privacy} type="checkbox"
                                                   onChange={(e) => setPrivacy(e.target.checked)}/>
                                        </label>
                                    </div>
                                </div> : null}
                            </p>
                            <div>
                                <button onClick={() => {
                                    CreateChannel(channelName)
                                        .then(r => setDialogShow(false))//clear the dialog
                                        .then(r => setChannelName(null))// clear the channel name
                                        .then(r => setPrivacy(false))   // reset privacy checkbox)
                                }}>
                                    Create
                                </button>
                                <button onClick={() => setDialogShow(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div> : null}
                </div>
            </section>
        </div>

        <div className="mid-column">
            {/*list of channels*/}
            <div className="channels-container">
                {/*first is default channels*/}
                <div className="channel-section">
                    <h2>Default Channels</h2>
                    <div className="channel-grid">
                        {defaultChannels.map((channel) => (<div
                            key={channel.id}
                            className="channel-card"
                            onContextMenu={(e) => handleOnContextMenu(e, channel)}
                            onClick={() => GoToChannel(channel)}
                        >
                            <span className="channel-name">{channel.name}</span>
                        </div>))}
                    </div>
                </div>

                {/*private channels here*/}
                <div className="channel-section">
                    <h2>Private Channels</h2>
                    <div className="channel-grid">
                        {privateChannels.map((channel) => (<div
                            key={channel.id}
                            className="channel-card"
                            onContextMenu={(e) => handleOnContextMenu(e, channel)}
                            onClick={() => GoToPrivateChannel(channel)}
                        >
                            <span className="channel-name">{channel.name}</span>
                        </div>))}
                    </div>
                </div>
            </div>
        </div>
        {/*sidebar on the right for registered users.*/}
        {/*maybe add a search function so you can search the person, right click context menu and add them, or directly go to DMs*/}
        <aside className="users-sidebar">
            <h2>Online Users ({allUsers.filter(u => isOnline(u.status)).length})</h2>
            <div className="users-list">
                {allUsers.length > 0 ? (allUsers.map((user, index) => (<div key={index} className="user-card">
                    <span
                        className={`status-indicator ${isOnline(user.status) ? 'status-online' : 'status-offline'}`}></span>

                    <span className="username">{user.displayName}</span>
                    {/*<span className="user-role">{user.role}</span>*/}

                    <div className="user-status">
                        {isOnline(user.status) ? "Online" : formatLastSeen(user.lastSeen, user.status)}
                    </div>
                </div>))) : (<p className="no-users">No users found</p>)}
            </div>
        </aside>

        {/*context menu for our right click stuff*/}
        {/*two functions for now, join and delete*/}
        {/*Maybe add the DM directly or like add as friend*/}
        <ContextMenu
            contextMenuRef={contextMenuRef}
            isToggled={contextMenu.toggled}
            positionX={contextMenu.position.x}
            positionY={contextMenu.position.y}
            buttons={[{
                text: "Join", icon: "", onClick: () => {
                    GoToChannel(contextMenu.channel);
                    resetContextMenu();
                }, isSpacer: false, show: true,
            }, {
                text: "Delete", icon: "", onClick: () => {
                        DeleteChannel(contextMenu.channel.id).then(() => resetContextMenu());
                }, isSpacer: false, show: admin,
            },]}
        />
    </div>);
};

export default Dashboard;
