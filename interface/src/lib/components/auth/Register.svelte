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

  // Add these refs for direct DOM manipulation if needed
  let passwordInput: HTMLInputElement;
  let confirmPasswordInput: HTMLInputElement;

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

    console.log('Attempting registration...', { username, email });
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
    // Force DOM update
    if (passwordInput) {
      passwordInput.type = showPassword ? 'text' : 'password';
    }
    console.log('Password visibility toggled:', showPassword);
  }

  function toggleConfirmPasswordVisibility() {
    showConfirmPassword = !showConfirmPassword;
    // Force DOM update
    if (confirmPasswordInput) {
      confirmPasswordInput.type = showConfirmPassword ? 'text' : 'password';
    }
    console.log('Confirm password visibility toggled:', showConfirmPassword);
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

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Cabin+Sketch:wght@400;700&family=Epilogue:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-black flex items-center justify-center px-4 py-4">
  <div class="w-full max-w-5xl">
    <div class="text-center mb-12">
      <h1 class="text-5xl font-bold text-white mb-4" style="font-family: 'Cabin Sketch', cursive;">
        Let's get<span class="text-orange-500">Started</span>
      </h1>
      <p class="text-gray-400 mb-8 text-xl" style="font-family: 'Epilogue', sans-serif;">Create your developer account</p>
    </div>

    <div class="rounded-xl shadow-2xl overflow-hidden min-h-[600px] flex flex-col md:flex-row">
      
      <!-- Left Column -->
      <div class="md:w-1/2 p-12 flex flex-col justify-center items-center bg-gradient-to-b from-neutral-950 to-neutral-900">
        <div class="w-24 h-24 bg-transparent border-2 border-orange-500/30 rounded-2xl flex items-center justify-center mb-8">
          <svg class="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
          </svg>
        </div>
        
        <div class="text-center mb-12">
          <h2 class="text-2xl font-bold text-white mb-4" style="font-family: 'Cabin Sketch', cursive;">Start Building</h2>
          <p class="text-gray-400 text-lg" style="font-family: 'Epilogue', sans-serif;">Code. Create. Deploy.</p>
        </div>

        <div class="space-y-6 w-full max-w-xs">
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span class="text-gray-300 text-sm" style="font-family: 'Epilogue', sans-serif;">Personal development workspace</span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span class="text-gray-300 text-sm" style="font-family: 'Epilogue', sans-serif;">Secure container environments</span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span class="text-gray-300 text-sm" style="font-family: 'Epilogue', sans-serif;">Instant project deployment</span>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="md:w-1/2 p-12 flex flex-col justify-center bg-gradient-to-t from-neutral-950 to-neutral-900">
        
        {#if registrationStep === 'form'}
          <form on:submit|preventDefault={handleSubmit} class="space-y-6">
            
            <!-- Username Input -->
            <div class="space-y-3">
              <label for="username" class="block text-sm font-medium text-white" style="font-family: 'Epilogue', sans-serif;">
                Username
              </label>
              <input
                id="username"
                type="text"
                bind:value={username}
                disabled={loading}
                on:keypress={handleKeyPress}
                autocomplete="username"
                class="block w-full px-3 py-2 bg-white border-0 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                style="font-family: 'Epilogue', sans-serif;"
                placeholder="your_username"
                required
              />
              {#if username.trim() && username.trim().length < 3}
                <p class="text-xs text-yellow-400 mt-1" style="font-family: 'Epilogue', sans-serif;">Username must be at least 3 characters</p>
              {/if}
            </div>

            <!-- Email Input -->
            <div class="space-y-3">
              <label for="email" class="block text-sm font-medium text-white" style="font-family: 'Epilogue', sans-serif;">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                bind:value={email}
                disabled={loading}
                on:keypress={handleKeyPress}
                autocomplete="email"
                class="block w-full px-3 py-2 bg-white border-0 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                style="font-family: 'Epilogue', sans-serif;"
                placeholder="you@example.com"
                required
              />
              {#if email.trim() && !isValidEmail(email.trim())}
                <p class="text-xs text-yellow-400 mt-1" style="font-family: 'Epilogue', sans-serif;">Please enter a valid email address</p>
              {/if}
            </div>

            <!-- Password Input -->
            <div class="space-y-3">
              <label for="password" class="block text-sm font-medium text-white" style="font-family: 'Epilogue', sans-serif;">
                Password
              </label>
              <div class="relative">
                <input
                  bind:this={passwordInput}
                  id="password"
                  type="password"
                  bind:value={password}
                  disabled={loading}
                  on:keypress={handleKeyPress}
                  autocomplete="new-password"
                  class="block w-full px-3 py-2 pr-12 bg-white border-0 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style="font-family: 'Epilogue', sans-serif;"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  on:click={togglePasswordVisibility}
                  disabled={loading}
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {#if showPassword}
                    <!-- Eye slash (hide) -->
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                    </svg>
                  {:else}
                    <!-- Eye (show) -->
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  {/if}
                </button>
              </div>
              {#if password && password.length < 6}
                <p class="text-xs text-yellow-400 mt-1" style="font-family: 'Epilogue', sans-serif;">Password must be at least 6 characters</p>
              {/if}
            </div>

            <!-- Confirm Password Input -->
            <div class="space-y-3">
              <label for="confirmPassword" class="block text-sm font-medium text-white" style="font-family: 'Epilogue', sans-serif;">
                Confirm Password
              </label>
              <div class="relative">
                <input
                  bind:this={confirmPasswordInput}
                  id="confirmPassword"
                  type="password"
                  bind:value={confirmPassword}
                  disabled={loading}
                  on:keypress={handleKeyPress}
                  autocomplete="new-password"
                  class="block w-full px-3 py-2 pr-12 bg-white border-0 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style="font-family: 'Epilogue', sans-serif;"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  on:click={toggleConfirmPasswordVisibility}
                  disabled={loading}
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {#if showConfirmPassword}
                    <!-- Eye slash (hide) -->
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                    </svg>
                  {:else}
                    <!-- Eye (show) -->
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  {/if}
                </button>
              </div>
              {#if confirmPassword && !passwordsMatch}
                <p class="text-xs text-red-400 mt-1" style="font-family: 'Epilogue', sans-serif;">Passwords do not match</p>
              {:else if confirmPassword && passwordsMatch}
                <p class="text-xs text-green-400 mt-1" style="font-family: 'Epilogue', sans-serif;">Passwords match ✓</p>
              {/if}
            </div>

            {#if errorMessage}
              <div class="bg-red-900/50 border border-red-600/50 text-red-200 px-4 py-3 rounded-md flex items-center space-x-2">
                <svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-sm" style="font-family: 'Epilogue', sans-serif;">{errorMessage}</span>
              </div>
            {/if}

            <button
              type="submit"
              disabled={loading || !passwordsMatch}
              class="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-700 text-white font-medium py-3 px-4 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-not-allowed"
              style="font-family: 'Epilogue', sans-serif;"
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

            <div class="text-center pt-6">
              <span class="text-gray-400 text-sm" style="font-family: 'Epilogue', sans-serif;">Already have an account? </span>
              <button
                type="button"
                on:click={switchToLogin}
                disabled={loading}
                class="text-orange-500 hover:text-orange-400 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors underline"
                style="font-family: 'Epilogue', sans-serif;"
              >
                Sign in
              </button>
            </div>
          </form>

        <!-- Loading State -->
        {:else if registrationStep === 'loading'}
          <div class="flex flex-col items-center justify-center py-12">
            <div class="w-16 h-16 border-4 border-neutral-600 border-t-orange-500 rounded-full animate-spin"></div>
            <div class="mt-6 text-center">
              <h3 class="text-lg font-medium text-white mb-2" style="font-family: 'Cabin Sketch', cursive;">Creating Your Account</h3>
              <p class="text-gray-400 text-sm" style="font-family: 'Epilogue', sans-serif;">Setting up your coding environment...</p>
            </div>
            <div class="mt-6 flex space-x-2">
              <div class="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
              <div class="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
          </div>

        <!-- Success State -->
        {:else if registrationStep === 'success'}
          <div class="flex flex-col items-center justify-center py-12">
            <div class="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div class="mt-6 text-center">
              <h3 class="text-xl font-semibold text-orange-400 mb-2" style="font-family: 'Cabin Sketch', cursive;">{successMessage}</h3>
              <p class="text-gray-300 text-sm" style="font-family: 'Epilogue', sans-serif;">Welcome to your coding playground!</p>
            </div>
          </div>

        <!-- Redirecting State -->
        {:else if registrationStep === 'redirecting'}
          <div class="flex flex-col items-center justify-center py-12">
            <div class="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </div>
            <div class="mt-6 text-center">
              <h3 class="text-lg font-medium text-orange-400 mb-2" style="font-family: 'Cabin Sketch', cursive;">{successMessage}</h3>
              <p class="text-gray-400 text-sm" style="font-family: 'Epilogue', sans-serif;">Get ready to start coding!</p>
            </div>
            <div class="mt-6 w-48 h-2 bg-neutral-700 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full animate-pulse w-full"></div>
            </div>
          </div>
        {/if}

      </div>
    </div>

    <div class="text-center text-xs text-gray-500 mt-8">
      <p style="font-family: 'Epilogue', sans-serif;">By creating an account, you agree to our 
        <button type="button" class="text-gray-400 hover:text-orange-500 underline transition-colors" style="font-family: 'Epilogue', sans-serif;">Terms of Service</button> 
        and 
        <button type="button" class="text-gray-400 hover:text-orange-500 underline transition-colors" style="font-family: 'Epilogue', sans-serif;">Privacy Policy</button>
      </p>
    </div>
  </div>
</div>
