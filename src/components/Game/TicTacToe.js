import React from "react";
import "./TicTacToe.css"; // Import your CSS file for styling
const TicTacToe = () => {
  const TicTacToe = () => {
    const [board, setBoard] = React.useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = React.useState(true);
    const [winner, setWinner] = React.useState(null);

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

    const handleSquareClick = (index) => {
      if (board[index] || winner) return;
      const newBoard = [...board];
      newBoard[index] = isXNext ? "X" : "O";
      setBoard(newBoard);
      setIsXNext(!isXNext);
      const gameWinner = calculateWinner(newBoard);
      if (gameWinner) {
        setWinner(gameWinner);
      }
    };

    const resetGame = () => {
      setBoard(Array(9).fill(null));
      setIsXNext(true);
      setWinner(null);
    };

    return (
      <div className="tic-tac-toe">
        <h2>Tic-Tac-Toe</h2>
        <div className="game-board">
          {board.map((square, index) => (
            <button
              key={index}
              className="square"
              onClick={() => handleSquareClick(index)}
            >
              {square}
            </button>
          ))}
        </div>
        <div className="game-info">
          <div className="status">
            {winner
              ? `Winner: ${winner}`
              : `Next player: ${isXNext ? "X" : "O"}`}
          </div>
          <button
            className="btn btn-primary"
            style={{ background: "#3498db", color: "white" }}
            onClick={resetGame}
          >
            Reset Game
          </button>
        </div>
      </div>
    );
  };

  if (typeof module !== "undefined") {
    module.exports = TicTacToe;
  } else {
    window.TicTacToe = TicTacToe;
  }
};
export default TicTacToe;
