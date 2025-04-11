import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import Channel from './Channel';
import { auth, db } from '../../config/firebase';

// Mock Firebase dependencies
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  arrayRemove: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));
jest.mock('../../config/firebase', () => ({
  auth: {},
  db: {},
}));

// Mock react-firebase-hooks
jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: jest.fn(),
}));

// Mock React Router
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: jest.fn(),
}));

// Mock ContextMenu component
jest.mock('../ContextMenu/ContextMenu', () => ({ position, isToggled, buttons, contextMenuRef, closeMenu }) =>
  isToggled ? <div data-testid="context-menu">Context Menu</div> : null
);

describe('Channel Component', () => {
  const mockChannel = {
    id: 'channel1',
    name: 'Test Channel',
    isDefault: false,
  };

  beforeEach(() => {
    // Mock useAuthState to return a user
    useAuthState.mockReturnValue([
      { uid: 'test-uid', email: 'test@example.com' },
      false,
      null,
    ]);

    // Mock useLocation to return channel state
    require('react-router-dom').useLocation.mockReturnValue({
      state: { channel: mockChannel },
    });

    // Mock getDoc for user and channel data
    require('firebase/firestore').getDoc
      .mockResolvedValueOnce({
        data: () => ({ role: 'user', displayName: 'Test User' }),
      }) // User doc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          members: ['test@example.com'],
          owner: 'owner@example.com',
          request: [],
        }),
      }); // Channel doc

    // Mock getDocs for all users, online users, and display names
    require('firebase/firestore').getDocs.mockImplementation((queryOrCollection) => {
      // Check if it's a query (has _query) or a plain collection reference
      const isQuery = !!queryOrCollection._query;
      if (isQuery && queryOrCollection._query?.filters?.[0]?.field === 'isOnline') {
        // Online users query
        return Promise.resolve({
          docs: [],
          forEach: jest.fn(),
        });
      }
      // All users query or collection (fetchAllUsers, fetchUserDisplayNames)
      return Promise.resolve({
        docs: [
          { id: 'user1', data: () => ({ email: 'test@example.com', displayName: 'Test User', status: 'active' }) },
          { id: 'user2', data: () => ({ email: 'other@example.com', displayName: 'Other User', status: 'inactive' }) },
        ],
        forEach: (cb) => {
          [
            { id: 'user1', data: () => ({ email: 'test@example.com', displayName: 'Test User', status: 'active' }) },
            { id: 'user2', data: () => ({ email: 'other@example.com', displayName: 'Other User', status: 'inactive' }) },
          ].forEach(cb);
        },
      });
    });

    // Mock onSnapshot for messages
    require('firebase/firestore').onSnapshot.mockImplementation((_, callback) => {
      callback({
        docs: [
          {
            id: 'msg1',
            data: () => ({
              text: 'Hello',
              sender: 'test@example.com',
              timestamp: { toDate: () => new Date('2023-01-01T12:00:00') },
            }),
          },
        ],
      });
      return jest.fn(); // Unsubscribe function
    });

    // Mock window.confirm
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders channel name, chat area, and toggles sidebar', async () => {
    render(
      <MemoryRouter initialEntries={['/channel']}>
        <Channel />
      </MemoryRouter>
    );

    // Wait for async data fetching and message rendering
    await waitFor(() => {
      // Check channel name
      expect(screen.getByText('Test Channel')).toBeInTheDocument();

      // Check chat message (match full text including sender and colon)
      expect(screen.getByText('Test User: Hello')).toBeInTheDocument();

      // Check sidebar toggle button (initially closed)
      const toggleButton = screen.getByRole('button', { name: /users/i });
      expect(toggleButton).toHaveClass('is-primary');
      expect(screen.queryByText('Channel Members')).not.toBeInTheDocument();

      // Click to open sidebar
      fireEvent.click(toggleButton);
      expect(screen.getByText('Channel Members')).toBeInTheDocument();
      expect(toggleButton).toHaveClass('is-danger');

      // Check leave channel and back to dashboard buttons
      expect(screen.getByText('Leave Channel')).toBeInTheDocument();
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    }, { timeout: 2000 }); // Increase timeout if needed
  });
});