import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../../config/firebase";
import { deleteDoc, doc, onSnapshot, updateDoc, collection, addDoc, query, orderBy, serverTimestamp, getDocs, where } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import "./TicTacToe.css";

const TicTacToe = () => {
  const { roomId } = useParams();
  const [user] = useAuthState(auth);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [isDraw, setIsDraw] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [displayNames, setDisplayNames] = useState({});
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  const checkWinner = (board) => {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];

    for (let pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { symbol: board[a], line: pattern };
      }
    }
    return { symbol: null, line: [] };
  };

  const fetchDisplayNames = async (emails) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "in", emails));
    const querySnapshot = await getDocs(q);
    const nameMap = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      nameMap[data.email] = data.displayName || data.email;
    });
    return nameMap;
  };

  useEffect(() => {
    if (!roomId || !user) return;

    const unsubscribeGame = onSnapshot(doc(db, "gameRooms", roomId), async (doc) => {
      setLoading(false);
      if (!doc.exists()) {
        navigate("/game-lobby");
        return;
      }

      const gameData = doc.data();
      setGame(gameData);

      if (gameData.status === "deleted" || !gameData.players.includes(user.email)) {
        navigate("/game-lobby");
        return;
      }

      if (gameData.players && gameData.players.length > 0) {
        const names = await fetchDisplayNames(gameData.players);
        setDisplayNames(names);
      }
    });

    const messagesRef = collection(db, "gameRooms", roomId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const unsubscribeMessages = onSnapshot(q, async (snapshot) => {
      const messageList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(messageList);
    });

    const handleBeforeUnload = () => {
      if (game && game.players.includes(user.email)) {
        updateDoc(doc(db, "gameRooms", roomId), {
          players: game.players.filter((p) => p !== user.email),
          status: game.players.length === 2 ? "waiting" : "deleted",
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubscribeGame();
      unsubscribeMessages();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [roomId, user?.email]);

  useEffect(() => {
    if (!game || !game.board) return;

    const { symbol, line } = checkWinner(game.board);
    setWinner(symbol);
    setWinningLine(line);
    setIsDraw(!symbol && !game.board.includes(null));
  }, [game?.board]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCellClick = async (index) => {
    if (
      !game ||
      winner ||
      isDraw ||
      game.board[index] !== null ||
      game.currentPlayer !== (game.players[0] === user.email ? "X" : "O") ||
      game.players.length < 2
    ) {
      return;
    }

    const newBoard = [...game.board];
    newBoard[index] = game.currentPlayer;

    try {
      await updateDoc(doc(db, "gameRooms", roomId), {
        board: newBoard,
        currentPlayer: game.currentPlayer === "X" ? "O" : "X",
      });
    } catch (error) {
      console.error("Error updating game:", error);
    }
  };

  const leaveGame = async () => {
    if (!game) {
      navigate("/game-lobby");
      return;
    }

    try {
      if (game.players.length === 1) {
        await deleteDoc(doc(db, "gameRooms", roomId));
      } else {
        await updateDoc(doc(db, "gameRooms", roomId), {
          players: game.players.filter((p) => p !== user.email),
          status: "waiting",
          board: Array(9).fill(null),
          currentPlayer: "X",
        });
      }
      navigate("/game-lobby");
    } catch (error) {
      console.error("Error leaving game:", error);
    }
  };

  const resetGame = async () => {
    try {
      await updateDoc(doc(db, "gameRooms", roomId), {
        board: Array(9).fill(null),
        currentPlayer: "X",
        status: "playing",
      });
      setWinner(null);
      setWinningLine([]);
      setIsDraw(false);
    } catch (error) {
      console.error("Error resetting game:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messagesRef = collection(db, "gameRooms", roomId, "messages");
    await addDoc(messagesRef, {
      senderEmail: user.email,
      text: newMessage.trim(),
      timestamp: serverTimestamp(),
    });

    setNewMessage("");
  };

  if (loading) {
    return (
      <div className="tic-tac-toe-container">
        <div className="tic-tac-toe">
          <progress className="progress is-small is-primary" max="100">Loading...</progress>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="tic-tac-toe-container">
        <div className="tic-tac-toe">
          <div className="notification is-danger">
            Game room not found. Returning to lobby...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tic-tac-toe-container">
      <div className="tic-tac-toe">
        <h2>Tic Tac Toe - Room: {game.name}</h2>
        <div className="game-content">
          <div className="game-section">
            <div className="players-info">
              {game.players.map((player, index) => (
                <span key={index}>
                  {displayNames[player] || player} ({index === 0 ? "X" : "O"})
                  {game.players.length === 2 && 
                   game.currentPlayer === (index === 0 ? "X" : "O") && 
                   game.players[index] === user.email && 
                   " (Your turn)"}
                </span>
              ))}
            </div>
            {game.players.length < 2 ? (
              <div className="waiting">
                <p>Waiting for another player to join...</p>
                <button className="leave-button" onClick={leaveGame}>Leave Game</button>
              </div>
            ) : (
              <>
                <div className="game-board">
                  {Array(9).fill().map((_, index) => (
                    <div
                      key={index}
                      className={`square ${game.board[index] ? "filled" : ""} ${winner && winningLine.includes(index) ? "winner" : ""}`}
                      onClick={() => handleCellClick(index)}
                    >
                      {game.board[index]}
                    </div>
                  ))}
                </div>
                <div className="game-info">
                  <div className="status">
                    {winner ? `Player ${winner} wins! 🎉` : isDraw ? "It's a draw! 🤝" : `Next: ${game.currentPlayer}`}
                  </div>
                  {(winner || isDraw) && game.players.length === 2 && (
                    <button className="reset-button" onClick={resetGame}>Play Again</button>
                  )}
                  <button className="leave-button" onClick={leaveGame}>Leave Game</button>
                </div>
              </>
            )}
          </div>
          <div className="chat-section">
            <h3>Chat</h3>
            <div className="chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.senderEmail === user.email ? "sent" : "received"}`}
                >
                  {msg.text}
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
                disabled={game.players.length < 2}
              />
              <button type="submit" disabled={!newMessage.trim() || game.players.length < 2}>
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicTacToe;