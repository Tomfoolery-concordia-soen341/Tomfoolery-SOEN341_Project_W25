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
import {auth, db} from "../config/firebase";

//Pass in gameID which is a uid to use this
export function ConnectFour({gameID}) {

    const [user] = useAuthState(auth);
    //const [snapshot, setSnapshot] = useState(null);
    const [players, setPlayers] = useState([]);
    const [playerNum, setPlayerNum] = useState(0);
    const [opponent, setOpponent] = useState(null);
    const [turn, setTurn] = useState("");
    const [winner, setWinner] = useState("");
    const [game, setGame] = useState("");
    const [showDropButton, setShowDropButton] = useState(false);

    //game board is formatted by an array of arrays, inner arrays will represent each column from bottom to top
    const [gameBoard, setGameBoard] = useState([]);
    const [isStarted, setIsStarted] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const gameStart = async () => {
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
                if (gameDoc.data().players[0] === user.email) {
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

    const fetchUpdates = async () => {

        const gameRef = doc(db, "gameRooms", gameID);
        const unsub = onSnapshot(gameRef, (snapshot) => {
            const gameData = snapshot.data()
            //setGame(gameData.type);
            setPlayers(gameData.players);
            setIsStarted(gameData.isStarted);
            setIsFinished(gameData.isFinished);
            if (gameData.isStarted && turn !== user.email) {
                setTurn(gameData.turn);
                let tempGameBoard = Object.values(gameData.gameBoard);
                setGameBoard(tempGameBoard);
            }
            if (gameData.isFinished) {
                setWinner(gameData.winner);
            }
        })

        console.log("turn at fetch ", turn)

        return () => unsub();
    }


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
        try {
            fetchUpdates()
        } catch (e) {
            console.log(e);
        }
    }, [])

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
        <div>
            {isStarted ?
                <div style={{ display: "flex", gap: "10px" }}>
                    {gameBoard.map((column, colIndex) => {
                        const reversedColumn = [...column].reverse(); // Show bottom at bottom

                        return (
                            <div key={colIndex} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                    {reversedColumn.map((cell, rowIndex) => (
                                        <li
                                            key={rowIndex}
                                            style={{
                                                width: "30px",
                                                height: "30px",
                                                border: "1px solid black",
                                                backgroundColor:
                                                    cell === 1 ? "red" : cell === 2 ? "yellow" : "white",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        />
                                    ))}
                                </ul>
                                {user.email === turn && !isFinished && showDropButton ?
                                <button
                                    style={{
                                        marginTop: "5px",
                                        padding: "5px",
                                        fontSize: "12px",
                                    }}
                                    onClick={() => {setShowDropButton(false); handleClick(colIndex)}}
                                >
                                    Drop
                                </button> : <p></p>}
                            </div>
                        );
                    })}
                </div>
                : <p>waiting for another player to join</p>}
        </div>
    )
}