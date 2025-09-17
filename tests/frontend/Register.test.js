
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from '../../frontend/src/components/Register';
import { useAuth } from '../../frontend/src/contexts/AuthContext';
// Mock the useAuth hook
jest.mock('../../frontend/src/contexts/AuthContext');

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Register Component', () => {
  let mockRegister;
  let mockIsAuthenticated;

  beforeEach(() => {
    // Reset mocks before each test
    mockRegister = jest.fn();
    mockIsAuthenticated = jest.fn();
    useAuth.mockReturnValue({
      register: mockRegister,
      isAuthenticated: mockIsAuthenticated,
    });
    mockNavigate.mockClear();
  });

  const renderRegisterComponent = () => {
    return render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );
  };

  const validUserData = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'Password123!',
    companyName: 'Test Inc.'
  };

  const fillOutForm = async (user, data) => {
    await user.type(screen.getByLabelText(/First Name/i), data.firstName);
    await user.type(screen.getByLabelText(/Last Name/i), data.lastName);
    await user.type(screen.getByLabelText(/Email Address/i), data.email);
    await user.type(screen.getByLabelText(/Password/i), data.password);
    await user.type(screen.getByLabelText(/Confirm Password/i), data.password);
    if (data.companyName) {
      await user.type(screen.getByLabelText(/Company Name/i), data.companyName);
    }
  };

  test('renders registration form correctly', () => {
    mockIsAuthenticated.mockReturnValue(false);
    renderRegisterComponent();

    expect(screen.getByRole('heading', { name: /Create Your Floworx Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign in here/i })).toBeInTheDocument();
  });

  test('redirects if user is already authenticated', () => {
    mockIsAuthenticated.mockReturnValue(true);
    renderRegisterComponent();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  describe('Form Validation', () => {
    test('shows required errors when fields are blurred', async () => {
      const user = userEvent.setup();
      mockIsAuthenticated.mockReturnValue(false);
      renderRegisterComponent();

      await user.click(screen.getByLabelText(/First Name/i));
      await user.tab();
      expect(await screen.findByText('This field is required')).toBeInTheDocument();
    });

    test('shows password mismatch error', async () => {
      const user = userEvent.setup();
      mockIsAuthenticated.mockReturnValue(false);
      renderRegisterComponent();

      await user.type(screen.getByLabelText(/Password/i), 'password123');
      await user.type(screen.getByLabelText(/Confirm Password/i), 'password456');
      await user.tab();

      expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    });

    test('shows password strength errors', async () => {
      const user = userEvent.setup();
      mockIsAuthenticated.mockReturnValue(false);
      renderRegisterComponent();

      const passwordInput = screen.getByLabelText(/Password/i);
      await user.type(passwordInput, 'weak');
      await user.tab();

      expect(await screen.findByText('Must be at least 8 characters')).toBeInTheDocument();

      await user.clear(passwordInput);
      await user.type(passwordInput, 'onlylower');
      await user.tab();
      expect(await screen.findByText(/Password must contain at least one uppercase letter/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('calls register function and shows success message on successful submission', async () => {
      const user = userEvent.setup();
      mockIsAuthenticated.mockReturnValue(false);
      mockRegister.mockResolvedValue({ success: true, requiresVerification: true, user: { email: validUserData.email } });
      renderRegisterComponent();

      await fillOutForm(user, validUserData);
      await user.click(screen.getByRole('button', { name: /Create Account/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          firstName: validUserData.firstName,
          lastName: validUserData.lastName,
          email: validUserData.email,
          password: validUserData.password,
          companyName: validUserData.companyName,
        });
      });

      expect(await screen.findByText(/Registration Successful/i)).toBeInTheDocument();
      expect(await screen.findByText(/Please check your email to verify your account/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('navigates to dashboard on successful registration without verification needed', async () => {
      const user = userEvent.setup();
      mockIsAuthenticated.mockReturnValue(false);
      mockRegister.mockResolvedValue({ success: true, requiresVerification: false });
      renderRegisterComponent();

      await fillOutForm(user, validUserData);
      await user.click(screen.getByRole('button', { name: /Create Account/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    test('displays submission error on failed registration', async () => {
      const user = userEvent.setup();
      mockIsAuthenticated.mockReturnValue(false);
      mockRegister.mockRejectedValue(new Error('Email already exists'));
      renderRegisterComponent();

      await fillOutForm(user, validUserData);
      await user.click(screen.getByRole('button', { name: /Create Account/i }));

      expect(await screen.findByText('Email already exists')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('shows loading state during submission', async () => {
      const user = userEvent.setup();
      mockIsAuthenticated.mockReturnValue(false);
      mockRegister.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderRegisterComponent();

      await fillOutForm(user, validUserData);
      const submitButton = screen.getByRole('button', { name: /Create Account/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton.querySelector('svg.animate-spin')).toBeInTheDocument();
    });
  });
});