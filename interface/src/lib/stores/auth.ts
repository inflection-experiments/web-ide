import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { AuthAPI, type User } from '$lib/api';

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
        
        if (browser) {
          localStorage.setItem('auth_token', response.token);
          console.log('💾 Token stored in localStorage');
        }

        set({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
          loading: false
        });

        // ✅ ADDED: Auto-reload after successful login to initialize workspace properly
        if (browser) {
          console.log('🔄 Reloading page to initialize workspace...');
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
        
        update(state => ({ ...state, loading: false }));
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
      set(initialState);
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
};

export const auth = createAuthStore();
