import React from 'react';
import { render } from '@testing-library/react';
import Layout from './Layout';

// Mock the Navbar component to simplify testing
jest.mock('../Navbar/Navbar', () => (props) => (
  <div data-testid="mock-navbar">
    {props.username} | {props.admin ? 'Admin' : 'User'}
  </div>
));

test('renders Navbar and children content correctly', () => {
  const mockProps = {
    username: 'testuser',
    admin: true,
    handleLogout: jest.fn(),
    showOnlineUsers: false,
    setShowOnlineUsers: jest.fn(),
    onlineUserCount: 3,
  };

  const { getByTestId, getByText } = render(
    <Layout {...mockProps}>
      <div>Main Content</div>
    </Layout>
  );

  // Verify Navbar is rendered with correct props
  const navbar = getByTestId('mock-navbar');
  expect(navbar).toHaveTextContent('testuser');
  expect(navbar).toHaveTextContent('Admin');

  // Verify children content is rendered with proper margin
  const content = getByText('Main Content');
  expect(content.parentElement).toHaveStyle('marginTop: 4rem');
});