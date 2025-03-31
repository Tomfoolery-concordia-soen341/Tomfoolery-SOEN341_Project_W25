import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import { auth } from '../../config/firebase';

// Mock the firebase auth and hooks
jest.mock('../../config/firebase', () => ({
    auth: {},
    db: {}
}));

jest.mock('react-firebase-hooks/auth', () => ({
    useAuthState: () => [null, false]
}));

jest.mock('firebase/auth', () => ({
    updateEmail: jest.fn(),
    updatePassword: jest.fn(),
    EmailAuthProvider: {
        credential: jest.fn()
    },
    reauthenticateWithCredential: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    getDoc: jest.fn(),
    updateDoc: jest.fn()
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate
}));

describe('ProfilePage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders profile page with all form sections', () => {
        render(
            <MemoryRouter>
                <ProfilePage />
            </MemoryRouter>
        );

        // Check if main heading is present
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();

        // Check if section headings are present
        expect(screen.getByText('Username')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Password')).toBeInTheDocument();

        // Check if input fields are present
        expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();

        // Check all current password fields (expecting 3)
        const currentPasswordInputs = screen.getAllByPlaceholderText('Current password');
        expect(currentPasswordInputs).toHaveLength(3);

        expect(screen.getByPlaceholderText('New password (min 6 chars)')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();

        // Check if submit buttons are present
        const updateButtons = screen.getAllByText(/Update/i);
        expect(updateButtons).toHaveLength(3); // One for each section

        // Check if back button is present
        expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
    });
});