import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FriendList from './FriendList';
import {arrayRemove} from "firebase/firestore";

// 1. First mock all dependencies at the top level
jest.mock('react-firebase-hooks/auth', () => ({
    useAuthState: jest.fn(),
}));

const mockArrayRemove = jest.fn();
jest.mock('firebase/firestore', () => ({
    ...jest.requireActual('firebase/firestore'),
    arrayRemove: mockArrayRemove
}));



window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock Firebase Firestore with all required functions
jest.mock('firebase/firestore', () => {
    const originalModule = jest.requireActual('firebase/firestore');
    return {
        ...originalModule,
        collection: jest.fn(),
        getDocs: jest.fn(),
        query: jest.fn(),
        where: jest.fn(),
        doc: jest.fn(),
        updateDoc: jest.fn(),
        serverTimestamp: jest.fn(() => 'mock-timestamp'),
        arrayUnion: jest.fn(),
        arrayRemove: jest.fn(),
        orderBy: jest.fn(),
        onSnapshot: jest.fn(),
        addDoc: jest.fn(),
    };
});


jest.mock('../../config/firebase', () => ({
    auth: {},
    db: {},
}));

jest.mock('react-router-dom', () => ({
    useNavigate: jest.fn(),
}));

// 2. Import mocked modules after setting up mocks
const { useAuthState } = require('react-firebase-hooks/auth');
const {
    collection,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    serverTimestamp,
    onSnapshot,
    addDoc
} = require('firebase/firestore');
const { useNavigate } = require('react-router-dom');

describe('FriendList Component - Basic Rendering', () => {
    const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com'
    };
    const mockExistingFriend = {
        email: 'existing@example.com',
        displayName: 'existing',
        status: 'active',
        lastSeen: { toDate: () => new Date() },
    };

    beforeEach(() => {
        // Mock user as authenticated
        useAuthState.mockReturnValue([mockUser]);

        // Mock Firestore responses
        getDocs.mockResolvedValue({
            empty: true,
            docs: []
        });

        updateDoc.mockResolvedValue();
        doc.mockReturnValue({});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders the basic structure without crashing', async () => {
        render(<FriendList />);

        // Verify main sections render
        expect(screen.getByText('Add Friends')).toBeInTheDocument();
        expect(screen.getByText('Friends')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter user email')).toBeInTheDocument();
        expect(screen.getByText('Search')).toBeInTheDocument();
        expect(screen.getByText('Go back to the Dashboard')).toBeInTheDocument();

        // Verify empty friends list message
        expect(await screen.findByText('No friends added yet')).toBeInTheDocument();
    });
    it('allows selecting a friend and sending a message', async () => {
        const mockFriend = {
            id: 'friend123',
            email: 'friend@example.com',
            displayName: 'Test Friend',
            status: 'active',
            lastSeen: { toDate: () => new Date() }
        };

        // Mock getDocs to return our friend
        getDocs.mockImplementation((q) => {
            if (where.mock.calls.some(call => call[1] === '==')) {
                return Promise.resolve({
                    empty: false,
                    docs: [{
                        id: mockUser.uid,
                        data: () => ({
                            friends: [mockFriend.email],
                            email: mockUser.email
                        })
                    }]
                });
            }
            return Promise.resolve({
                docs: [{
                    id: mockFriend.id,
                    data: () => mockFriend
                }]
            });
        });

        render(<FriendList />);

        // Find by test ID instead of text
        const friendElement = await screen.findByTestId(`friend-item-${mockFriend.email}`);
        fireEvent.click(friendElement);

        // Verify chat opened
        await waitFor(() => {
            expect(screen.getByText(`Chat with ${mockFriend.email}`)).toBeInTheDocument();
        });

        // Verify scrollIntoView was called
        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();

        // Send message
        const messageInput = screen.getByPlaceholderText('Type a message...');
        fireEvent.change(messageInput, { target: { value: 'Hello!' } });
        fireEvent.click(screen.getByText('Send'));

        // Verify message was sent
        await waitFor(() => {
            expect(addDoc).toHaveBeenCalled();
        });
    });
    it('successfully adds a friend', async () => {
        const mockNewFriend = {
            id: 'new-friend-123',
            email: 'newfriend@example.com',
            displayName: 'New Friend',
            status: 'active'
        };

        // Mock search results
        require('firebase/firestore').getDocs.mockResolvedValue({
            docs: [{
                id: mockNewFriend.id,
                data: () => mockNewFriend
            }]
        });

        render(<FriendList />);

        // Search for a user
        const searchInput = screen.getByPlaceholderText('Enter user email');
        fireEvent.change(searchInput, { target: { value: 'newfriend@example.com' } });
        fireEvent.click(screen.getByText('Search'));

        // Wait for and verify search results
        await waitFor(() => {
            // Find the list item containing the email and Add button
            const listItems = screen.getAllByRole('listitem');
            const targetItem = listItems.find(item =>
                item.textContent.includes('newfriend@example.com') &&
                item.textContent.includes('Add')
            );

            expect(targetItem).toBeInTheDocument();

            // Find the Add button within this list item
            const addButton = within(targetItem).getByRole('button', { name: /add/i });
            fireEvent.click(addButton);
        });

        // Verify friend was added
        await waitFor(() => {
            expect(require('firebase/firestore').updateDoc).toHaveBeenCalled();
            expect(screen.getByText(/user added as friend!/i)).toBeInTheDocument();
        });
    });
    it('successfully removes a friend', async () => {

        require('firebase/firestore').getDocs.mockImplementation((q) => {
            if (require('firebase/firestore').where.mock.calls.some(call => call[1] === '==')) {
                return Promise.resolve({
                    empty: false,
                    docs: [{
                        id: mockUser.uid,
                        data: () => ({
                            friends: [mockExistingFriend.email],
                            email: mockUser.email
                        })
                    }]
                });
            }
            return Promise.resolve({
                docs: [{
                    id: mockExistingFriend.id,
                    data: () => mockExistingFriend
                }]
            });
        });

        render(<FriendList />);

        // Debug: Show current DOM state
        screen.debug();

        // Wait for friend item to appear
        const friendItem = await screen.findByTestId(
            `friend-item-${mockExistingFriend.email}`,
            {},
            { timeout: 3000 } // Increased timeout
        );

        // Verify friend details
        expect(within(friendItem).getByTestId('friend-username'))
            .toHaveTextContent('');

        // Click remove button
        const removeButton = within(friendItem).getByTestId(
            `remove-friend-btn-${mockExistingFriend.email}`
        );
        fireEvent.click(removeButton);

        // Verify removal
        await waitFor(() => {
            expect(require('firebase/firestore').updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                { friends: mockArrayRemove(mockExistingFriend.email) }
            );
            expect(screen.getByText(/removed from friends list/i)).toBeInTheDocument();
        });
    });
});