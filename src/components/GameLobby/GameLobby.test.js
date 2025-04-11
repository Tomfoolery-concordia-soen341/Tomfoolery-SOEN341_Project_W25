// GameLobby.test.js
import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Make sure these mocks are at the top of the file, before importing your component.
jest.mock("../../config/firebase", () => ({
  auth: {}, // dummy object
  db: {},   // dummy object
}));

jest.mock("firebase/firestore", () => ({
  __esModule: true, // ensures proper handling as an ES module
  doc: jest.fn((db, collectionName, uid) => ({ db, collectionName, uid })),
  getDoc: jest.fn(async () => ({
    exists: () => true,
    data: () => ({ username: "TestUser", role: "user" }),
  })),
  collection: jest.fn(),
  onSnapshot: jest.fn((_, callback) => callback({ docs: [] })),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  deleteDoc: jest.fn(),
}));

// Mock the react-firebase-hooks/auth module to simulate an authenticated user
jest.mock("react-firebase-hooks/auth", () => ({
  useAuthState: () => [{ uid: "user123", email: "user@example.com" }],
}));

// Now import your component after the mocks have been defined.
import GameLobby from "./GameLobby";

describe("GameLobby Component", () => {
  test("renders the Game Lobby heading", async () => {
    render(
      <BrowserRouter>
        <GameLobby />
      </BrowserRouter>
    );
    
    // Await for the heading that should be rendered after user data is loaded.
    const headingElement = await screen.findByText(/Game Lobby/i);
    expect(headingElement).toBeInTheDocument();
  });
});
