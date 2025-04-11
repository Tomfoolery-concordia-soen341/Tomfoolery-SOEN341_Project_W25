import React from "react";
import { render, screen } from "@testing-library/react";
import FriendList from "./FriendList";
import { BrowserRouter } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";

// Mock the auth state to simulate a logged-in user
jest.mock("react-firebase-hooks/auth", () => ({
  useAuthState: jest.fn(),
}));

// Mock the firebase config and Firestore functions
jest.mock("../../config/firebase", () => ({
  auth: { currentUser: { email: "test@example.com", uid: "123" } },
  db: {},
}));

// Stub Firestore functions that are used in FriendList
jest.mock("firebase/firestore", () => {
  return {
    collection: jest.fn(),
    getDocs: jest.fn(() =>
      Promise.resolve({ empty: true, docs: [] })
    ),
    query: jest.fn(),
    where: jest.fn(),
    doc: jest.fn(),
    updateDoc: jest.fn(() => Promise.resolve()),
    arrayUnion: jest.fn(),
    arrayRemove: jest.fn(),
    onSnapshot: jest.fn(),
  };
});

// Stub useNavigate from react-router-dom
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

describe("FriendList Component", () => {
  beforeEach(() => {
    // Simulate a logged-in user
    useAuthState.mockReturnValue([{ email: "test@example.com", uid: "123" }]);
  });

  test("renders the Add Friends section", () => {
    render(
      <BrowserRouter>
        <FriendList />
      </BrowserRouter>
    );

    // Check that the input for email search exists on the page
    const emailInput = screen.getByPlaceholderText(/Enter user email/i);
    expect(emailInput).toBeInTheDocument();

    // Check that the heading "Add Friends" is present
    const addFriendsHeading = screen.getByText(/Add Friends/i);
    expect(addFriendsHeading).toBeInTheDocument();
  });
});
