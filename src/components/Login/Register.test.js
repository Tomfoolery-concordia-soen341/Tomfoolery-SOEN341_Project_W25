import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // Needed for useNavigate
import Register from './Register'; // Adjust path as needed

// Mock Firebase imports
jest.mock('../../config/firebase', () => ({
    auth: {},
    db: {}
}));

jest.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    setDoc: jest.fn(),
    serverTimestamp: jest.fn()
}));

describe('Register Component', () => {
    test('renders register form with basic elements', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );

        // Check if key elements are present
        expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument(); // Matches either Email label
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Role')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
        expect(screen.getByText('Go back to log in')).toBeInTheDocument();
    });
});