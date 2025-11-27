import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/types';

// Simulate login function using types
function login(credentials: LoginRequest): AuthResponse {
  // Mock user object
  const user: User = {
    id: "u999",
    username: "testuser",
    email: credentials.usernameOrEmail,
    minioBucket: "bucket-test",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Mock token (normally you'd get this from backend)
  return {
    user,
    token: "mock.jwt.token"
  };
}

// Example correct usage:
const loginPayload: LoginRequest = {
  usernameOrEmail: "test@example.com",
  password: "supersecret"
};

const loginResponse = login(loginPayload); // Valid, types match

// Example incorrect usage: Should CAUSE error if uncommented
/*
const badLoginPayload: LoginRequest = {
  usernameOrEmail: "nobody@example.com"
  // password missing!
};

const loginResponseBad = login(badLoginPayload); // TypeScript should error
*/
