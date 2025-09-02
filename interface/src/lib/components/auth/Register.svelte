<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let username = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let errorMessage = '';
  let successMessage = '';
  let showPassword = false;
  let showConfirmPassword = false;
  let registrationStep: 'form' | 'loading' | 'success' | 'redirecting' = 'form';

  // ✅ FIXED: Use $derived instead of $:
  let loading = $derived($auth.loading);
  let passwordsMatch = $derived(password === confirmPassword);

  async function handleSubmit() {
    errorMessage = '';
    successMessage = '';
    registrationStep = 'loading';
    
    // Validation
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      errorMessage = 'Please fill in all fields';
      registrationStep = 'form';
      return;
    }

    if (username.trim().length < 3) {
      errorMessage = 'Username must be at least 3 characters long';
      registrationStep = 'form';
      return;
    }

    if (!isValidEmail(email.trim())) {
      errorMessage = 'Please enter a valid email address';
      registrationStep = 'form';
      return;
    }

    if (password.length < 6) {
      errorMessage = 'Password must be at least 6 characters long';
      registrationStep = 'form';
      return;
    }

    if (!passwordsMatch) {
      errorMessage = 'Passwords do not match';
      registrationStep = 'form';
      return;
    }

    // ✅ FIXED: Call auth.register correctly
    console.log('📝 Attempting registration...', { username, email });
    const result = await auth.register(username.trim(), email.trim(), password);
    
    if (result.success) {
      registrationStep = 'success';
      successMessage = 'Account created successfully!';
      
      // Clear form
      username = '';
      email = '';
      password = '';
      confirmPassword = '';
      
      // Wait 2 seconds then show redirecting message
      setTimeout(() => {
        registrationStep = 'redirecting';
        successMessage = 'Redirecting to login page...';
        
        // Redirect to login after 1 more second
        setTimeout(() => {
          switchToLogin();
        }, 1500);
      }, 2000);
    } else {
      registrationStep = 'form';
      errorMessage = result.error || 'Registration failed';
    }
  }

  function switchToLogin() {
    dispatch('switch', 'login');
  }

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  function toggleConfirmPasswordVisibility() {
    showConfirmPassword = !showConfirmPassword;
  }

  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && registrationStep === 'form') {
      handleSubmit();
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Header -->
    <div class="text-center">
      <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-600 mb-4">
        <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
        </svg>
      </div>
      <h2 class="text-3xl font-bold text-white mb-2">Create Account</h2>
      <p class="text-gray-400 text-sm">Join the coding playground community</p>
    </div>

    <!-- Form State -->
    {#if registrationStep === 'form'}
      <div class="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-8">
        <form on:submit|preventDefault={handleSubmit} class="space-y-6">
          
          <!-- Username Input -->
          <div class="space-y-2">
            <label for="username" class="block text-sm font-medium text-gray-300">Username</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <input
                id="username"
                type="text"
                bind:value={username}
                disabled={loading}
                on:keypress={handleKeyPress}
                class="block w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                placeholder="Choose a username"
                autocomplete="username"
                required
              />
            </div>
            {#if username.trim() && username.trim().length < 3}
              <p class="text-xs text-yellow-400 mt-1">Username must be at least 3 characters</p>
            {/if}
          </div>

          <!-- Email Input -->
          <div class="space-y-2">
            <label for="email" class="block text-sm font-medium text-gray-300">Email Address</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <input
                id="email"
                type="email"
                bind:value={email}
                disabled={loading}
                on:keypress={handleKeyPress}
                class="block w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                placeholder="Enter your email"
                autocomplete="email"
                required
              />
            </div>
            {#if email.trim() && !isValidEmail(email.trim())}
              <p class="text-xs text-yellow-400 mt-1">Please enter a valid email address</p>
            {/if}
          </div>

          <!-- Password Input -->
          <div class="space-y-2">
            <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
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
                class="block w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                placeholder="Create a password"
                autocomplete="new-password"
                required
              />
              <button
                type="button"
                on:click={togglePasswordVisibility}
                disabled={loading}
                class="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-300 disabled:opacity-50"
                tabindex="-1"
              >
                {#if showPassword}
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                  </svg>
                {:else}
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                {/if}
              </button>
            </div>
            {#if password && password.length < 6}
              <p class="text-xs text-yellow-400 mt-1">Password must be at least 6 characters</p>
            {/if}
          </div>

          <!-- Confirm Password Input -->
          <div class="space-y-2">
            <label for="confirmPassword" class="block text-sm font-medium text-gray-300">Confirm Password</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                bind:value={confirmPassword}
                disabled={loading}
                on:keypress={handleKeyPress}
                class="block w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                placeholder="Confirm your password"
                autocomplete="new-password"
                required
              />
              <button
                type="button"
                on:click={toggleConfirmPasswordVisibility}
                disabled={loading}
                class="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-300 disabled:opacity-50"
                tabindex="-1"
              >
                {#if showConfirmPassword}
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                  </svg>
                {:else}
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                {/if}
              </button>
            </div>
            {#if confirmPassword && !passwordsMatch}
              <p class="text-xs text-red-400 mt-1">Passwords do not match</p>
            {:else if confirmPassword && passwordsMatch}
              <p class="text-xs text-green-400 mt-1">Passwords match ✓</p>
            {/if}
          </div>

          <!-- Error Message -->
          {#if errorMessage}
            <div class="bg-red-900 bg-opacity-50 border border-red-600 border-opacity-50 text-red-200 px-4 py-3 rounded-lg flex items-center space-x-2">
              <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="text-sm">{errorMessage}</span>
            </div>
          {/if}

          <!-- Submit Button -->
          <button
            type="submit"
            disabled={loading || !passwordsMatch}
            class="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-800 disabled:to-green-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if loading}
              <div class="flex items-center justify-center space-x-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating Account...</span>
              </div>
            {:else}
              Create Account
            {/if}
          </button>

          <!-- Divider -->
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-600"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-gray-800 text-gray-400">Already have an account?</span>
            </div>
          </div>

          <!-- Switch to Login -->
          <button
            type="button"
            on:click={switchToLogin}
            disabled={loading}
            class="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sign In Instead
          </button>
        </form>
      </div>

    <!-- Loading State -->
    {:else if registrationStep === 'loading'}
      <div class="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-8">
        <div class="flex flex-col items-center justify-center py-12">
          <div class="w-16 h-16 border-4 border-gray-600 border-t-green-500 rounded-full animate-spin"></div>
          <div class="mt-6 text-center">
            <h3 class="text-lg font-medium text-white mb-2">Creating Your Account</h3>
            <p class="text-gray-400 text-sm">Please wait while we set up your coding environment...</p>
          </div>
          <div class="mt-6 flex space-x-2">
            <div class="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-green-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-green-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
        </div>
      </div>

    <!-- Success State -->
    {:else if registrationStep === 'success'}
      <div class="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-8">
        <div class="flex flex-col items-center justify-center py-12">
          <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div class="mt-6 text-center">
            <h3 class="text-xl font-semibold text-green-400 mb-2">🎉 {successMessage}</h3>
            <p class="text-gray-300 text-sm">Welcome to the coding playground!</p>
          </div>
        </div>
      </div>

    <!-- Redirecting State -->
    {:else if registrationStep === 'redirecting'}
      <div class="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-8">
        <div class="flex flex-col items-center justify-center py-12">
          <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
            </svg>
          </div>
          <div class="mt-6 text-center">
            <h3 class="text-lg font-medium text-blue-400 mb-2">{successMessage}</h3>
            <p class="text-gray-400 text-sm">Get ready to start coding!</p>
          </div>
          <div class="mt-6 w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full animate-pulse w-full"></div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Footer -->
    <div class="text-center text-xs text-gray-500">
      <p>By creating an account, you agree to our Terms of Service and Privacy Policy</p>
    </div>
  </div>
</div>
