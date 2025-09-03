import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { AuthAPI, type User } from '$lib/api';
import socket from '$lib/socket';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const createAuthStore = () => {
  // ✅ FIXED: Start with loading: true to prevent flash
  const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true  // ✅ Changed from false to true
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,
    
    async login(usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string }> {
      console.log('🔑 Attempting login for:', usernameOrEmail);
      update(state => ({ ...state, loading: true }));
      
      try {
        const response = await AuthAPI.login({ usernameOrEmail, password });
        console.log('✅ Login successful:', response.user.username);
        console.log(`🆔 [DEBUG] REAL User ID from database: ${response.user.id}`);
        
        if (browser) {
          localStorage.setItem('auth_token', response.token);
          console.log('💾 Token stored in localStorage');
        }

        // ✅ CRITICAL FIX: Set socket auth token for real user ID
        setSocketAuth(response.token);

        set({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
          loading: false
        });

        // ✅ ADDED: Auto-reload after successful login to initialize workspace properly
        if (browser) {
          console.log('🔄 Reloading page to initialize workspace with REAL user ID...');
          setTimeout(() => {
            window.location.reload();
          }, 500); // Small delay to ensure state is saved
        }

        return { success: true };
      } catch (error) {
        console.error('❌ Login failed:', error);
        update(state => ({ ...state, loading: false }));
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Login failed' 
        };
      }
    },

    async register(username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
      console.log('📝 Attempting registration for:', username);
      update(state => ({ ...state, loading: true }));
      
      try {
        const response = await AuthAPI.register({ username, email, password });
        console.log('✅ Registration successful:', response.user.username);
        console.log(`🆔 [DEBUG] REAL User ID from database: ${response.user.id}`);
        
        if (browser) {
          localStorage.setItem('auth_token', response.token);
          console.log('💾 Registration token stored in localStorage');
        }

        // ✅ CRITICAL FIX: Set socket auth token for real user ID
        setSocketAuth(response.token);
        
        set({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
          loading: false
        });

        return { success: true };
      } catch (error) {
        console.error('❌ Registration failed:', error);
        update(state => ({ ...state, loading: false }));
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Registration failed' 
        };
      }
    },

    logout(): void {
      console.log('👋 Logging out user');
      if (browser) {
        localStorage.removeItem('auth_token');
      }
      
      // ✅ CLEAR SOCKET AUTH ON LOGOUT
      socket.auth = {};
      socket.disconnect();
      
      set({ ...initialState, loading: false });
    },

    // ✅ ENHANCED: Better state management during auth check
    async checkAuth(): Promise<void> {
      if (!browser) {
        // ✅ FIXED: Set loading to false on server
        set({ ...initialState, loading: false });
        return;
      }
      
      console.log('🔍 === CHECKING AUTHENTICATION ON STARTUP ===');
      
      const token = localStorage.getItem('auth_token');
      console.log('Token found in localStorage:', token ? 'YES' : 'NO');
      
      if (!AuthAPI.isValidToken(token)) {
        console.log('❌ No valid token found');
        set({ ...initialState, loading: false });
        return;
      }

      console.log('🔍 Valid token found, validating with server...');
      // ✅ Keep loading: true while validating

      try {
        const user = await AuthAPI.getCurrentUser(token!);
        console.log('✅ Auth check successful:', user.username);
        console.log(`🆔 [DEBUG] REAL User ID from database: ${user.id}`);
        
        // ✅ CRITICAL FIX: Set socket auth on startup for persistent files
        setSocketAuth(token!);
        
        set({
          user,
          token,
          isAuthenticated: true,
          loading: false  // ✅ Only set loading: false after success
        });
        
      } catch (error) {
        console.error('❌ Auth validation failed:', error);
        
        if (browser) {
          localStorage.removeItem('auth_token');
        }
        
        set({ ...initialState, loading: false });
      }
    }
  };

  // ✅ CRITICAL FIX: Set authentication token in socket for real user ID persistence
  function setSocketAuth(token: string): void {
    console.log('🔑 Auth: Setting socket authentication with JWT token for REAL user ID persistence...');
    
    // ✅ SET SOCKET AUTH DYNAMICALLY TO USE REAL USER ID
    socket.auth = { token };
    
    // ✅ RECONNECT SOCKET WITH NEW AUTH FOR PERSISTENT FILES
    if (socket.connected) {
      console.log('🔄 Auth: Reconnecting socket with REAL user authentication...');
      socket.disconnect();
    }
    socket.connect();
    
    console.log('✅ Auth: Socket authentication updated - files will now persist across logins with REAL user ID!');
  }
};

export const auth = createAuthStore();
