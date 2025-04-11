import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import Dashboard from './Dashboard';

// Mock Firebase dependencies
jest.mock('firebase/auth', () => ({
  signOut: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(),
}));
jest.mock('../../config/firebase', () => ({
  auth: {},
  db: {},
}));

// Mock react-firebase-hooks
jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: jest.fn(),
}));

// Mock useNavigate from react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset mocks to ensure clean state
    jest.clearAllMocks();

    // Mock useAuthState to return a user
    useAuthState.mockReturnValue([
      { uid: 'test-uid', email: 'test@example.com' },
      false,
      null,
    ]);

    // Mock Firestore getDoc for user data
    jest.spyOn(require('firebase/firestore'), 'getDoc').mockImplementation(() =>
      Promise.resolve({
        data: () => ({
          username: 'TestUser',
          role: 'user',
        }),
      })
    );

    // Mock Firestore onSnapshot for channels and users
    jest.spyOn(require('firebase/firestore'), 'onSnapshot')
      .mockImplementationOnce((_, callback) => {
        // Public channels
        callback({
          docs: [
            {
              id: 'channel1',
              data: () => ({ name: 'General', isDefault: true }),
            },
          ],
        });
        return jest.fn(); // Return unsubscribe function
      })
      .mockImplementationOnce((_, callback) => {
        // Private channels
        callback({
          docs: [
            {
              id: 'private1',
              data: () => ({ name: 'Private Chat', members: ['test@example.com'] }),
            },
          ],
        });
        return jest.fn();
      })
      .mockImplementationOnce((_, callback) => {
        // Users
        callback({
          docs: [
            {
              id: 'user2',
              data: () => ({
                username: 'OtherUser',
                email: 'other@example.com',
                displayName: 'Other User',
                status: 'active',
              }),
            },
          ],
        });
        return jest.fn();
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dashboard with navigation and channel sections', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Dashboard />
        </MemoryRouter>
      );
    });

    // Wait for async updates to complete
    await waitFor(
      () => {
        // Check for navigation bar title
        expect(screen.getByText('Chat Dashboard')).toBeInTheDocument();

        // Check for user greeting
        expect(screen.getByText('TestUser')).toBeInTheDocument();

        // Check for channel section headers
        expect(screen.getByText('Your Channels')).toBeInTheDocument();
        expect(screen.getByText('Public Channels')).toBeInTheDocument();
        expect(screen.getByText('Private Channels')).toBeInTheDocument();

        // Check for channel buttons
        expect(screen.getByText('General')).toBeInTheDocument();
        expect(screen.getByText('Private Chat')).toBeInTheDocument();

        // Check for action buttons
        expect(screen.getByText('New Channel')).toBeInTheDocument();
        expect(screen.getByText('Join Private Channel')).toBeInTheDocument();
        expect(screen.getByText('Game Lobby')).toBeInTheDocument();
      },
      { timeout: 3000 } // Increased timeout for stability
    );

    // Verify onSnapshot was called correctly
    expect(require('firebase/firestore').onSnapshot).toHaveBeenCalledTimes(3);
  });
});