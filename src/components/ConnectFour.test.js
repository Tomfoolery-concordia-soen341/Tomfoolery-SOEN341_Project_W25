import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ConnectFour } from './ConnectFour';
import { auth, db } from '../config/firebase';

// Mock Firebase dependencies
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  arrayUnion: jest.fn(),
}));
jest.mock('../config/firebase', () => ({
  auth: {},
  db: {},
}));

// Mock react-firebase-hooks
jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: jest.fn(),
}));

describe('ConnectFour Component', () => {
  const gameID = 'test-game-id';
  const mockUser = { uid: 'user1', email: 'player1@example.com' };

  beforeEach(() => {
    // Mock useAuthState to return a user
    useAuthState.mockReturnValue([mockUser, false, null]);

    // Mock getDoc for game room data
    require('firebase/firestore').getDoc.mockResolvedValue({
      data: () => ({
        players: ['player1@example.com', 'player2@example.com'],
        isStarted: true,
        isFinished: false,
        turn: 'player1@example.com',
        gameBoard: {
          1: [0, 0, 0, 0, 0, 0],
          2: [0, 0, 0, 0, 0, 0],
          3: [0, 0, 0, 0, 0, 0],
          4: [0, 0, 0, 0, 0, 0],
          5: [0, 0, 0, 0, 0, 0],
          6: [0, 0, 0, 0, 0, 0],
          7: [0, 0, 0, 0, 0, 0],
        },
      }),
    });

    // Mock onSnapshot for real-time updates
    require('firebase/firestore').onSnapshot.mockImplementation((_, callback) => {
      callback({
        data: () => ({
          players: ['player1@example.com', 'player2@example.com'],
          isStarted: true,
          isFinished: false,
          turn: 'player1@example.com',
          gameBoard: {
            1: [0, 0, 0, 0, 0, 0],
            2: [0, 0, 0, 0, 0, 0],
            3: [0, 0, 0, 0, 0, 0],
            4: [0, 0, 0, 0, 0, 0],
            5: [0, 0, 0, 0, 0, 0],
            6: [0, 0, 0, 0, 0, 0],
            7: [0, 0, 0, 0, 0, 0],
          },
        }),
      });
      return jest.fn(); // Unsubscribe function
    });

    // Mock updateDoc to resolve successfully
    require('firebase/firestore').updateDoc.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders waiting message when game is not started', async () => {
    require('firebase/firestore').onSnapshot.mockImplementation((_, callback) => {
      callback({
        data: () => ({
          players: ['player1@example.com'],
          isStarted: false,
          isFinished: false,
          turn: '',
          gameBoard: {},
        }),
      });
      return jest.fn();
    });

    render(<ConnectFour gameID={gameID} />);

    await waitFor(() => {
      expect(screen.getByText('waiting for another player to join')).toBeInTheDocument();
      expect(screen.queryByText('Drop')).not.toBeInTheDocument();
    });
  });
});