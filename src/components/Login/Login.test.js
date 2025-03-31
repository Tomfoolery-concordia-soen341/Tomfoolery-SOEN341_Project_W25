import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

// Mock Firebase imports
jest.mock('../../config/firebase', () => ({
  auth: {},
  db: {}
}));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn()
}));

describe('Login Component', () => {
  test('renders login form with basic elements', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Check if key elements are present
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument(); // Targets the h1 specifically
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Create an account ?')).toBeInTheDocument();
    expect(screen.getByText('Send Messages Offline ?')).toBeInTheDocument();
  });
});