import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {AuthContext} from '@contexts/AuthContext';
import {ClientModeContext} from '@contexts/ClientContext';
import {ClientType} from "../enums/clientType";
import Login from '@components/Login';

describe('Login', () => {
    it('offers one-click guardian and child entry in demo mode', async () => {
        const mockLogin = jest.fn().mockResolvedValue(true);
        const mockAuthContext = {
            login: mockLogin,
            register: jest.fn(),
            logout: jest.fn(),
            resetDemo: jest.fn(),
            user: null,
        };

        render(
            <ClientModeContext.Provider value={ClientType.Mock}>
                <AuthContext.Provider value={mockAuthContext}>
                    <Login/>
                </AuthContext.Provider>
            </ClientModeContext.Provider>
        );

        await userEvent.click(screen.getByRole('button', {name: /Try parent demo/}));
        expect(mockLogin).toHaveBeenCalledWith({username: 'demo-parent', password: 'pass123'});

        await userEvent.click(screen.getByRole('button', {name: /Try child demo/}));
        expect(mockLogin).toHaveBeenCalledWith({username: 'demo-maya', password: 'pass123'});
    });

    it('lets a guardian create an account', async () => {
        const mockRegister = jest.fn().mockResolvedValue({ok: true});
        const mockAuthContext = {
            login: jest.fn(),
            register: mockRegister,
            logout: jest.fn(),
            resetDemo: jest.fn(),
            user: null,
        };

        render(
            <AuthContext.Provider value={mockAuthContext as never}>
                <Login/>
            </AuthContext.Provider>
        );

        await userEvent.click(screen.getByRole('button', {name: 'Create an account'}));
        await userEvent.type(screen.getByLabelText('Display name'), 'Test Adult');
        await userEvent.type(screen.getByLabelText('Username'), 'test-adult');
        await userEvent.type(screen.getByLabelText('Password'), 'test-pass-123');
        await userEvent.type(screen.getByLabelText('Confirm password'), 'test-pass-123');
        await userEvent.click(screen.getByRole('button', {name: 'Create account'}));

        expect(mockRegister).toHaveBeenCalledWith({
            displayName: 'Test Adult',
            username: 'test-adult',
            password: 'test-pass-123',
        });
    });

    it('calls the login function with the correct username and password', async () => {
        const mockLogin = jest.fn();
        mockLogin.mockResolvedValue(true);
        const mockLogout = jest.fn();
        const mockUser = null;
        const mockAuthContext = {
            login: mockLogin,
            register: jest.fn(),
            logout: mockLogout,
            resetDemo: jest.fn(),
            user: mockUser
        };

        render(
            <AuthContext.Provider value={mockAuthContext}>
                <Login/>
            </AuthContext.Provider>
        );

        const usernameInput = screen.getByLabelText('Username');
        const passwordInput = screen.getByLabelText('Password');
        const loginButton = screen.getByText('Login');

        await userEvent.type(usernameInput, 'testuser');
        await userEvent.type(passwordInput, 'testpassword');
        await userEvent.click(loginButton);

        expect(mockLogin).toHaveBeenCalledWith({
            username: 'testuser',
            password: 'testpassword',
        });
        expect(screen.queryByText('Login Failed')).not.toBeInTheDocument();
    });

    it('show error message if login fails', async () => {
        const mockLogin = jest.fn();
        mockLogin.mockResolvedValue(false);
        const mockLogout = jest.fn();
        const mockUser = null;
        const mockAuthContext = {
            login: mockLogin,
            register: jest.fn(),
            logout: mockLogout,
            resetDemo: jest.fn(),
            user: mockUser
        };

        render(
            <AuthContext.Provider value={mockAuthContext}>
                <Login/>
            </AuthContext.Provider>
        );

        const usernameInput = screen.getByLabelText('Username');
        const passwordInput = screen.getByLabelText('Password');
        const loginButton = screen.getByText('Login');

        await userEvent.type(usernameInput, 'testuser');
        await userEvent.type(passwordInput, 'testpassword');
        await userEvent.click(loginButton);

        expect(mockLogin).toHaveBeenCalledWith({
            username: 'testuser',
            password: 'testpassword',
        });
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password');
    });

    it('should call login when the enter key is pressed', async () => {
        const mockLogin = jest.fn();
        mockLogin.mockResolvedValue(true);
        const mockLogout = jest.fn();
        const mockUser = null;
        const mockAuthContext = {
            login: mockLogin,
            register: jest.fn(),
            logout: mockLogout,
            resetDemo: jest.fn(),
            user: mockUser
        };

        render(
            <AuthContext.Provider value={mockAuthContext}>
                <Login/>
            </AuthContext.Provider>
        );

        const usernameInput = screen.getByLabelText('Username');
        const passwordInput = screen.getByLabelText('Password');

        await userEvent.type(usernameInput, 'testuser');
        await userEvent.type(passwordInput, 'testpassword');
        await userEvent.type(passwordInput, '{enter}');

        expect(mockLogin).toHaveBeenCalledWith({
            username: 'testuser',
            password: 'testpassword',
        });
        expect(screen.queryByText('Login Failed')).not.toBeInTheDocument();
    });
});
