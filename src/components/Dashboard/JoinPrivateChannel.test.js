import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import PublicChannelsPrompt from './PublicChannelsPrompt';

// Mock Firebase dependencies
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn(),
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

describe('PublicChannelsPrompt Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    // Mock useAuthState to return a user
    useAuthState.mockReturnValue([
      { uid: 'test-uid', email: 'test@example.com' },
      false,
      null,
    ]);

    // Mock Firestore onSnapshot for private channels
    require('firebase/firestore').onSnapshot.mockImplementation((_, callback) => {
      callback({
        docs: [
          {
            id: 'channel1',
            data: () => ({
              name: 'Private Channel 1',
              members: ['other@example.com'],
            }),
          },
          {
            id: 'channel2',
            data: () => ({
              name: 'Private Channel 2',
              members: ['another@example.com'],
            }),
          },
        ],
      });
      return jest.fn(); // Return unsubscribe function
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with private channels and close button', async () => {
    render(
      <MemoryRouter>
        <PublicChannelsPrompt onClose={mockOnClose} />
      </MemoryRouter>
    );

    // Wait for async updates from onSnapshot
    await waitFor(() => {
      // Check modal title
      expect(screen.getByText('Request to Join Private Channels')).toBeInTheDocument();

      // Check section header
      expect(screen.getByText('Available Private Channels')).toBeInTheDocument();

      // Check channel list
      expect(screen.getByText('Private Channel 1')).toBeInTheDocument();
      expect(screen.getByText('Private Channel 2')).toBeInTheDocument();

      // Check close button
      expect(screen.getByText('Close')).toBeInTheDocument();

      // Check modal background (verify it exists)
      expect(screen.getByRole('dialog')).toHaveClass('modal is-active');
    });
  });

  it('displays message when no private channels are available', async () => {
    // Override onSnapshot to return empty list
    require('firebase/firestore').onSnapshot.mockImplementationOnce((_, callback) => {
      callback({
        docs: [],
      });
      return jest.fn();
    });

    render(
      <MemoryRouter>
        <PublicChannelsPrompt onClose={mockOnClose} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No private channels available to join.')).toBeInTheDocument();
    });
  });
});