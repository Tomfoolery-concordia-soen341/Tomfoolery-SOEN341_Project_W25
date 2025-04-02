import { render, screen } from '@testing-library/react';
import ContextMenu from './ContextMenu';

describe('ContextMenu Component', () => {
    test('renders context menu with buttons when toggled', () => {
        const mockButtons = [
            { text: 'Join', icon: '➡️', onClick: jest.fn(), isSpacer: false, show: true },
            { text: 'Delete', icon: '🗑️', onClick: jest.fn(), isSpacer: false, show: true },
            { text: 'Hidden', icon: '👀', onClick: jest.fn(), isSpacer: false, show: false },
            { text: '', onClick: jest.fn(), isSpacer: true, show: true },
        ];

        render(
            <ContextMenu
                rightClickItem={{ id: 'test-item' }}
                positionX={100}
                positionY={200}
                isToggled={true}
                buttons={mockButtons}
                contextMenuRef={{ current: null }}
            />
        );

        const menuElement = screen.getByRole('list'); // Changed to 'list'
        expect(menuElement).toHaveClass('context-menu Active');
        expect(screen.getByText('Join')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
        expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
        expect(screen.getByRole('separator')).toBeInTheDocument();
        expect(menuElement).toHaveStyle('top: 202px');
        expect(menuElement).toHaveStyle('left: 102px');
    });
});