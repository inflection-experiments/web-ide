<script lang="ts">
  import { onMount } from 'svelte';
  import Login from './Login.svelte';
  import Register from './Register.svelte';

  let currentView: 'login' | 'register' = 'login';

  onMount(() => {
    console.log('🚀 === AUTH CONTAINER MOUNTED ===');
    console.log('Current view:', currentView);
  });

  function handleSwitch(event: CustomEvent) {
    console.log('🔄 Switching auth view to:', event.detail);
    currentView = event.detail;
  }
</script>

{#if currentView === 'login'}
  <Login on:switch={handleSwitch} />
{:else}
  <Register on:switch={handleSwitch} />
{/if}
