<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { FormValidator } from '$lib/utils/validation';
  import { Loader2, User, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-svelte';
  
  // State
  let username = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let globalError = $state('');
  let successMessage = $state('');
  let registrationStep = $state<'form' | 'loading' | 'success'>('form');

  // Derived
  let loading = $derived($auth.loading);
  let usernameValidation = $derived(FormValidator.validateUsername(username));
  let emailValidation = $derived(FormValidator.validateEmail(email));
  let passwordValidation = $derived(FormValidator.validatePassword(password));
  let passwordMatchValidation = $derived(FormValidator.validatePasswordMatch(password, confirmPassword));

  let isFormValid = $derived(
    usernameValidation.isValid &&
    emailValidation.isValid &&
    passwordValidation.isValid &&
    passwordMatchValidation.isValid
  );

  async function handleSubmit(e: Event) {
    e.preventDefault();
    globalError = '';
    successMessage = '';
    
    // Final validation check
    if (!isFormValid) return;
    
    registrationStep = 'loading';

    const result = await auth.register(
      username.trim(),
      email.trim(),
      password
    );

    if (result.success) {
      registrationStep = 'success';
      successMessage = 'Account created successfully! Redirecting...';
      
      // Auto-redirect happens in auth store logic or we can force it here if needed
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } else {
      registrationStep = 'form';
      globalError = result.error || 'Registration failed. Please try again.';
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-stone-900 p-4 transition-colors duration-200">
  <div class="max-w-md w-full bg-white dark:bg-stone-800 rounded-xl shadow-lg dark:shadow-stone-950/50 p-8 border border-gray-100 dark:border-stone-700">
    
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent mb-2">
        Create Account
      </h1>
      <p class="text-gray-500 dark:text-stone-400">Join the Web IDE experience</p>
    </div>

    {#if registrationStep === 'success'}
      <div class="text-center py-12 animate-in fade-in zoom-in duration-300">
        <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
          <CheckCircle2 size="32" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Welcome Aboard!</h3>
        <p class="text-gray-500 dark:text-stone-400">{successMessage}</p>
      </div>
    {:else}
      <form onsubmit={handleSubmit} class="space-y-5">
        
        {#if globalError}
          <div class="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-md flex items-start gap-3">
            <AlertCircle class="text-red-500 mt-0.5 shrink-0" size="18" />
            <p class="text-sm text-red-700 dark:text-red-300">{globalError}</p>
          </div>
        {/if}

        <!-- Username -->
        <div class="space-y-1.5">
          <label for="username" class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-stone-500 ml-1">Username</label>
          <div class="relative group">
            <User class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size="18" />
            <input 
              id="username"
              type="text" 
              bind:value={username}
              placeholder="johndoe"
              class="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-stone-900/50 border border-gray-200 dark:border-stone-700 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 dark:text-stone-100 transition-all"
              disabled={loading}
            />
          </div>
          {#if username && !usernameValidation.isValid}
            <p class="text-xs text-red-500 ml-1">{usernameValidation.errors[0]}</p>
          {/if}
        </div>

        <!-- Email -->
        <div class="space-y-1.5">
          <label for="email" class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-stone-500 ml-1">Email</label>
          <div class="relative group">
            <Mail class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size="18" />
            <input 
              id="email"
              type="email" 
              bind:value={email}
              placeholder="john@example.com"
              class="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-stone-900/50 border border-gray-200 dark:border-stone-700 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 dark:text-stone-100 transition-all"
              disabled={loading}
            />
          </div>
          {#if email && !emailValidation.isValid}
            <p class="text-xs text-red-500 ml-1">{emailValidation.errors[0]}</p>
          {/if}
        </div>

        <!-- Password -->
        <div class="space-y-1.5">
          <label for="password" class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-stone-500 ml-1">Password</label>
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
          {#if password && !passwordValidation.isValid}
            <p class="text-xs text-red-500 ml-1">{passwordValidation.errors[0]}</p>
          {/if}
        </div>

        <!-- Confirm Password -->
        <div class="space-y-1.5">
          <label for="confirmPassword" class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-stone-500 ml-1">Confirm Password</label>
          <div class="relative group">
            <Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size="18" />
            <input 
              id="confirmPassword"
              type="password" 
              bind:value={confirmPassword}
              placeholder="••••••••"
              class="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-stone-900/50 border border-gray-200 dark:border-stone-700 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 dark:text-stone-100 transition-all"
              disabled={loading}
            />
          </div>
          {#if confirmPassword && !passwordMatchValidation.isValid}
            <p class="text-xs text-red-500 ml-1">{passwordMatchValidation.errors[0]}</p>
          {/if}
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={!isFormValid || loading}
          class="w-full mt-6 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium py-2.5 rounded-lg transition-all focus:ring-4 focus:ring-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if loading}
            <Loader2 class="animate-spin" size="18" />
            <span>Creating Account...</span>
          {:else}
            <span>Sign Up</span>
          {/if}
        </button>

        <div class="text-center text-sm text-gray-500 dark:text-stone-400 pt-4 border-t border-gray-100 dark:border-stone-700/50">
          Already have an account? 
          <a href="/login" class="text-orange-600 hover:text-orange-700 dark:text-orange-500 font-medium hover:underline transition-all">Sign in</a>
        </div>
      </form>
    {/if}
  </div>
</div>
