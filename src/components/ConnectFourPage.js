import React, {useState} from "react";
import {ConnectFour} from "./ConnectFour";
import {useParams, useNavigate} from "react-router-dom";

export default function ConnectFourPage() {
    const { roomID } = useParams();
    const navigate = useNavigate();

    const leaveGame = () => {
        navigate("/game-lobby");
    };

    return(
        <div>
            <ConnectFour gameID={roomID} />
            <button className="button is-danger" onClick={leaveGame}>
                Leave Game
            </button>
        </div>
    )
}