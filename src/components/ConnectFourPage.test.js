import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useParams, useNavigate } from 'react-router-dom';
import ConnectFourPage from './ConnectFourPage';

// Mock the ConnectFour component
jest.mock('./ConnectFour', () => {
  return {
    ConnectFour: ({ gameID }) => <div data-testid="connect-four">Connect Four Game ID: {gameID}</div>,
  };
});

// Mock React Router hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}));

describe('ConnectFourPage Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    // Mock useParams to return a roomID
    useParams.mockReturnValue({ roomID: 'test-room-id' });

    // Mock useNavigate to return a mock function
    useNavigate.mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders ConnectFour with correct gameID and navigates on leave', () => {
    render(
      <MemoryRouter initialEntries={['/connect-four/test-room-id']}>
        <ConnectFourPage />
      </MemoryRouter>
    );

    // Check that ConnectFour is rendered with the correct gameID
    const connectFour = screen.getByTestId('connect-four');
    expect(connectFour).toBeInTheDocument();
    expect(connectFour).toHaveTextContent('Connect Four Game ID: test-room-id');

    // Check that the Leave Game button is rendered
    const leaveButton = screen.getByRole('button', { name: /leave game/i });
    expect(leaveButton).toBeInTheDocument();
    expect(leaveButton).toHaveClass('button is-danger');

    // Simulate clicking the Leave Game button
    fireEvent.click(leaveButton);

    // Verify navigation to /game-lobby
    expect(mockNavigate).toHaveBeenCalledWith('/game-lobby');
  });
});