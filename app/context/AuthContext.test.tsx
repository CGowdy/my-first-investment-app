import React from 'react';
import {act, render} from '@testing-library/react';
import {AuthProvider, useAuth} from '@contexts/AuthContext'; // Update with the actual path
import {ClientContext} from './ClientContext';

// Mock user and login data
const mockUser = { _id: '123', username: 'testUser' };
const mockLoginData = { username: 'testUser', password: 'password' };
const mockRegistrationData = {username: 'newGuardian', displayName: 'New Guardian', password: 'password'};

// Mock implementation for ClientContext
const mockClientContext = {
    auth: jest.fn(),
    registerGuardian: jest.fn(),
    getSession: jest.fn(),
    logout: jest.fn(),
    addChildUser: jest.fn(),
    deleteChildAccount: jest.fn(),
    getChildAccount: jest.fn(),
    getChildAccounts: jest.fn(),
    sendRequest: jest.fn(),
    getPendingRequestsForChild: jest.fn(),
    getPendingRequestsForParent: jest.fn(),
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
    adjustBalance: jest.fn()
};

// Helper component to use the AuthContext
const ConsumerComponent = () => {
    const { user, login, register, logout } = useAuth()!;
    return (
        <div>
            {user ? <div data-testid="user">{user.username}</div> : <div data-testid="no-user">No User</div>}
            <button data-testid="login-button" onClick={() => login(mockLoginData)}>Login</button>
            <button data-testid="register-button" onClick={() => register(mockRegistrationData)}>Register</button>
            <button data-testid="logout-button" onClick={() => logout()}>Logout</button>
        </div>
    );
};

describe('AuthProvider', () => {
    beforeEach(() => {
        jest.resetAllMocks(); // Reset mock functions before each test
        mockClientContext.getSession.mockResolvedValue(null);
        mockClientContext.logout.mockResolvedValue(undefined);
    });

    it('logs in and sets user correctly', async () => {
        mockClientContext.auth.mockResolvedValue(mockUser);

        const { getByTestId, findByTestId } = render(
            <ClientContext.Provider value={mockClientContext}>
                <AuthProvider>
                    <ConsumerComponent />
                </AuthProvider>
            </ClientContext.Provider>
        );

        const loginButton = getByTestId('login-button');
        act(() => {
            loginButton.click();
        });

        const userDiv = await findByTestId('user');
        expect(userDiv).toHaveTextContent(mockUser.username);

        expect(mockClientContext.auth).toHaveBeenCalledWith(mockLoginData);
    });

    it('handles login failure correctly', async () => {
        mockClientContext.auth.mockResolvedValue(null);

        const { getByTestId, findByTestId } = render(
            <ClientContext.Provider value={mockClientContext}>
                <AuthProvider>
                    <ConsumerComponent />
                </AuthProvider>
            </ClientContext.Provider>
        );

        const loginButton = getByTestId('login-button');
        act(() => {
            loginButton.click();
        });

        const noUserDiv = await findByTestId('no-user');
        expect(noUserDiv).toHaveTextContent('No User');
    });

    it('registers a guardian and sets the authenticated user', async () => {
        mockClientContext.registerGuardian.mockResolvedValue(mockUser);

        const {getByTestId, findByTestId} = render(
            <ClientContext.Provider value={mockClientContext}>
                <AuthProvider>
                    <ConsumerComponent/>
                </AuthProvider>
            </ClientContext.Provider>
        );

        act(() => {
            getByTestId('register-button').click();
        });

        await expect(findByTestId('user')).resolves.toHaveTextContent(mockUser.username);
        expect(mockClientContext.registerGuardian).toHaveBeenCalledWith(mockRegistrationData);
    });

    it('does not let stale session restoration overwrite a successful login', async () => {
        let resolveSession: (user: null) => void = () => undefined;
        mockClientContext.getSession.mockReturnValue(new Promise(resolve => {
            resolveSession = resolve;
        }));
        mockClientContext.auth.mockResolvedValue(mockUser);

        const {getByTestId, findByTestId} = render(
            <ClientContext.Provider value={mockClientContext}>
                <AuthProvider>
                    <ConsumerComponent />
                </AuthProvider>
            </ClientContext.Provider>
        );

        act(() => {
            getByTestId('login-button').click();
        });
        await expect(findByTestId('user')).resolves.toHaveTextContent(mockUser.username);

        await act(async () => {
            resolveSession(null);
        });

        expect(getByTestId('user')).toHaveTextContent(mockUser.username);
    });

    it('clears user on logout', async () => {
        // Pre-set the user to simulate a logged-in state
        mockClientContext.auth.mockResolvedValue(mockUser);

        const { getByTestId, findByTestId } = render(
            <ClientContext.Provider value={mockClientContext}>
                <AuthProvider>
                    <ConsumerComponent />
                </AuthProvider>
            </ClientContext.Provider>
        );

        // Log in the user
        const loginButton = getByTestId('login-button');
        act(() => {
            loginButton.click();
        });

        await findByTestId('user'); // Wait for the user to be set

        // Log out the user
        const logoutButton = getByTestId('logout-button');
        act(() => {
            logoutButton.click();
        });

        const noUserDiv = await findByTestId('no-user');
        expect(noUserDiv).toHaveTextContent('No User');
        expect(mockClientContext.logout).toHaveBeenCalled();
    });
});
