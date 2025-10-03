<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let usernameOrEmail = '';
  let password = '';
  let errorMessage = '';
  let showPassword = false;

  // Add password input reference
  let passwordInput: HTMLInputElement;

  let loading = $derived($auth.loading);

  async function handleSubmit() {
    errorMessage = '';
    
    if (!usernameOrEmail.trim() || !password.trim()) {
      errorMessage = 'Please fill in all fields';
      return;
    }

    console.log('Login attempt:', { usernameOrEmail: usernameOrEmail.trim() });
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
    // Force DOM update - same as working register component
    if (passwordInput) {
      passwordInput.type = showPassword ? 'text' : 'password';
    }
    console.log('Password visibility toggled:', showPassword);
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
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
        Welcome<span class="text-orange-500">Back</span>
      </h1>
      <p class="text-gray-400 mb-8 text-xl" style="font-family: 'Epilogue', sans-serif;">Login to your account</p>
    </div>

    <div class="rounded-xl shadow-2xl overflow-hidden min-h-[600px] flex flex-col md:flex-row">
      
      <!-- Left Column -->
      <div class="md:w-1/2 p-12 flex flex-col justify-center items-center bg-gradient-to-b from-neutral-950 to-neutral-900">
        <div class="w-24 h-24 bg-transparent border-2 border-orange-500/30 rounded-2xl flex items-center justify-center mb-8">
          <svg class="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
          </svg>
        </div>
        
        <div class="text-center mb-12">
          <h2 class="text-2xl font-bold text-white mb-4" style="font-family: 'Cabin Sketch', cursive;">Your IDE</h2>
          <p class="text-gray-400 text-lg" style="font-family: 'Epilogue', sans-serif;">Build. Code. Deploy.</p>
        </div>

        <div class="space-y-6 w-full max-w-xs">
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span class="text-gray-300 text-sm" style="font-family: 'Epilogue', sans-serif;">Isolated development environments</span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span class="text-gray-300 text-sm" style="font-family: 'Epilogue', sans-serif;">Real-time collaboration</span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span class="text-gray-300 text-sm" style="font-family: 'Epilogue', sans-serif;">Cloud-powered infrastructure</span>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="md:w-1/2 p-12 flex flex-col justify-center bg-gradient-to-t from-neutral-950 to-neutral-900">
        <form on:submit|preventDefault={handleSubmit} class="space-y-8">
          <!-- Email Input - CLEAN white background -->
          <div class="space-y-3">
            <label for="usernameOrEmail" class="block text-sm font-medium text-white" style="font-family: 'Epilogue', sans-serif;">
              Email
            </label>
            <input
              id="usernameOrEmail"
              type="text"
              bind:value={usernameOrEmail}
              disabled={loading}
              on:keypress={handleKeyPress}
              autocomplete="off"
              class="block w-full px-3 py-2 bg-white border-0 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              style="font-family: 'Epilogue', sans-serif;"
              placeholder="username"
              required
            />
          </div>

          <!-- Password Input - EXACT same as working register component -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label for="password" class="block text-sm font-medium text-white" style="font-family: 'Epilogue', sans-serif;">
                Password
              </label>
            </div>
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
                placeholder="••••••"
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
            
            <div class="text-right mt-2">
              <button type="button" class="text-sm text-orange-400 hover:text-orange-600 transition-colors" style="font-family: 'Epilogue', sans-serif;">
                Forgot your password?
              </button>
            </div>
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
            disabled={loading}
            class="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-700 text-white font-medium py-3 px-4 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-not-allowed"
            style="font-family: 'Epilogue', sans-serif;"
          >
            {#if loading}
              <div class="flex items-center justify-center space-x-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Signing in...</span>
              </div>
            {:else}
              Login
            {/if}
          </button>

          <div class="text-center pt-6">
            <span class="text-gray-400 text-sm" style="font-family: 'Epilogue', sans-serif;">Don't have an account? </span>
            <button
              type="button"
              on:click={switchToRegister}
              disabled={loading}
              class="text-orange-500 hover:text-orange-400 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors underline"
              style="font-family: 'Epilogue', sans-serif;"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="text-center text-xs text-gray-500 mt-8">
      <p style="font-family: 'Epilogue', sans-serif;">By clicking continue, you agree to our 
        <button type="button" class="text-gray-400 hover:text-orange-500 underline transition-colors" style="font-family: 'Epilogue', sans-serif;">Terms of Service</button> 
        and 
        <button type="button" class="text-gray-400 hover:text-orange-500 underline transition-colors" style="font-family: 'Epilogue', sans-serif;">Privacy Policy</button>
      </p>
    </div>
  </div>
</div>
