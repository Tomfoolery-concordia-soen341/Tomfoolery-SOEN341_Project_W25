import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

// Mock Firebase dependencies
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
}));
jest.mock('../../config/firebase', () => ({
  auth: {},
  db: {},
}));

// Mock useNavigate and useLocation from react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: jest.fn(),
}));

describe('Navbar Component', () => {
  const mockHandleLogout = jest.fn();
  const mockSetShowOnlineUsers = jest.fn();
  const defaultProps = {
    username: 'TestUser',
    admin: false,
    handleLogout: mockHandleLogout,
    showOnlineUsers: false,
    setShowOnlineUsers: mockSetShowOnlineUsers,
    onlineUserCount: 0,
  };

  beforeEach(() => {
    // Mock useLocation to return /Dashboard by default
    require('react-router-dom').useLocation.mockReturnValue({
      pathname: '/Dashboard',
    });

    // Mock Firestore onSnapshot for users
    require('firebase/firestore').onSnapshot.mockImplementation((_, callback) => {
      callback({
        docs: [
          {
            id: 'user1',
            data: () => ({
              displayName: 'User One',
              status: 'active',
              lastSeen: null,
            }),
          },
          {
            id: 'user2',
            data: () => ({
              displayName: 'User Two',
              status: 'inactive',
              lastSeen: null,
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

  it('renders the navbar with username and online users button on Dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/Dashboard']}>
        <Navbar {...defaultProps} />
      </MemoryRouter>
    );

    // Wait for async updates from onSnapshot
    await waitFor(() => {
      // Check navbar title
      expect(screen.getByText('Chat Dashboard')).toBeInTheDocument();

      // Check username
      expect(screen.getByText('TestUser')).toBeInTheDocument();

      // Check dropdown menu items
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Friends')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();

      // Check online users button (find by icon since no text initially)
      const onlineUsersButton = screen.getByRole('button', {
        name: '', // No accessible name initially
      });
      expect(onlineUsersButton).toBeInTheDocument();
      expect(onlineUsersButton.querySelector('.fas.fa-users')).toBeInTheDocument();

      // Online users list should not be visible initially
      expect(screen.queryByText('User One')).not.toBeInTheDocument();
    });
  });

  it('displays online users list when showOnlineUsers is true', async () => {
    render(
      <MemoryRouter initialEntries={['/Dashboard']}>
        <Navbar {...defaultProps} showOnlineUsers={true} />
      </MemoryRouter>
    );

    // Wait for async updates from onSnapshot
    await waitFor(() => {
      // Check online users count in button
      expect(screen.getByText(/Online Users \(1\)/i)).toBeInTheDocument();

      // Check online users list
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();

      // Verify active user has success color
      const activeIcon = screen.getByText('User One').previousElementSibling;
      expect(activeIcon).toHaveClass('has-text-success');

      // Verify inactive user has grey-light color
      const inactiveIcon = screen.getByText('User Two').previousElementSibling;
      expect(inactiveIcon).toHaveClass('has-text-grey-light');
    });
  });

  it('renders generic title on non-Dashboard routes', () => {
    require('react-router-dom').useLocation.mockReturnValue({
      pathname: '/profile',
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Navbar {...defaultProps} />
      </MemoryRouter>
    );

    // Check generic title
    expect(screen.getByText('Other Page')).toBeInTheDocument();

    // Online users button should not be visible
    expect(screen.queryByRole('button', { name: /online users/i })).not.toBeInTheDocument();

    // Username should still be visible
    expect(screen.getByText('TestUser')).toBeInTheDocument();
  });

  it('toggles online users visibility when button is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/Dashboard']}>
        <Navbar {...defaultProps} />
      </MemoryRouter>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Chat Dashboard')).toBeInTheDocument();
    });

    // Find the online users button by its icon
    const onlineUsersButton = screen.getByRole('button', {
      name: '', // No accessible name initially
    });
    expect(onlineUsersButton.querySelector('.fas.fa-users')).toBeInTheDocument();

    // Click the button
    fireEvent.click(onlineUsersButton);

    // Verify setShowOnlineUsers was called
    expect(mockSetShowOnlineUsers).toHaveBeenCalledWith(true);
  });

  it('displays admin tag when admin is true', () => {
    render(
      <MemoryRouter initialEntries={['/Dashboard']}>
        <Navbar {...defaultProps} admin={true} />
      </MemoryRouter>
    );

    // Check for admin tag
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});