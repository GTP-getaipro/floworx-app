
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../frontend/src/components/Login';
import { useAuth } from '../../frontend/src/contexts/AuthContext';
// Mock the useAuth hook
jest.mock('../../frontend/src/contexts/AuthContext');

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // import and retain the original functionalities
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }), // Simple mock for useLocation
}));

describe('Login Component', () => {
  let mockLogin;
  let mockIsAuthenticated;

  beforeEach(() => {
    // Reset mocks before each test
    mockLogin = jest.fn();
    mockIsAuthenticated = jest.fn();
    useAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: mockIsAuthenticated,
    });
    mockNavigate.mockClear();
  });

  const renderLoginComponent = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  test('renders login form correctly', () => {
    mockIsAuthenticated.mockReturnValue(false);
    renderLoginComponent();

    expect(screen.getByRole('heading', { name: /Sign In to Floworx/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Forgot your password?/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create one here/i })).toBeInTheDocument();
  });

  test('redirects if user is already authenticated', () => {
    mockIsAuthenticated.mockReturnValue(true);
    renderLoginComponent();

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  describe('Form Validation', () => {
    test('shows required error for email when blurred', async () => {
      const user = userEvent.setup();
      mockIsAuthenticated.mockReturnValue(false);
      renderLoginComponent();

      const emailInput = screen.getByLabelText(/Email Address/i);
      await user.click(emailInput);
      await user.tab(); // Blur the input

      expect(await screen.findByText('This field is required')).toBeInTheDocument();
    });

    test('shows invalid email format error', async () => {
      const user = userEvent.setup();
      mockIsAuthenticated.mockReturnValue(false);
      renderLoginComponent();

      const emailInput = screen.getByLabelText(/Email Address/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      expect(await screen.findByText('Invalid email format')).toBeInTheDocument();
    });

    test('shows password min length error', async () => {
      const user = userEvent.setup();
      mockIsAuthenticated.mockReturnValue(false);
      renderLoginComponent();

      const passwordInput = screen.getByLabelText(/Password/i);
      await user.type(passwordInput, '123');
      await user.tab();

      expect(await screen.findByText('Must be at least 8 characters')).toBeInTheDocument();
    });

    test('does not show errors for valid input', async () => {
        const user = userEvent.setup();
        mockIsAuthenticated.mockReturnValue(false);
        renderLoginComponent();

        const emailInput = screen.getByLabelText(/Email Address/i);
        const passwordInput = screen.getByLabelText(/Password/i);

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.tab();

        expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
        expect(screen.queryByText('Invalid email format')).not.toBeInTheDocument();
        expect(screen.queryByText('Must be at least 8 characters')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('calls login function and navigates on successful submission', async () => {
      const user = userEvent.setup();
      mockIsAuthenticated.mockReturnValue(false);
      mockLogin.mockResolvedValue({ success: true });
      renderLoginComponent();

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });

    test('shows loading state during submission', async () => {
        const user = userEvent.setup();
        mockIsAuthenticated.mockReturnValue(false);
        mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves
        renderLoginComponent();

        const emailInput = screen.getByLabelText(/Email Address/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        expect(submitButton).toBeDisabled();
        expect(submitButton.querySelector('svg.animate-spin')).toBeInTheDocument();
    });

    test('displays submission error on failed login', async () => {
        const user = userEvent.setup();
        mockIsAuthenticated.mockReturnValue(false);
        mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
        renderLoginComponent();

        const emailInput = screen.getByLabelText(/Email Address/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'wrongpassword');
        await user.click(submitButton);

        expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('displays generic error on unexpected exception', async () => {
        const user = userEvent.setup();
        mockIsAuthenticated.mockReturnValue(false);
        mockLogin.mockRejectedValue(new Error('Network Error'));
        renderLoginComponent();

        const emailInput = screen.getByLabelText(/Email Address/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        expect(await screen.findByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});