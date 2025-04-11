import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfilePage from './ProfilePage';
import { useAuthState } from 'react-firebase-hooks/auth';

// Mock the firebase and react-firebase-hooks dependencies
jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
  auth: {},
  db: {},
}));

jest.mock('firebase/auth', () => ({
  updateEmail: jest.fn(),
  updatePassword: jest.fn(),
  EmailAuthProvider: {
    credential: jest.fn(),
  },
  reauthenticateWithCredential: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

describe('ProfilePage Component', () => {
  beforeEach(() => {
    // Mock a logged-in user
    useAuthState.mockReturnValue([{ uid: 'test123', email: 'test@example.com' }, false, null]);
    
    // Mock Firestore getDoc response
    const mockGetDoc = require('firebase/firestore').getDoc;
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ displayName: 'Test User', email: 'test@example.com' }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the profile settings page', () => {
    render(<ProfilePage />);
    
    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('allows changing the username', async () => {
    render(<ProfilePage />);
    
    const usernameInput = screen.getByPlaceholderText('Enter username');
    const currentPasswordInput = screen.getAllByPlaceholderText('Current password')[0];
    const updateButton = screen.getAllByText('Update Username')[0];
    
    fireEvent.change(usernameInput, { target: { value: 'NewUsername' } });
    fireEvent.change(currentPasswordInput, { target: { value: 'currentPass123' } });
    fireEvent.click(updateButton);
    
    // You would add assertions for the expected behavior here
  });

  it('shows error when passwords dont match in password update', async () => {
    render(<ProfilePage />);
    
    const newPasswordInput = screen.getByPlaceholderText('New password (min 6 chars)');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    const updateButton = screen.getAllByText('Update Password')[0];
    
    fireEvent.change(newPasswordInput, { target: { value: 'newPass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentPass' } });
    fireEvent.click(updateButton);
    
    // Wait for error to appear
    const errorMessage = await screen.findByText('Passwords do not match');
    expect(errorMessage).toBeInTheDocument();
  });
});