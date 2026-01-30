<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { Loader2, Mail, Lock, AlertCircle } from 'lucide-svelte';
  
  // State
  let email = $state('');
  let password = $state('');
  let globalError = $state('');
  let loading = $derived($auth.loading);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    globalError = '';
    
    if (!email || !password) {
      globalError = 'Please fill in all fields';
      return;
    }

    const result = await auth.login(email.trim(), password);

    if (result.success) {
      // Auth store handles redirect or state update
      // We can also force redirect here if needed
      window.location.href = '/';
    } else {
      globalError = result.error || 'Invalid email or password';
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-stone-900 p-4 transition-colors duration-200">
  <div class="max-w-md w-full bg-white dark:bg-stone-800 rounded-xl shadow-lg dark:shadow-stone-950/50 p-8 border border-gray-100 dark:border-stone-700">
    
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent mb-2">
        Welcome Back
      </h1>
      <p class="text-gray-500 dark:text-stone-400">Sign in to continue to Web IDE</p>
    </div>

    <form onsubmit={handleSubmit} class="space-y-5">
      
      {#if globalError}
        <div class="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-md flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
          <AlertCircle class="text-red-500 mt-0.5 shrink-0" size="18" />
          <p class="text-sm text-red-700 dark:text-red-300">{globalError}</p>
        </div>
      {/if}

      <!-- Email -->
      <div class="space-y-1.5">
        <label for="email" class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-stone-500 ml-1">Email or Username</label>
        <div class="relative group">
          <Mail class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size="18" />
          <input 
            id="email"
            type="text" 
            bind:value={email}
            placeholder="john@example.com"
            class="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-stone-900/50 border border-gray-200 dark:border-stone-700 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 dark:text-stone-100 transition-all"
            disabled={loading}
            autofocus
          />
        </div>
      </div>

      <!-- Password -->
      <div class="space-y-1.5">
        <div class="flex justify-between items-center ml-1">
          <label for="password" class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-stone-500">Password</label>
          <a href="#" class="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-500 hover:underline">Forgot password?</a>
        </div>
        <div class="relative group">
          <Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size="18" />
          <input 
            id="password"
            type="password" 
            bind:value={password}
            placeholder="••••••••"
            class="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-stone-900/50 border border-gray-200 dark:border-stone-700 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 dark:text-stone-100 transition-all"
            disabled={loading}
          />
        </div>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        disabled={loading}
        class="w-full mt-6 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium py-2.5 rounded-lg transition-all focus:ring-4 focus:ring-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
      >
        {#if loading}
          <Loader2 class="animate-spin" size="18" />
          <span>Signing In...</span>
        {:else}
          <span>Sign In</span>
        {/if}
      </button>

      <div class="text-center text-sm text-gray-500 dark:text-stone-400 pt-4 border-t border-gray-100 dark:border-stone-700/50">
        Don't have an account? 
        <a href="/register" class="text-orange-600 hover:text-orange-700 dark:text-orange-500 font-medium hover:underline transition-all">Create Account</a>
      </div>
    </form>
  </div>
</div>
