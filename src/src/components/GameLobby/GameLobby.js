import React, { useEffect, useState } from "react";
import { auth, db } from "../../config/firebase";
import { signOut } from "firebase/auth";
import {
    doc,
    getDoc,
    collection,
    onSnapshot,
    updateDoc,
    serverTimestamp,
    addDoc,
    query,
    where,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const GameLobby = () => {
    const [user] = useAuthState(auth);
    const [username, setUsername] = useState("");
    const [admin, setAdmin] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [showOnlineUsers, setShowOnlineUsers] = useState(false);
    const [gameRooms, setGameRooms] = useState([]);
    const [showCreateGameModal, setShowCreateGameModal] = useState(false);
    const [newGameName, setNewGameName] = useState("");
    const [currentRoom, setCurrentRoom] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;

        const fetchUserData = async () => {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            setUsername(userDoc.data().username || user.email);
            setAdmin(userDoc.data().role === "admin");
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

        const fetchGameRooms = onSnapshot(
            query(collection(db, "gameRooms"), where("gameType", "==", "TicTacToe")),
            (snapshot) => {
                setGameRooms(
                    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
                );
            }
        );

        fetchUserData();

        return () => {
            fetchUsers();
            fetchGameRooms();
        };
    }, [user]);

    const goToDashboard = () => navigate("/dashboard");
    const goToFriends = () => navigate("/friends");
    const goToProfile = () => navigate("/profile");

    const handleLogout = async () => {
        await updateDoc(doc(db, "users", user.uid), {
            status: "inactive",
            lastSeen: serverTimestamp(),
        });
        await signOut(auth);
        navigate("/");
    };

    const createTicTacToeGame = async () => {
        if (!newGameName.trim()) return;

        try {
            const newRoom = {
                gameType: "TicTacToe",
                name: newGameName,
                createdBy: user.email,
                players: [user.email],
                status: "waiting",
                createdAt: serverTimestamp(),
                board: Array(9).fill(null),
                currentPlayer: "X",
            };

            const docRef = await addDoc(collection(db, "gameRooms"), newRoom);
            setCurrentRoom({ id: docRef.id, ...newRoom });
            setShowCreateGameModal(false);
            setNewGameName("");
        } catch (error) {
            console.error("Error creating game room:", error);
        }
    };

    const joinGameRoom = async (room) => {
        if (room.players.length >= 2) {
            alert("This room is already full!");
            return;
        }

        try {
            await updateDoc(doc(db, "gameRooms", room.id), {
                players: [...room.players, user.email],
                status: "playing",
            });
            setCurrentRoom(room);
        } catch (error) {
            console.error("Error joining game room:", error);
        }
    };

    const startGame = (room) => {
        navigate(`/tic-tac-toe/${room.id}`);
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
                        <h1 className="title is-4 has-text-white">Game Lobby</h1>
                    </div>
                </div>

                <div className="navbar-menu">
                    <div className="navbar-start">
                        <div className="navbar-item">
                            <button
                                className="button is-info is-medium"
                                onClick={goToDashboard}
                            >
                <span className="icon">
                  <i className="fas fa-arrow-left"></i>
                </span>
                                <span>Back to Dashboard</span>
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
                {/* Game Lobby Content */}
                <div
                    className={`column ${
                        showOnlineUsers ? "is-three-quarters" : "is-fullwidth"
                    }`}
                >
                    <section className="section">
                        <div className="container">
                            <div className="level">
                                <div className="level-left">
                                    <h2 className="title is-3 has-text-black">Available Games</h2>
                                </div>
                            </div>

                            {/* Games Section */}
                            <div className="box">
                                <h3 className="subtitle is-5 has-text-link">
                  <span className="icon mr-2">
                    <i className="fas fa-gamepad"></i>
                  </span>
                                    Select a Game
                                </h3>
                                <div className="buttons">
                                    <button
                                        className="button is-primary is-medium"
                                        onClick={() => setShowCreateGameModal(true)}
                                    >
                    <span className="icon">
                      <i className="fas fa-times"></i>
                    </span>
                                        <span>Tic Tac Toe</span>
                                    </button>
                                    <button className="button is-primary is-medium" disabled>
                    <span className="icon">
                      <i className="fas fa-chess"></i>
                    </span>
                                        <span>Chess (Coming Soon)</span>
                                    </button>
                                    <button className="button is-primary is-medium" disabled>
                    <span className="icon">
                      <i className="fas fa-dice"></i>
                    </span>
                                        <span>Poker (Coming Soon)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Game Rooms Section */}
                            <div className="box">
                                <h3 className="subtitle is-5 has-text-link">
                  <span className="icon mr-2">
                    <i className="fas fa-door-open"></i>
                  </span>
                                    {currentRoom ? "Current Game Room" : "Active Tic Tac Toe Rooms"}
                                </h3>

                                {currentRoom ? (
                                    <div className="box has-background-info-light">
                                        <div className="content">
                                            <h4 className="title is-4">{currentRoom.name}</h4>
                                            <p className="subtitle is-6">
                                                Created by: {currentRoom.createdBy}
                                            </p>
                                            <div className="tags">
                                                {currentRoom.players.map((player, index) => (
                                                    <span key={index} className="tag is-primary">
                            {player}
                          </span>
                                                ))}
                                            </div>
                                            <p>Status: {currentRoom.status}</p>

                                            {currentRoom.players.length === 2 && (
                                                <button
                                                    className="button is-success mt-3"
                                                    onClick={() => startGame(currentRoom)}
                                                >
                                                    Start Game
                                                </button>
                                            )}

                                            {currentRoom.players.length === 1 && (
                                                <p className="has-text-grey">
                                                    Waiting for another player to join...
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : gameRooms.length > 0 ? (
                                    <div className="table-container">
                                        <table className="table is-fullwidth is-striped">
                                            <thead>
                                            <tr>
                                                <th>Room Name</th>
                                                <th>Created By</th>
                                                <th>Players</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {gameRooms.map((room) => (
                                                <tr key={room.id}>
                                                    <td>{room.name}</td>
                                                    <td>{room.createdBy}</td>
                                                    <td>
                                                        <div className="tags">
                                                            {room.players.map((player, index) => (
                                                                <span key={index} className="tag is-primary">
                                    {player}
                                  </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td>
                              <span className={`tag ${
                                  room.status === "waiting" ? "is-warning" : "is-success"
                              }`}>
                                {room.status}
                              </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="button is-small is-info"
                                                            onClick={() => joinGameRoom(room)}
                                                            disabled={room.players.length >= 2}
                                                        >
                                                            Join
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="content">
                                        <p>No active Tic Tac Toe rooms. Create one to get started!</p>
                                    </div>
                                )}
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

            {/* Create Game Modal */}
            {showCreateGameModal && (
                <div className="modal is-active">
                    <div className="modal-background" onClick={() => setShowCreateGameModal(false)}></div>
                    <div className="modal-card">
                        <header className="modal-card-head">
                            <p className="modal-card-title">Create Tic Tac Toe Game</p>
                            <button
                                className="delete"
                                aria-label="close"
                                onClick={() => setShowCreateGameModal(false)}
                            ></button>
                        </header>
                        <section className="modal-card-body">
                            <div className="field">
                                <label className="label">Game Room Name</label>
                                <div className="control">
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="Enter game room name"
                                        value={newGameName}
                                        onChange={(e) => setNewGameName(e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>
                        <footer className="modal-card-foot">
                            <button className="button is-success" onClick={createTicTacToeGame}>
                                Create Game
                            </button>
                            <button className="button" onClick={() => setShowCreateGameModal(false)}>
                                Cancel
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameLobby;