<script lang="ts">
  import { onMount } from 'svelte';
  import Login from './Login.svelte';
  import Register from './Register.svelte';

  let currentView: 'login' | 'register' | 'transitioning' = 'login';
  let targetView: 'login' | 'register' = 'login';
  
  // Create a fixed pattern for which boxes are orange
  let orangeBoxes = [2, 5, 8, 11, 15, 18, 21, 24, 27, 30];

  onMount(() => {
    console.log('[DEBUG] === AUTH CONTAINER MOUNTED ===');
    console.log('Current view:', currentView);
  });

  function handleSwitch(event: CustomEvent) {
    console.log('[DEBUG] Switching auth view to:', event.detail);
    const newView = event.detail as 'login' | 'register';
    
    if (newView === currentView) return; // No transition needed
    
    // Start transition
    targetView = newView;
    currentView = 'transitioning';
    console.log('[DEBUG] Starting transition to:', targetView);
    
    // Keep 2 seconds timer
    setTimeout(() => {
      currentView = targetView;
      console.log('[DEBUG] Transition completed to:', currentView);
    }, 2000);
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Cabin+Sketch:wght@400;700&family=Epilogue:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
</svelte:head>

<style>
  /* Fade in reveal from static position */
  .fade-reveal {
    display: inline-block;
    animation: fadeReveal 1.2s ease-out forwards;
    animation-delay: 0.6s;
    opacity: 0;
  }
  
  @keyframes fadeReveal {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
</style>

{#if currentView === 'transitioning'}
  <!-- Blinking Boxes with Fade Reveal Text -->
  <div class="min-h-screen bg-black flex items-center justify-center px-4 py-4">
    <div class="text-center">
      
      <!-- Slow blinking boxes -->
      <div class="grid grid-cols-8 gap-2 mx-auto w-fit mb-8">
        {#each Array(32) as _, i}
          <div 
            class="w-6 h-6 border border-orange-500/30 transition-all duration-150"
            class:bg-orange-500={orangeBoxes.includes(i)}
            class:animate-ping={orangeBoxes.includes(i)}
            style="animation-delay: {i * 30}ms; animation-duration: 1s"
          ></div>
        {/each}
      </div>
      
      <!-- Fade reveal text animation -->
      <div class="text-gray-300 text-xl mb-4" style="font-family: 'Epilogue', sans-serif;">
        <span>Getting things ready for you... </span>
        {#if targetView === 'login'}
          <span class="fade-reveal text-orange-500 font-bold">Login</span>
        {:else}
          <span class="fade-reveal text-orange-500 font-bold">Registration</span>
        {/if}
      </div>
      
    </div>
  </div>

{:else if currentView === 'login'}
  <Login on:switch={handleSwitch} />
{:else if currentView === 'register'}
  <Register on:switch={handleSwitch} />
{/if}
