import React, {useEffect, useRef, useState} from "react";
import {useLocation} from "react-router-dom";
import {
    doc,
    getDocs,
    getDoc,
    collection,
    query,
    where,
    updateDoc,
    serverTimestamp,
    onSnapshot,
    addDoc, arrayUnion,
} from "firebase/firestore";
import {useAuthState} from "react-firebase-hooks/auth";
import {auth, db} from "../../config/firebase";
import { useParams, useNavigate } from "react-router-dom";

//Pass in gameID which is a uid to use this
const ConnectFour = () => {
    const { roomID } = useParams();
    const gameID = roomID; // Align with tictactoe.js usage
    const navigate = useNavigate();

    const leaveGame = () => {
        navigate("/game-lobby");
    };

    const [user] = useAuthState(auth);
    //const [snapshot, setSnapshot] = useState(null);
    const [players, setPlayers] = useState([]);
    const [playerNum, setPlayerNum] = useState(0);
    const [opponent, setOpponent] = useState(null);
    const [turn, setTurn] = useState("");
    const [winner, setWinner] = useState("");
    const [game, setGame] = useState("");
    const [showDropButton, setShowDropButton] = useState(false);
    const [roomName, setRoomName] = useState("");

    //game board is formatted by an array of arrays, inner arrays will represent each column from bottom to top
    const [gameBoard, setGameBoard] = useState([]);
    const [isStarted, setIsStarted] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom(); // Scroll to bottom on messages update
    }, [messages]);

    // Fetch chat messages
    useEffect(() => {
        const chatRef = collection(db, "gameRooms", gameID, "messages");
        const unsubscribe = onSnapshot(chatRef, (snapshot) => {
            const fetchedMessages = snapshot.docs
                .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }))
                .sort((a, b) => a.timestamp?.toMillis() - b.timestamp?.toMillis()); // Sort by timestamp
            setMessages(fetchedMessages);
        });

        return () => unsubscribe();
    }, [gameID]);

    const sendMessage = async () => {
        if (!user || newMessage.trim() === "") return; // Add null check for user

        try {
            const chatRef = collection(db, "gameRooms", gameID, "messages");
            await addDoc(chatRef, {
                text: newMessage,
                sender: user.email,
                timestamp: serverTimestamp(),
            });
            setNewMessage("");
            scrollToBottom(); // Scroll to bottom after sending a message
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const gameStart = async () => {
        if (!user || !user.email) return; // Add null check for user and user.email
        if (isStarted) {
            if (playerNum === 0) {
                if (user.email === players[0]) {
                    setOpponent(players[1]);
                    console.log(opponent);
                    setPlayerNum(1);
                } else {
                    setOpponent(players[0]);
                    console.log(opponent);
                    setPlayerNum(2);
                }
            }
            return;
        }
        if (players.length === 2 && !isStarted) {
            try {
                const gameDoc = await getDoc(doc(db, "gameRooms", gameID));
                //only the first player initializes the game so it is not duplicated
                if (gameDoc.exists() && gameDoc.data().players[0] === user.email) {
                    setIsStarted(gameDoc.data().isStarted);

                    //visualize gameBoard on its side with 6 rows and 7 cols
                    const tempGameBoard =
                        [[0, 0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0]]

                    updateDoc(doc(db, "gameRooms", gameID), {
                        gameBoard: {
                            1: [0, 0, 0, 0, 0, 0],
                            2: [0, 0, 0, 0, 0, 0],
                            3: [0, 0, 0, 0, 0, 0],
                            4: [0, 0, 0, 0, 0, 0],
                            5: [0, 0, 0, 0, 0, 0],
                            6: [0, 0, 0, 0, 0, 0],
                            7: [0, 0, 0, 0, 0, 0]
                        },
                        isStarted: true,
                        turn: gameDoc.data().players[0],
                    });
                }
            } catch (e) {
                console.log(e);
            }
        }

    }

    const fetchUpdates = () => {
        const gameRef = doc(db, "gameRooms", gameID);
        return onSnapshot(gameRef, (snapshot) => {
            const gameData = snapshot.data();
            if (gameData) {
                setPlayers(gameData.players);
                setIsStarted(gameData.isStarted);
                setIsFinished(gameData.isFinished);
                if (gameData.isStarted && user && user.email && turn !== user.email) {
                    setTurn(gameData.turn);
                    let tempGameBoard = Object.values(gameData.gameBoard);
                    setGameBoard(tempGameBoard);
                }
                if (gameData.isFinished) {
                    setWinner(gameData.winner);
                }
            }
        });
    };

    useEffect(() => {
        const unsubscribe = fetchUpdates();
        return () => {
            unsubscribe(); // Ensure proper cleanup
        };
    }, []);

    useEffect(() => {
        if (!user || !user.email) return; // Add null check for user and user.email
        const fetchRoomName = async () => {
            try {
                const roomDoc = await getDoc(doc(db, "gameRooms", gameID));
                if (roomDoc.exists()) {
                    setRoomName(roomDoc.data().name || "Unknown Room");
                }
            } catch (e) {
                console.log(e);
            }
        };
        fetchRoomName();
    }, [gameID, user]);

    //check if there is space in the column
    const currentPlayerMove = async ({selectedCol}) => {
        try {
            for (let i = 0; i < gameBoard[selectedCol].length; i++) {
                if (gameBoard[selectedCol][i] === 0) {
                    let tempGameBoard = gameBoard;
                    tempGameBoard[selectedCol][i] = playerNum;
                    console.log(tempGameBoard)
                    await updateDoc(doc(db, "gameRooms", gameID), {
                        gameBoard: {
                            1: tempGameBoard[0],
                            2: tempGameBoard[1],
                            3: tempGameBoard[2],
                            4: tempGameBoard[3],
                            5: tempGameBoard[4],
                            6: tempGameBoard[5],
                            7: tempGameBoard[6],},
                        status: "started",

                    });
                    finishTurn();
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.log(e);
        }

    }

    //updates the gameboard in database and checks if this player won before giving the turn to other player
    const finishTurn = async () => {

        //false turn makes sure the player cannot add another chip
        //but don't update the db yet so the other player can't do anything during this time
        checkPlayerWon()

    }

    //Player wins if 4 are in a row, column, diagonal left, or diagonal right
    const playerWon =  () => {
        console.log("executing playerWon")
        console.log(gameBoard);
        if (gameBoard.length === 7) {
            //create a new variable for the current game board so it doesn't execute while the gameBoard updates
            const currentGameBoard = gameBoard;
            const cols = currentGameBoard.length;
            const rows = currentGameBoard[0].length;

            //Row
            for (let col = 0; col <= cols - 4; col++) {
                for (let row = 0; row < rows; row++) {
                    if (
                        currentGameBoard[col][row] === playerNum &&
                        currentGameBoard[col + 1][row] === playerNum &&
                        currentGameBoard[col + 2][row] === playerNum &&
                        currentGameBoard[col + 3][row] === playerNum
                    ) {
                        return true;
                    }
                }
            }

            //Column
            for (let col = 0; col < cols; col++) {
                for (let row = 0; row <= rows - 4; row++) {
                    if (
                        currentGameBoard[col][row] === playerNum &&
                        currentGameBoard[col][row + 1] === playerNum &&
                        currentGameBoard[col][row + 2] === playerNum &&
                        currentGameBoard[col][row + 3] === playerNum
                    ) {
                        return true;
                    }
                }
            }

            //Diagonal left
            for (let col = 0; col <= cols - 4; col++) {
                for (let row = 0; row <= rows - 4; row++) {
                    if (
                        currentGameBoard[col][row] === playerNum &&
                        currentGameBoard[col + 1][row + 1] === playerNum &&
                        currentGameBoard[col + 2][row + 2] === playerNum &&
                        currentGameBoard[col + 3][row + 3] === playerNum
                    ) {
                        return true;
                    }
                }
            }

            //Diagonal right
            for (let col = 0; col <= cols - 4; col++) {
                for (let row = 3; row < rows; row++) {
                    if (
                        currentGameBoard[col][row] === playerNum &&
                        currentGameBoard[col + 1][row - 1] === playerNum &&
                        currentGameBoard[col + 2][row - 2] === playerNum &&
                        currentGameBoard[col + 3][row - 3] === playerNum
                    ) {
                        return true;
                    }
                }
            }

            return false;
        }
        return false;
    }

    const checkPlayerWon = async () => {
        try {
            if (playerWon()) {
                await updateDoc(doc(db, "gameRooms", gameID), {
                    isFinished: true,
                    winner: user.email,
                })
            } else {
                await updateDoc(doc(db, "gameRooms", gameID), {
                    turn: opponent,
                })
            }
        } catch (e) {
            console.log(e);
        }

    }

    const handleClick = (colIndex) => {
        if (!user || !user.email) return; // Add null check for user and user.email
        currentPlayerMove({ selectedCol: colIndex });
    };

    const checkUserTurn = () => {
        if (user.email === turn) {
            setShowDropButton(true)
            return true
        } else {
            return false
        }
    }


    useEffect(() => {
        if (!user || !user.email) return; // Add null check for user and user.email
        try {
            fetchUpdates()
        } catch (e) {
            console.log(e);
        }
    }, [user])

    useEffect(() => {
        try {
            gameStart();
        } catch (e) {
            console.log(e);
        }
    }, [isStarted, players])

    useEffect(() => {
        if (turn === user.email) {
            setShowDropButton(true);
        } else {
            setShowDropButton(false);
        }
    }, [turn])


    return (
        <div
            className="container is-flex is-justify-content-center is-align-items-center"
            style={{ height: "100vh", backgroundColor: "#f4f4f4" }} // Match tictactoe.js background
        >
            <div className="box" style={{ width: "80%", maxWidth: "800px" }}>
                <h1 className="title is-4 has-text-centered">Connect Four - {roomName}</h1>
                <div className="has-text-centered mb-4" style={{ display: "flex", justifyContent: "center", gap: "20px", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            backgroundColor: "red", // Player 1 color
                        }}></div>
                        <p><strong>Player 1:</strong> {players[0] || "Waiting..."}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            backgroundColor: "yellow", // Player 2 color
                        }}></div>
                        <p><strong>Player 2:</strong> {players[1] || "Waiting..."}</p>
                    </div>
                </div>
                {isFinished ? (
                    <div className="notification is-primary has-text-centered">
                        <h2 className="title is-4">
                            {winner === user?.email ? "You Win!" : "You Lose!"}
                        </h2>
                        <button
                            className="button is-danger mt-3"
                            onClick={leaveGame}
                        >
                            Leave Game
                        </button>
                    </div>
                ) : isStarted ? (
                    <div className="columns">
                        <div className="column is-two-thirds" style={{ position: "relative" }}>
                            <div className="columns is-gapless">
                                {gameBoard.map((column, colIndex) => {
                                    const reversedColumn = [...column].reverse(); // Show bottom at bottom

                                    return (
                                        <div key={colIndex} className="column is-narrow has-text-centered" style={{ margin: "0 5px" }}>
                                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                                {reversedColumn.map((cell, rowIndex) => (
                                                    <li
                                                        key={rowIndex}
                                                        style={{
                                                            width: "50px",
                                                            height: "50px",
                                                            border: "3px solid black",
                                                            borderRadius: "50%", // Make the cells circular
                                                            backgroundColor:
                                                                cell === 1 ? "red" : cell === 2 ? "yellow" : "white",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            marginBottom: "10px", // Increase vertical gap
                                                        }}
                                                    />
                                                ))}
                                            </ul>
                                            {!isFinished && (
                                                <button
                                                    className={`button is-small mt-2 ${
                                                        user.email === turn ? "is-primary" : "is-light"
                                                    }`}
                                                    onClick={() => {
                                                        if (user.email === turn) {
                                                            setShowDropButton(false);
                                                            handleClick(colIndex);
                                                        }
                                                    }}
                                                    disabled={user.email !== turn} // Disable button if it's not the user's turn
                                                >
                                                    Drop
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}     
                            </div>
                            <button
                    className="button is-danger"
                    style={{ left: "2px" }}
                    onClick={leaveGame}
                >
                    Leave Game
                </button>
                <span style={{
                    position: "absolute",
                    bottom: "10px",
                    right: "10px",
                    fontWeight: "bold"
                }}>
                    {turn === user?.email ? "Your Turn" : `${turn}'s Turn`}
                </span>
                        </div>
                        <div className="column is-one-third" style={{ width: "35%" }}> {/* Adjusted width */}
                            <div className="box" style={{ height: "400px", overflowY: "auto", border: "1px solid #ddd", borderRadius: "8px" }}>
                                <h2 className="title is-5 has-text-centered">Chat</h2>
                                <div className="chat-messages" style={{ padding: "10px" }}>
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className="box"
                                            style={{
                                                marginBottom: "10px",
                                                backgroundColor: message.sender === user?.email ? "#d1e7ff" : "#f9f9f9", // Blue for user, grey for others
                                                border: "1px solid #ddd",
                                                borderRadius: "8px",
                                                padding: "10px",
                                                textAlign: message.sender === user?.email ? "right" : "left", // Align text based on sender
                                            }}
                                        >
                                            <strong>{message.sender === user?.email ? "You" : message.sender}:</strong> {message.text}
                                        </div>
                                    ))}
                                    <div ref={chatEndRef}></div> {/* Reference for auto-scroll */}
                                </div>
                            </div>
                            <div className="field has-addons mt-2">
                                <div className="control is-expanded">
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                sendMessage();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="control">
                                    <button className="button is-primary" onClick={sendMessage}>
                                        Send
                                    </button>
                                </div>
                            </div>
                            
                        </div>
                        
                    </div>
                ) : (
                    <p className="has-text-centered">Waiting for another player to join...</p>
                )}
                

            </div>
        </div>
    )
}

export default ConnectFour;