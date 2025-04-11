import React from "react";
import { render, screen } from "@testing-library/react";
import MessageModal from "./Message"; // adjust the import path as needed

// --- MOCK FIREBASE CONFIGURATION ---
jest.mock("../../config/firebase", () => ({
  db: {}, // dummy db for testing
  auth: {}, // dummy auth (not used directly in our test)
}));

// --- MOCK AUTH HOOK ---
jest.mock("react-firebase-hooks/auth", () => ({
  useAuthState: () => [{ email: "user@example.com", uid: "user123" }],
}));

// --- MOCK FIRESTORE FUNCTIONS ---
// We only need minimal implementations for the functions used by MessageModal.
jest.mock("firebase/firestore", () => ({
  __esModule: true,
  addDoc: jest.fn(() => Promise.resolve({ id: "msg1" })),
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => new Date()),
  // onSnapshot will simulate an empty conversation (i.e. no messages)
  onSnapshot: jest.fn((q, callback) => {
    // Simulate an empty messages snapshot
    callback({ docs: [] });
    return () => {}; // Always return a no-op unsubscribe function.
  }),
  orderBy: jest.fn(),
  query: jest.fn(),
}));

describe("MessageModal Component", () => {
  test("renders the modal and shows header and conversation placeholder", () => {
    // Render the modal in the open state.
    // Pass a friend object and an empty onlineUsers array.
    const dummyOnClose = jest.fn();
    render(
      <MessageModal
        isOpen={true}
        onClose={dummyOnClose}
        friend={{ email: "friend@example.com" }}
        onlineUsers={[]}
      />
    );

    // Check that the modal header shows the friend's email.
    expect(screen.getByText(/Message friend@example.com/i)).toBeInTheDocument();

    // Since onSnapshot returns no messages, the conversation log
    // should inform the user that there are no messages yet.
    expect(screen.getByText(/No messages yet./i)).toBeInTheDocument();
  });
});
