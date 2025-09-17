import { Request, Response } from 'express';
import { createUser, findUserByEmail } from '../models/user.js';

// Email validation (RFC-ish)
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (>=8 chars)
const isValidPassword = (password: string): boolean => {
  return password && password.length >= 8;
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate payload
    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: "MISSING_FIELDS",
          message: "Email and password are required"
        }
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: {
          code: "INVALID_EMAIL",
          message: "Please provide a valid email address"
        }
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        error: {
          code: "INVALID_PASSWORD",
          message: "Password must be at least 8 characters long"
        }
      });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: "USER_EXISTS",
          message: "A user with this email already exists"
        }
      });
    }

    // Create new user
    const userId = await createUser(email, password);

    // Return success response (no secrets)
    return res.status(201).json({
      userId
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An internal error occurred"
      }
    });
  }
};
