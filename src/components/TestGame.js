import {useState} from "react";
import {ConnectFour} from "./ConnectFour";

export default function TestGame() {
    const [gameID, setGameID] = useState("LBY9hplhgnPzhttUBLsr");

    return(
        <div>
            <ConnectFour gameID={gameID} />
        </div>
    )
}