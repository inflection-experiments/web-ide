<script lang="ts">
    import type { Snippet } from 'svelte';
    import { onMount } from 'svelte';
    import socket from '$lib/socket';
    import AuthContainer from '$lib/components/auth/AuthContainer.svelte';
    import Theme from '$lib/components/theme/Theme.svelte';
    import { auth } from '$lib/stores/auth';
    import { ModeWatcher } from 'mode-watcher';
    import { LogOut } from 'lucide-svelte';
    import "../app.css";

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();

    // ============ REACTIVE STATE ============
    let isAuthenticated = $derived($auth.isAuthenticated);
    let authLoading = $derived($auth.loading);
    let user = $derived($auth.user);

    // ============ COMPONENT STATE ============
    let minimumLoadingComplete = $state(false);

    // ============ LOGOUT ============
    async function handleLogout() {
        console.log('[LAYOUT] Logout initiated');
        try {
            if (socket.connected) {
                socket.disconnect();
            }
            auth.logout();
            window.location.reload();
        } catch (error) {
            console.error('[LAYOUT] Logout error:', error);
            window.location.reload();
        }
    }

    // ============ LIFECYCLE ============
    onMount(() => {
        console.log('[LAYOUT] Component mounted');
        
        setTimeout(() => {
            minimumLoadingComplete = true;
        }, 2500);

        async function initializeAuth() {
            try {
                await auth.checkAuth();
            } catch (error) {
                console.error('[LAYOUT] Auth check failed:', error);
            }
        }
        initializeAuth();
    });
</script>

<ModeWatcher />

<svelte:head>
    <title>Code Editor</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Cabin+Sketch:wght@400;700&family=Epilogue:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
</svelte:head>

<style>
.fade-reveal {
    display: inline-block;
    animation: fadeReveal 1.2s ease-out forwards;
    animation-delay: 1.2s;
    opacity: 0;
}

@keyframes fadeReveal {
    0% { opacity: 0; }
    100% { opacity: 1; }
}

.grid-pattern {
    background-image: 
        radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0);
    background-size: 20px 20px;
}
</style>

{#if authLoading || !minimumLoadingComplete}
    <div class="min-h-screen bg-background flex items-center justify-center px-4 py-4 grid-pattern font-['Cabin_Sketch', 'Epilogue']">
        <div class="text-center">
            <div class="grid grid-cols-8 gap-2 mx-auto w-fit mb-8">
                {#each Array(32) as _, i}
                    <div 
                        class="w-6 h-6 border border-border/30 transition-all duration-300 rounded-sm"
                        class:bg-primary={[2, 5, 8, 11, 15, 18, 21, 24, 27, 30].includes(i)}
                        class:animate-pulse={[2, 5, 8, 11, 15, 18, 21, 24, 27, 30].includes(i)}
                        class:shadow-md={[2, 5, 8, 11, 15, 18, 21, 24, 27, 30].includes(i)}
                        style="animation-delay: {i * 50}ms; animation-duration: 1.5s"
                    ></div>
                {/each}
            </div>
            
            <div class="text-muted-foreground text-xl mb-4 font-['Epilogue']">
                <span>Fetching latest data... </span>
                <span class="fade-reveal text-primary font-semibold">almost there...</span>
            </div>
        </div>
    </div>
{:else if !isAuthenticated}
    <div class="font-['Epilogue']">
        <AuthContainer />
    </div>
{:else}
    <div class="h-screen flex flex-col bg-background font-['Epilogue']">
        <div class="bg-sidebar-background/95 backdrop-blur-sm border-b border-sidebar-border text-sidebar-foreground text-xs px-4 py-3 flex justify-between items-center">
            <div class="flex items-center space-x-3">
                <div class="flex items-center space-x-2">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span class="text-sidebar-foreground/80">
                        Connected as <span class="font-medium text-sidebar-foreground">{user?.username}</span>
                    </span>
                </div>
                <span class="text-sidebar-foreground/60">•</span>
                <span class="text-sidebar-foreground/60 font-mono text-xs">ID: {user?.id}</span>
            </div>
            
            <div class="flex items-center space-x-2">
                <Theme />
                <button 
                    onclick={handleLogout} 
                    class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive/10 text-destructive hover:bg-destructive/20 h-7 px-3"
                >
                    <LogOut class="w-3 h-3 mr-1.5" />
                    Logout
                </button>
            </div>
        </div>
        
        <div class="flex-1 overflow-hidden">
            {@render children()}
        </div>
    </div>
{/if}
