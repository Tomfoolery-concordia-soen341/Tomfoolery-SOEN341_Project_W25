import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../../config/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

const TicTacToe = () => {
  const { roomId } = useParams();
  const [user] = useAuthState(auth);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const navigate = useNavigate();

  // Listen to game updates
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = onSnapshot(doc(db, "gameRooms", roomId), (doc) => {
      if (doc.exists()) {
        const gameData = doc.data();
        setGame(gameData);
        checkWinner(gameData.board);
        setLoading(false);
      } else {
        // Room doesn't exist
        navigate("/game-lobby");
      }
    });

    return () => unsubscribe();
  }, [roomId, navigate]);

  const checkWinner = (board) => {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    for (let pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        setWinner(board[a]);
        return;
      }
    }

    // Check for draw
    if (!board.includes(null)) {
      setIsDraw(true);
    } else {
      setIsDraw(false);
    }
  };

  const handleCellClick = async (index) => {
    if (
        !game ||
        loading ||
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

  const renderCell = (index) => {
    let cellContent = "";
    if (game?.board[index] === "X") cellContent = "X";
    if (game?.board[index] === "O") cellContent = "O";

    return (
        <div
            key={index}
            className={`cell ${game?.board[index] ? `cell-${game.board[index].toLowerCase()}` : ""}`}
            onClick={() => handleCellClick(index)}
        >
          {cellContent}
        </div>
    );
  };

  const resetGame = async () => {
    try {
      await updateDoc(doc(db, "gameRooms", roomId), {
        board: Array(9).fill(null),
        currentPlayer: "X",
        status: "playing",
      });
      setWinner(null);
      setIsDraw(false);
    } catch (error) {
      console.error("Error resetting game:", error);
    }
  };

  const leaveGame = () => {
    navigate("/game-lobby");
  };

  if (loading) {
    return (
        <div className="section">
          <div className="container">
            <progress className="progress is-small is-primary" max="100">Loading...</progress>
          </div>
        </div>
    );
  }

  if (!game) {
    return (
        <div className="section">
          <div className="container">
            <div className="notification is-danger">
              Game room not found. Returning to lobby...
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="section">
        <div className="container">
          <div className="box">
            <h1 className="title">Tic Tac Toe</h1>
            <h2 className="subtitle">Room: {game.name}</h2>

            <div className="players-info mb-4">
              <div className="tags are-medium">
                {game.players.map((player, index) => (
                    <span
                        key={index}
                        className={`tag is-rounded ${player === user.email ? "is-primary" : "is-info"}`}
                    >
                  {player} ({index === 0 ? "X" : "O"})
                      {game.currentPlayer === (index === 0 ? "X" : "O") && " (Your turn)"}
                </span>
                ))}
              </div>
            </div>

            {game.players.length < 2 && (
                <div className="notification is-warning">
                  Waiting for another player to join...
                </div>
            )}

            {winner && (
                <div className="notification is-success">
                  Player {winner} wins! 🎉
                </div>
            )}

            {isDraw && (
                <div className="notification is-warning">
                  It's a draw! 🤝
                </div>
            )}

            <div className="game-board">
              {Array(9).fill().map((_, index) => renderCell(index))}
            </div>

            <div className="buttons mt-4">
              {(winner || isDraw) && (
                  <button className="button is-primary" onClick={resetGame}>
                    Play Again
                  </button>
              )}
              <button className="button is-danger" onClick={leaveGame}>
                Leave Game
              </button>
            </div>
          </div>
        </div>
      </div>
  );
};

export default TicTacToe;