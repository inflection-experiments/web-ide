<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let usernameOrEmail = '';
  let password = '';
  let errorMessage = '';
  let showPassword = false;

  // ✅ FIXED: Use $derived instead of $:
  let loading = $derived($auth.loading);

  async function handleSubmit() {
    errorMessage = '';
    
    if (!usernameOrEmail.trim() || !password.trim()) {
      errorMessage = 'Please fill in all fields';
      return;
    }

    console.log('🔑 Login attempt:', { usernameOrEmail: usernameOrEmail.trim() });
    const result = await auth.login(usernameOrEmail.trim(), password);
    
    if (!result.success) {
      errorMessage = result.error || 'Login failed';
    }
  }

  function switchToRegister() {
    dispatch('switch', 'register');
  }

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Header Section -->
    <div class="text-center">
      <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600 mb-4">
        <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
        </svg>
      </div>
      <h2 class="text-3xl font-bold text-white mb-2">Welcome Back</h2>
      <p class="text-gray-400 text-sm">Sign in to your coding playground</p>
    </div>

    <!-- Login Form Card -->
    <div class="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-8">
      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        
        <!-- Username/Email Input -->
        <div class="space-y-2">
          <label for="usernameOrEmail" class="block text-sm font-medium text-gray-300">
            Username or Email
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <input
              id="usernameOrEmail"
              type="text"
              bind:value={usernameOrEmail}
              disabled={loading}
              on:keypress={handleKeyPress}
              class="block w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              placeholder="Enter username or email"
              autocomplete="username"
              required
            />
          </div>
        </div>

        <!-- Password Input -->
        <div class="space-y-2">
          <label for="password" class="block text-sm font-medium text-gray-300">
            Password
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              bind:value={password}
              disabled={loading}
              on:keypress={handleKeyPress}
              class="block w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              placeholder="Enter password"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              on:click={togglePasswordVisibility}
              disabled={loading}
              class="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
              tabindex="-1"
            >
              {#if showPassword}
                <svg class="h-5 w-5 text-gray-400 hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                </svg>
              {:else}
                <svg class="h-5 w-5 text-gray-400 hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <!-- Error Message -->
        {#if errorMessage}
          <div class="bg-red-900/50 border border-red-600/50 text-red-200 px-4 py-3 rounded-lg flex items-center space-x-2">
            <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="text-sm">{errorMessage}</span>
          </div>
        {/if}

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={loading}
          class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-800 disabled:to-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 shadow-lg disabled:cursor-not-allowed"
        >
          {#if loading}
            <div class="flex items-center justify-center space-x-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Signing In...</span>
            </div>
          {:else}
            Sign In
          {/if}
        </button>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-600"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-gray-800 text-gray-400">Don't have an account?</span>
          </div>
        </div>

        <!-- Switch to Register -->
        <button
          type="button"
          on:click={switchToRegister}
          disabled={loading}
          class="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create New Account
        </button>
      </form>
    </div>

    <!-- Footer -->
    <div class="text-center text-xs text-gray-500">
      <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
    </div>
  </div>
</div>
