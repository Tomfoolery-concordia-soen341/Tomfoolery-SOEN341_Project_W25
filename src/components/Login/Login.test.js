import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

// Mock window.alert
global.alert = jest.fn();

// Mock Firebase auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({
    user: { uid: 'test123' }
  })
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ role: 'user' })
  }),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn()
}));

// Mock the entire firebase config file
jest.mock('../../config/firebase', () => ({
  auth: {},
  db: {}
}));

// Mock useNavigate properly
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Login Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('handles form submission', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Check if signInWithEmailAndPassword was called
    const { signInWithEmailAndPassword } = require('firebase/auth');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password123'
    );
  });

  test('navigates to register page when register link is clicked', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Register here/));
    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  test('navigates to offline friend list when link is clicked', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Click here/));
    expect(mockNavigate).toHaveBeenCalledWith('/OffLineFriendList');
  });
});
