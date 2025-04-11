import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContextMenu from './ContextMenu';

describe('ContextMenu Component', () => {
  const mockCloseMenu = jest.fn();
  const mockOnClick1 = jest.fn();
  const mockOnClick2 = jest.fn();

  const defaultProps = {
    position: { x: 100, y: 200 }, // Explicitly defined
    isToggled: true,
    buttons: [
      {
        text: 'Edit',
        icon: <span role="img" aria-label="edit">✏️</span>,
        onClick: mockOnClick1,
        show: true,
      },
      {
        text: 'Delete',
        icon: <span role="img" aria-label="delete">🗑️</span>,
        onClick: mockOnClick2,
        show: false,
      },
      {
        text: 'Share',
        icon: <span role="img" aria-label="share">📤</span>,
        onClick: jest.fn(),
        show: true,
      },
    ],
    contextMenuRef: { current: null },
    closeMenu: mockCloseMenu,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isToggled is false', () => {
    render(<ContextMenu {...defaultProps} isToggled={false} position={{ x: 0, y: 0 }} />);
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Share')).not.toBeInTheDocument();
  });

  it('calls button onClick and closeMenu when a button is clicked', () => {
    render(<ContextMenu {...defaultProps} />);

    // Find and click the 'Edit' button
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    // Verify that both the button's onClick and closeMenu were called
    expect(mockOnClick1).toHaveBeenCalledTimes(1);
    expect(mockCloseMenu).toHaveBeenCalledTimes(1);
  });

  it('renders icons alongside button text', () => {
    render(<ContextMenu {...defaultProps} />);

    // Check that icons are rendered (using aria-label to identify them)
    const editIcon = screen.getByLabelText('edit');
    const shareIcon = screen.getByLabelText('share');
    expect(editIcon).toBeInTheDocument();
    expect(shareIcon).toBeInTheDocument();

    // Verify that the icon and text are in the same button
    const editButton = screen.getByText('Edit').parentElement;
    expect(editButton).toContainElement(editIcon);
  });
});
