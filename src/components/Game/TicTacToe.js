import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../../config/firebase";
import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  getDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import "./TicTacToe.css";

const TicTacToe = () => {
  const [user] = useAuthState(auth);
  const [gameId] = useState("tic-tac-toe-lobby");
  const [gameState, setGameState] = useState({
    board: Array(9).fill(null),
    players: [],
    currentTurn: "X",
    winner: null,
    status: "waiting",
  });
  const [displayNames, setDisplayNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const navigate = useNavigate();
  const chatEndRef = useRef(null); // For auto-scrolling to the latest message

  // Fetch display name for a user
  const fetchUserDisplayName = async (uid) => {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data().displayName || userDoc.data().email;
    }
    return uid;
  };

  // Initialize or join the game
  useEffect(() => {
    if (!user) return;

    const gameRef = doc(db, "games", gameId);

    // Set up the game
    const setupGame = async () => {
      const gameDoc = await getDoc(gameRef);
      if (!gameDoc.exists()) {
        const displayName = await fetchUserDisplayName(user.uid);
        await setDoc(gameRef, {
          board: Array(9).fill(null),
          players: [
            { id: user.uid, symbol: "X", email: user.email, displayName },
          ],
          currentTurn: "X",
          winner: null,
          status: "waiting",
        });
      } else {
        const data = gameDoc.data();
        const activePlayers = data.players.filter((p) => p.status !== "inactive");
        if (activePlayers.length !== data.players.length) {
          await updateDoc(gameRef, {
            players: activePlayers,
            status: activePlayers.length > 0 ? "waiting" : "empty",
          });
        }
        if (
          activePlayers.length < 2 &&
          !activePlayers.some((p) => p.id === user.uid)
        ) {
          const displayName = await fetchUserDisplayName(user.uid);
          const newPlayerSymbol = activePlayers.length === 0 ? "X" : activePlayers[0].symbol === "X" ? "O" : "X";
          const updatedPlayers = [
            ...activePlayers,
            { id: user.uid, symbol: newPlayerSymbol, email: user.email, displayName, status: "active" },
          ];
          await updateDoc(gameRef, {
            players: updatedPlayers,
            status: updatedPlayers.length === 2 ? "active" : "waiting",
            ...(updatedPlayers.length === 1 && {
              board: Array(9).fill(null),
              currentTurn: "X",
              winner: null,
            }),
          });
        }
      }
      setLoading(false);
    };

    setupGame();

    // Real-time listener for game state
    const unsubscribeGame = onSnapshot(gameRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(data);

        const names = {};
        for (const player of data.players) {
          if (!names[player.id]) {
            names[player.id] = await fetchUserDisplayName(player.id);
          }
        }
        setDisplayNames(names);
      }
    });

    // Real-time listener for chat messages
    const messagesRef = collection(db, "games", gameId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(messageList);
    });

    // Clean up on unmount
    return () => {
      unsubscribeGame();
      unsubscribeMessages();
    };
  }, [user, gameId]);

  // Update player status on window unload
  useEffect(() => {
    const handleUnload = async () => {
      if (user) {
        const gameRef = doc(db, "games", gameId);
        const gameDoc = await getDoc(gameRef);
        if (gameDoc.exists()) {
          const data = gameDoc.data();
          const updatedPlayers = data.players.map((p) =>
            p.id === user.uid ? { ...p, status: "inactive" } : p
          );
          const activePlayers = updatedPlayers.filter((p) => p.status !== "inactive");
          await updateDoc(gameRef, {
            players: updatedPlayers,
            status: activePlayers.length > 0 ? "waiting" : "empty",
          });
        }
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user, gameId]);

  // Auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (
        squares[a] &&
        squares[a] === squares[b] &&
        squares[a] === squares[c]
      ) {
        return squares[a];
      }
    }
    return null;
  };

  const handleSquareClick = async (index) => {
    if (
      !user ||
      gameState.board[index] ||
      gameState.winner ||
      gameState.players.filter((p) => p.status !== "inactive").length < 2 ||
      gameState.status !== "active"
    )
      return;

    const player = gameState.players.find((p) => p.id === user.uid);
    if (!player || player.symbol !== gameState.currentTurn) return;

    const newBoard = [...gameState.board];
    newBoard[index] = player.symbol;
    const gameWinner = calculateWinner(newBoard);
    const newTurn = player.symbol === "X" ? "O" : "X";

    await updateDoc(doc(db, "games", gameId), {
      board: newBoard,
      currentTurn: newTurn,
      winner: gameWinner || null,
    });
  };

  const resetGame = async () => {
    await updateDoc(doc(db, "games", gameId), {
      board: Array(9).fill(null),
      currentTurn: "X",
      winner: null,
      status: "active",
    });
  };

  const leaveGame = async () => {
    if (!user) return;

    const gameRef = doc(db, "games", gameId);
    const gameDoc = await getDoc(gameRef);
    if (gameDoc.exists()) {
      const data = gameDoc.data();
      const updatedPlayers = data.players.map((p) =>
        p.id === user.uid ? { ...p, status: "inactive" } : p
      );
      const activePlayers = updatedPlayers.filter((p) => p.status !== "inactive");

      await updateDoc(gameRef, {
        players: updatedPlayers,
        status: activePlayers.length > 0 ? "waiting" : "empty",
      });
    }

    navigate("/dashboard");
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messagesRef = collection(db, "games", gameId, "messages");
    await addDoc(messagesRef, {
      senderId: user.uid,
      senderName: displayNames[user.uid] || user.email,
      text: newMessage.trim(),
      timestamp: serverTimestamp(),
    });

    setNewMessage(""); // Clear the input field
  };

  if (!user) {
    return <div className="tic-tac-toe-container"><div className="tic-tac-toe">Please log in to play!</div></div>;
  }

  if (loading) {
    return <div className="tic-tac-toe-container"><div className="tic-tac-toe">Loading game...</div></div>;
  }

  const getPlayerDisplayName = (symbol) => {
    const player = gameState.players.find(
      (p) => p.symbol === symbol && p.status !== "inactive"
    );
    return player ? displayNames[player.id] : "Waiting...";
  };

  const isWaiting =
    gameState.status === "waiting" ||
    gameState.players.filter((p) => p.status !== "inactive").length < 2;

  const mySymbol = gameState.players.find((p) => p.id === user.uid)?.symbol;
  const isBoardFull = gameState.board.every((square) => square !== null);

  return (
    <div className="tic-tac-toe-container">
      <div className="tic-tac-toe">
        <h2>Tic-Tac-Toe</h2>
        {isWaiting ? (
          <div className="waiting">
            {gameState.players.some((p) => p.id === user.uid && p.status !== "inactive")
              ? "Waiting for another player to join..."
              : "Joining game..."}
            <p>
              Share this game ID with a friend: <strong>{gameId}</strong>
            </p>
            <button
              className="btn btn-primary leave-button"
              onClick={leaveGame}
            >
              Leave Game
            </button>
          </div>
        ) : (
          <>
            <div className="game-content">
              <div className="game-section">
                <div className="players-info">
                  <p>Player X: {getPlayerDisplayName("X")}</p>
                  <p>Player O: {getPlayerDisplayName("O")}</p>
                  <p>Your symbol: {mySymbol || "N/A"}</p>
                </div>
                <div className="game-board">
                  {gameState.board.map((square, index) => (
                    <button
                      key={index}
                      className={`square ${square ? "filled" : ""} ${
                        gameState.winner &&
                        calculateWinner(gameState.board) === square
                          ? "winner"
                          : ""
                      }`}
                      onClick={() => handleSquareClick(index)}
                      disabled={
                        gameState.winner ||
                        !mySymbol ||
                        mySymbol !== gameState.currentTurn
                      }
                    >
                      {square}
                    </button>
                  ))}
                </div>
                <div className="game-info">
                  <div className="status">
                    {gameState.winner
                      ? `Winner: ${gameState.winner}!`
                      : isBoardFull
                      ? "It's a Draw!"
                      : `Next player: ${gameState.currentTurn}`}
                  </div>
                  <button
                    className="btn btn-primary reset-button"
                    onClick={resetGame}
                    disabled={gameState.players.filter((p) => p.status !== "inactive").length < 2}
                  >
                    Reset Game
                  </button>
                  <button
                    className="btn btn-primary leave-button"
                    onClick={leaveGame}
                  >
                    Leave Game
                  </button>
                </div>
              </div>
              <div className="chat-section">
                <h3>Chat</h3>
                <div className="chat-messages">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message ${
                        msg.senderId === user.uid ? "sent" : "received"
                      }`}
                    >
                      <span className="sender">{msg.senderName}:</span> {msg.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={sendMessage} className="chat-input">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={isWaiting}
                  />
                  <button type="submit" disabled={isWaiting || !newMessage.trim()}>
                    Send
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TicTacToe;