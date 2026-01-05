<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import Icon from '@iconify/svelte';


  interface Props {
    onSwitch: (mode: 'register' | 'login') => void;
  }


  let { onSwitch }: Props = $props();


  // ============ STATE ============
  let username = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let errorMessage = $state('');
  let successMessage = $state('');
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);
  let registrationStep = $state<'form' | 'loading' | 'success' | 'redirecting'>('form');


  // DOM refs
  let passwordInput: HTMLInputElement;
  let confirmPasswordInput: HTMLInputElement;


  let loading = $derived($auth.loading);
  let passwordsMatch = $derived(password === confirmPassword);


  // ============ FUNCTIONS ============
  async function handleSubmit() {
    errorMessage = '';
    successMessage = '';
    registrationStep = 'loading';


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


      setTimeout(() => {
        registrationStep = 'redirecting';
        successMessage = 'Redirecting to login page...';


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
    onSwitch('login');
  }


  function togglePasswordVisibility() {
    showPassword = !showPassword;
    if (passwordInput) {
      passwordInput.type = showPassword ? 'text' : 'password';
    }
    console.log('Password visibility toggled:', showPassword);
  }


  function toggleConfirmPasswordVisibility() {
    showConfirmPassword = !showConfirmPassword;
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
          <Icon icon="lucide:user-plus" class="w-12 h-12 text-orange-500" />
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
          <form onsubmit={e => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
            <!-- Username -->
            <div class="space-y-3">
              <label for="username" class="block text-sm font-medium text-white" style="font-family: 'Epilogue', sans-serif;">
                Username
              </label>
              <input
                id="username"
                type="text"
                bind:value={username}
                disabled={loading}
                onkeypress={handleKeyPress}
                autocomplete="username"
                class="block w-full px-3 py-2 bg-white border-0 rounded-md text-black placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50
                       disabled:cursor-not-allowed transition-all duration-200"
                style="font-family: 'Epilogue', sans-serif;"
                placeholder="your_username"
                required
              />
              {#if username.trim() && username.trim().length < 3}
                <p class="text-xs text-yellow-400 mt-1" style="font-family: 'Epilogue', sans-serif;">
                  Username must be at least 3 characters
                </p>
              {/if}
            </div>


            <!-- Email -->
            <div class="space-y-3">
              <label for="email" class="block text-sm font-medium text-white" style="font-family: 'Epilogue', sans-serif;">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                bind:value={email}
                disabled={loading}
                onkeypress={handleKeyPress}
                autocomplete="email"
                class="block w-full px-3 py-2 bg-white border-0 rounded-md text-black placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50
                       disabled:cursor-not-allowed transition-all duration-200"
                style="font-family: 'Epilogue', sans-serif;"
                placeholder="you@example.com"
                required
              />
              {#if email.trim() && !isValidEmail(email.trim())}
                <p class="text-xs text-yellow-400 mt-1" style="font-family: 'Epilogue', sans-serif;">
                  Please enter a valid email address
                </p>
              {/if}
            </div>


            <!-- Password -->
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
                  onkeypress={handleKeyPress}
                  autocomplete="new-password"
                  class="block w-full px-3 py-2 pr-12 bg-white border-0 rounded-md text-black placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50
                         disabled:cursor-not-allowed transition-all duration-200"
                  style="font-family: 'Epilogue', sans-serif;"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onclick={togglePasswordVisibility}
                  disabled={loading}
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600
                         hover:text-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {#if showPassword}
                    <Icon icon="lucide:eye-off" class="h-5 w-5" />
                  {:else}
                    <Icon icon="lucide:eye" class="h-5 w-5" />
                  {/if}
                </button>
              </div>
              {#if password && password.length < 6}
                <p class="text-xs text-yellow-400 mt-1" style="font-family: 'Epilogue', sans-serif;">
                  Password must be at least 6 characters
                </p>
              {/if}
            </div>


            <!-- Confirm Password -->
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
                  onkeypress={handleKeyPress}
                  autocomplete="new-password"
                  class="block w-full px-3 py-2 pr-12 bg-white border-0 rounded-md text-black placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50
                         disabled:cursor-not-allowed transition-all duration-200"
                  style="font-family: 'Epilogue', sans-serif;"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onclick={toggleConfirmPasswordVisibility}
                  disabled={loading}
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600
                         hover:text-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {#if showConfirmPassword}
                    <Icon icon="lucide:eye-off" class="h-5 w-5" />
                  {:else}
                    <Icon icon="lucide:eye" class="h-5 w-5" />
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
                <Icon icon="lucide:alert-circle" class="h-4 w-4 flex-shrink-0" />
                <span class="text-sm" style="font-family: 'Epilogue', sans-serif;">{errorMessage}</span>
              </div>
            {/if}


            <button
              type="submit"
              disabled={loading || !passwordsMatch}
              class="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-700 text-white hover:text-white font-medium
                     py-3 px-4 rounded-md transition-all duration-200 focus:outline-none focus:ring-2
                     focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-neutral-950
                     disabled:cursor-not-allowed"
              style="font-family: 'Epilogue', sans-serif;"
            >
              {#if loading}
                <div class="flex items-center justify-center space-x-2">
                  <Icon icon="lucide:loader-2" class="h-4 w-4 animate-spin" />
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
                onclick={switchToLogin}
                disabled={loading}
                class="text-orange-500 hover:text-white text-sm font-medium disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors underline"
                style="font-family: 'Epilogue', sans-serif;"
              >
                Sign in
              </button>
            </div>
          </form>


        {:else if registrationStep === 'loading'}
          <div class="flex flex-col items-center justify-center py-12">
            <Icon icon="lucide:loader-2" class="w-16 h-16 text-orange-500 animate-spin" />
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


        {:else if registrationStep === 'success'}
          <div class="flex flex-col items-center justify-center py-12">
            <div class="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
              <Icon icon="lucide:check-circle" class="w-8 h-8 text-white" />
            </div>
            <div class="mt-6 text-center">
              <h3 class="text-xl font-semibold text-orange-400 mb-2" style="font-family: 'Cabin Sketch', cursive;">{successMessage}</h3>
              <p class="text-gray-300 text-sm" style="font-family: 'Epilogue', sans-serif;">Welcome to your coding playground!</p>
            </div>
          </div>


        {:else if registrationStep === 'redirecting'}
          <div class="flex flex-col items-center justify-center py-12">
            <div class="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
              <Icon icon="lucide:arrow-right" class="w-8 h-8 text-white animate-bounce" />
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
      <p style="font-family: 'Epilogue', sans-serif;">
        By creating an account, you agree to our
        <button type="button" class="text-gray-400 hover:text-orange-500 underline transition-colors" style="font-family: 'Epilogue', sans-serif;">Terms of Service</button>
        and
        <button type="button" class="text-gray-400 hover:text-orange-500 underline transition-colors" style="font-family: 'Epilogue', sans-serif;">Privacy Policy</button>
      </p>
    </div>
  </div>
</div>
