// TicTacToe.test.js
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// --- Mock React Router Hooks ---
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ roomId: "test-room" }),
    useNavigate: () => jest.fn(),
  };
});

// --- Mock Firebase Configuration ---
jest.mock("../../config/firebase", () => ({
  auth: {}, // dummy auth object
  db: {},   // dummy database object
}));

// --- Mock Auth Hook ---
jest.mock("react-firebase-hooks/auth", () => ({
  useAuthState: () => [{ email: "user@example.com", uid: "user123" }],
}));

// --- Mock Firestore Functions ---
jest.mock("firebase/firestore", () => ({
  __esModule: true,
  // The doc() mock returns an object including a "path" property.
  doc: jest.fn((db, collectionName, id) => ({
    db,
    collectionName,
    id,
    path: `${collectionName}/${id}`,
  })),
  // onSnapshot immediately triggers the callback with a simulated game document snapshot
  // and returns a no-op unsubscribe function.
  onSnapshot: jest.fn((docOrQuery, callback) => {
    if (docOrQuery.path && docOrQuery.path === "gameRooms/test-room") {
      callback({
        exists: () => true,
        data: () => ({
          name: "Test Game",
          players: ["user@example.com", "other@example.com"],
          board: Array(9).fill(null),
          currentPlayer: "X",
          status: "playing",
        }),
      });
    } else {
      // For other onSnapshot calls (e.g. messages), provide an empty snapshot.
      callback({ docs: [] });
    }
    return () => {}; // Always return a function to unsubscribe.
  }),
  updateDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn((db, ...paths) => ({
    db,
    path: paths.join("/"),
  })),
  addDoc: jest.fn(() => Promise.resolve({ id: "msg1" })),
  query: jest.fn((collectionRef, ...conditions) => collectionRef),
  orderBy: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => new Date()),
  // getDocs simulates fetching display names for given emails.
  getDocs: jest.fn(async (q) => ({
    forEach: (fn) => {
      [
        { data: () => ({ email: "user@example.com", displayName: "User One" }) },
        { data: () => ({ email: "other@example.com", displayName: "Other User" }) },
      ].forEach(fn);
    },
  })),
  where: jest.fn(() => ({})),
  deleteDoc: jest.fn(() => Promise.resolve()),
}));

// --- Import the Component After Mocks Are Set Up ---
import TicTacToe from "./TicTacToe";

describe("TicTacToe Component", () => {
  test("renders the Tic Tac Toe room heading", async () => {
    render(
      <BrowserRouter>
        <TicTacToe />
      </BrowserRouter>
    );
    
    // Wait until the loading indicator (the "Loading..." text) is removed.
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });

    // Look for the heading text that includes the game name.
    const heading = await screen.findByText(/Tic Tac Toe - Room: Test Game/i);
    expect(heading).toBeInTheDocument();
  });
});
