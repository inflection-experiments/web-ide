<script lang="ts">
    import type { Snippet } from 'svelte';
    import { onMount } from 'svelte';
    import { PUBLIC_API_BASE_URL, PUBLIC_SOCKET_URL } from '$env/static/public';
    import socket from '$lib/socket';
    import Terminal from '$lib/components/Terminal.svelte';
    import FileTree from '$lib/components/FileTreeNode.svelte';
    import MonacoEditor from '$lib/components/MonacoEditor.svelte';
    import AuthContainer from '$lib/components/auth/AuthContainer.svelte';
    import Theme from '$lib/components/theme/Theme.svelte';
    import { auth } from '$lib/stores/auth';
    import { ModeWatcher } from 'mode-watcher';
    import { mode } from 'mode-watcher';
    import { FolderOpen, Code2, LogOut, Loader2, Circle } from 'lucide-svelte';

    import "../app.css";


    // ============ DEBUG LOGGER ============
    const DEBUG_PREFIX = '[LAYOUT]';
    const log = {
        info: (...args: any[]) => console.log(`${DEBUG_PREFIX} [INFO]`, ...args),
        error: (...args: any[]) => console.error(`${DEBUG_PREFIX} [ERROR]`, ...args),
        debug: (...args: any[]) => console.log(`${DEBUG_PREFIX} [DEBUG]`, ...args),
        warn: (...args: any[]) => console.warn(`${DEBUG_PREFIX} [WARN]`, ...args),
        success: (...args: any[]) => console.log(`${DEBUG_PREFIX} [SUCCESS]`, ...args),
    };


    // ============ CONFIGURATION ============
    const CONFIG = {
        API_BASE_URL: PUBLIC_API_BASE_URL,
        SOCKET_URL: PUBLIC_SOCKET_URL,
        AUTO_REFRESH_INTERVAL: 3000,
        SAVE_DEBOUNCE_DELAY: 1000,
        MIN_LOADING_TIME: 2500,
        FILE_REFRESH_DELAY: 500,
        SAVE_LOCK_DURATION: 500,
    };


    log.info('Configuration loaded:', CONFIG);


    interface Props {
        children: Snippet;
    }


    let { children }: Props = $props();


    // ============ REACTIVE STATE ============
    let isAuthenticated = $derived($auth.isAuthenticated);
    let authLoading = $derived($auth.loading);
    let user = $derived($auth.user);
    let currentTheme = $derived(mode.current);


    // ============ COMPONENT STATE ============
    let minimumLoadingComplete = $state(false);
    let tree = $state<Record<string, any>>({});
    let loading = $state(true);
    let selectedFile = $state('');
    let selectedFileContent = $state('');
    let userId = $state('');
    let saveTimeout: ReturnType<typeof setTimeout>;
    let lastSavedContent = $state('');
    let saveInProgress = $state(false);
    let refreshInterval: ReturnType<typeof setInterval> | undefined = undefined;


    // ============ UTILITY FUNCTIONS ============
    function cleanFilePath(path: string): string {
        if (!path) {
            return '';
        }
        let cleanPath = String(path);
        cleanPath = cleanPath.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
        cleanPath = cleanPath.replace(/^['"\s]+|['"\s]+$/g, '');
        cleanPath = cleanPath.replace(/^workspace\//, '');
        cleanPath = cleanPath.replace(/^\.\//g, '');
        cleanPath = cleanPath.replace(/^\/+/, '');
        return cleanPath;
    }


    // ============ FILE TREE OPERATIONS ============
    async function loadFileTree(): Promise<void> {
        const startTime = performance.now();
        log.info('Loading file tree...');
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                log.error('No auth token available for file tree request');
                return;
            }
            log.debug('Fetching file tree from:', `${CONFIG.API_BASE_URL}/files`);
            const response = await fetch(`${CONFIG.API_BASE_URL}/files`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            tree = data.tree || {};
            loading = false;
            const duration = (performance.now() - startTime).toFixed(2);
            log.success(`File tree loaded in ${duration}ms`);
        } catch (error) {
            log.error('Failed to load file tree:', error);
            loading = false;
        }
    }


    // ============ FILE CONTENT OPERATIONS ============
    async function loadFileContent(path: string): Promise<void> {
        if (!path) {
            return;
        }
        const startTime = performance.now();
        log.info('Loading file content:', path);
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                log.error('No auth token for file content request');
                return;
            }
            const cleanPath = cleanFilePath(path);
            const params = new URLSearchParams({ path: cleanPath });
            const url = `${CONFIG.API_BASE_URL}/files/content?${params.toString()}`;
            log.debug('Fetching file content from:', url);
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            let content = data.content || '';
            if (cleanPath.endsWith('.json') && content.trim()) {
                try {
                    const parsed = JSON.parse(content);
                    content = JSON.stringify(parsed, null, 2);
                } catch (jsonError) {
                    log.warn('Failed to format JSON, using raw content:', jsonError);
                }
            }
            selectedFileContent = content;
            lastSavedContent = content;
            const duration = (performance.now() - startTime).toFixed(2);
            log.success(`File content loaded in ${duration}ms (${content.length} bytes)`);
        } catch (error) {
            log.error('Failed to load file content:', error);
            selectedFileContent = '';
            lastSavedContent = '';
        }
    }


    // ============ FILE SELECTION & SAVE HANDLING ============
    function handleFileSelect(path: string): void {
        const cleanPath = cleanFilePath(path);
        if (!cleanPath) return;
        log.info('File selected:', cleanPath);
        saveInProgress = false;
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        selectedFileContent = '';
        lastSavedContent = '';
        selectedFile = cleanPath;
        loadFileContent(cleanPath);
    }


    function handleContentSave(path: string, content: string): void {
        const cleanPath = cleanFilePath(path);
        if (!cleanPath || saveInProgress || !content) return;
        if (content === lastSavedContent || content === selectedFileContent) return;
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (saveInProgress) return;
            saveInProgress = true;
            log.info('Executing save:', { path: cleanPath, contentLength: content.length });
            try {
                socket.emit("file:change", { path: cleanPath, content: content });
                selectedFileContent = content;
                lastSavedContent = content;
                log.success('File saved successfully');
            } catch (error) {
                log.error('Save failed:', error);
            } finally {
                setTimeout(() => {
                    saveInProgress = false;
                }, CONFIG.SAVE_LOCK_DURATION);
            }
        }, CONFIG.SAVE_DEBOUNCE_DELAY);
    }


    // ============ LOGOUT & SOCKET CONNECTION ============
    async function handleLogout() {
        log.info('Logout initiated');
        try {
            if (saveTimeout) clearTimeout(saveTimeout);
            if (refreshInterval) clearInterval(refreshInterval);
            saveInProgress = false;
            if (socket.connected) {
                socket.disconnect();
                log.debug('Socket disconnected');
            }
            auth.logout();
            log.success('Logout successful, reloading...');
            window.location.reload();
        } catch (error) {
            log.error('Logout error:', error);
            window.location.reload();
        }
    }


    // ============ COMPONENT LIFECYCLE ============
    onMount(() => {
        log.info('=== LAYOUT COMPONENT MOUNTED ===');
        log.debug('Socket URL:', CONFIG.SOCKET_URL);
        log.debug('API Base URL:', CONFIG.API_BASE_URL);


        setTimeout(() => {
            minimumLoadingComplete = true;
            log.debug('Minimum loading complete');
        }, CONFIG.MIN_LOADING_TIME);


        async function initializeAuth() {
            log.info('Initializing authentication...');
            try {
                await auth.checkAuth();
                log.success('Authentication check complete');
            } catch (error) {
                log.error('Authentication check failed:', error);
            }
        }
        initializeAuth();


        let socketInitialized = false;
        socket.on('connect', () => {
            if (!socketInitialized) {
                log.success('Socket connected');
                userId = socket.id ?? '';
                localStorage.setItem('userId', userId);
                log.debug('User ID:', userId);
                loadFileTree();
                socketInitialized = true;
            }
        });


        socket.on('disconnect', () => {
            log.warn('Socket disconnected');
            socketInitialized = false;
        });


        socket.on('file:refresh', () => {
            log.info('File refresh event received');
            setTimeout(() => {
                if (!saveInProgress) {
                    loadFileTree();
                } else {
                    log.debug('File refresh skipped (save in progress)');
                }
            }, CONFIG.FILE_REFRESH_DELAY);
        });
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
                    on:click={handleLogout} 
                    class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive/10 text-destructive hover:bg-destructive/20 h-7 px-3"
                >
                    <LogOut class="w-3 h-3 mr-1.5" />
                    Logout
                </button>
            </div>
        </div>
        
        <div class="flex-1 p-6 bg-background overflow-hidden">
            <div class="h-full grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <!-- File Tree -->
                <div class="lg:col-span-3 xl:col-span-2 bg-sidebar-background rounded-lg border border-sidebar-border shadow-sm overflow-hidden order-1">
                    <div class="bg-sidebar-accent/50 border-b border-sidebar-border px-4 py-3">
                        <div class="flex items-center space-x-2">
                            <FolderOpen class="w-4 h-4 text-sidebar-primary" />
                            <h3 class="font-semibold text-sidebar-foreground text-sm">
                                Project Files
                            </h3>
                        </div>
                    </div>


                    <div class="p-4 overflow-y-auto">
                        {#if loading}
                            <div class="flex items-center space-x-2 text-sidebar-foreground/60">
                                <Loader2 class="w-3 h-3 animate-spin" />
                                <p class="text-xs">Loading files...</p>
                            </div>
                        {:else}
                            <FileTree tree={tree} onSelect={handleFileSelect} />
                        {/if}
                    </div>
                </div>
                
                <!-- Code Editor -->
                <div class="lg:col-span-6 xl:col-span-7 bg-card rounded-lg border border-border shadow-sm overflow-hidden order-2">
                    <div class="bg-muted/30 border-b border-border px-4 py-3">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <Code2 class="w-4 h-4 text-muted-foreground" />
                                <h3 class="font-semibold text-foreground text-sm">
                                    Code Editor
                                </h3>
                                {#if selectedFile}
                                    <span class="text-muted-foreground text-xs">•</span>
                                    <span class="text-muted-foreground text-xs font-mono">{selectedFile}</span>
                                {/if}
                            </div>
                            
                            <div class="flex items-center space-x-2">
                                {#if selectedFile}
                                    <div class="flex items-center space-x-1">
                                        <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                        <span class="text-xs text-muted-foreground">Ready</span>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>


                    <div class="h-full">
                        <MonacoEditor
                            {selectedFile}
                            {selectedFileContent}
                            onContentSave={handleContentSave}
                        />
                    </div>
                </div>
                
                <!-- Terminal -->
                <div class="lg:col-span-3 xl:col-span-3 bg-sidebar-background rounded-lg border border-sidebar-border shadow-sm overflow-hidden order-3">
                    <div class="bg-secondary/30 border-b border-border px-4 py-3">
                        <div class="flex items-center space-x-2">
                            <div class="flex space-x-1">
                                <Circle class="w-2.5 h-2.5 fill-red-500 text-red-500" />
                                <Circle class="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
                                <Circle class="w-2.5 h-2.5 fill-green-500 text-green-500" />
                            </div>
                            <h3 class="font-semibold text-foreground text-sm ml-2">
                                Terminal
                            </h3>
                        </div>
                    </div>


                    <div class="h-full bg-sidebar-background overflow-hidden">
                        <Terminal />
                    </div>
                </div>
                
            </div>
        </div>
    </div>
{/if}


{@render children()}
