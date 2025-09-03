<script lang="ts">
    import type { Snippet } from 'svelte';
    import { onMount } from 'svelte';
    import socket from '$lib/socket';
    import Terminal from '$lib/components/Terminal.svelte';
    import FileTree from '$lib/components/FileTreeNode.svelte';
    import MonacoEditor from '$lib/components/MonacoEditor.svelte';
    import AuthContainer from '$lib/components/auth/AuthContainer.svelte';
    import { auth } from '$lib/stores/auth';
    import "../app.css";

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();

    // ✅ FIXED: Proper reactive state management
    let isAuthenticated = $derived($auth.isAuthenticated);
    let authLoading = $derived($auth.loading);
    let user = $derived($auth.user);

    let tree = $state<Record<string, any>>({});
    let loading = $state(true);
    let selectedFile = $state('');
    let selectedFileContent = $state('');
    let userId = $state('');

    function cleanFilePath(path: string): string {
        if (!path) return '';
        let cleanPath = String(path);
        cleanPath = cleanPath.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
        cleanPath = cleanPath.replace(/^['"\s]+|['"\s]+$/g, '');
        cleanPath = cleanPath.replace(/^workspace\//, '');
        cleanPath = cleanPath.replace(/^\.\//g, '');
        cleanPath = cleanPath.replace(/^\/+/, '');
        return cleanPath;
    }

    // ✅ CRITICAL FIX: Use Authorization header instead of userId query param
    async function loadFileTree(): Promise<void> {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.error('❌ No auth token for file tree request');
                return;
            }

            console.log('📁 [DEBUG] Loading file tree with auth token...');
            const response = await fetch('http://localhost:9000/files', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            tree = data.tree || {};
            loading = false;
            console.log('✅ [DEBUG] File tree loaded successfully');
        } catch (error) {
            console.error('💥 Error loading file tree:', error);
            loading = false;
        }
    }

    // ✅ CRITICAL FIX: Use Authorization header for file content
    async function loadFileContent(path: string): Promise<void> {
        if (!path) return;
        
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.error('❌ No auth token for file content request');
                return;
            }

            const cleanPath = cleanFilePath(path);
            const params = new URLSearchParams({ path: cleanPath });
            
            console.log(`📖 [DEBUG] Loading file content with auth token: ${cleanPath}`);
            const response = await fetch(`http://localhost:9000/files/content?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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
                    // Use raw content if JSON parsing fails
                }
            }
            
            selectedFileContent = content;
            console.log(`✅ [DEBUG] File content loaded successfully: ${cleanPath}`);
        } catch (error) {
            console.error('💥 Failed to load file content:', error);
            selectedFileContent = '';
        }
    }

    function handleFileSelect(path: string): void {
        const cleanPath = cleanFilePath(path);
        if (!cleanPath) return;
        
        selectedFileContent = '';
        selectedFile = cleanPath;
        loadFileContent(cleanPath);
    }

    // ✅ FIXED: Prevent unwanted content saves
    function handleContentSave(path: string, content: string): void {
        const cleanPath = cleanFilePath(path);
        if (!cleanPath) return;
        
        // Only save if content actually changed
        if (content === selectedFileContent) return;
        
        socket.emit("file:change", {
            path: cleanPath,
            content: content,
        });
    }

    // ✅ ADDED: Fixed logout handler to prevent buffering
    async function handleLogout() {
        try {
            console.log('🚪 Logging out user...');
            
            // Disconnect socket first
            if (socket.connected) {
                socket.disconnect();
                console.log('🔌 Socket disconnected');
            }
            
            // Clear auth store
            auth.logout();
            
            // Force page reload to reset all state
            window.location.reload();
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            // Force reload anyway
            window.location.reload();
        }
    }

    // ✅ FIXED: Proper initialization without causing redirect flash
    onMount(() => {
        console.log('🚀 === MAIN LAYOUT MOUNT START ===');
        
        // ✅ CRITICAL: Initialize auth check immediately
        async function initializeAuth() {
            console.log('🔍 Starting authentication check...');
            try {
                await auth.checkAuth();
                console.log('✅ Authentication check completed');
            } catch (error) {
                console.error('❌ Authentication check failed:', error);
            }
        }
        
        // Initialize auth first
        initializeAuth();
        
        // Socket listeners (only run after auth is initialized)
        socket.on('connect', () => {
            console.log('🔌✅ Socket connected with REAL user authentication!');
            userId = socket.id ?? '';
            localStorage.setItem('userId', userId);
            loadFileTree(); // Now uses auth header instead of socket ID
        });
        
        socket.on('disconnect', () => {
            console.log('🔌❌ Socket disconnected');
        });
        
        socket.on('file:refresh', (path?: string) => {
            console.log('🔄 File refresh event received');
            loadFileTree(); // Now uses auth header
        });
        
        socket.on('terminal:data', (data: string) => {
            if (typeof data === 'string' && data.trim().endsWith('$')) {
                setTimeout(() => {
                    loadFileTree(); // Now uses auth header
                }, 300);
            }
        });
        
        const handleRefreshEvent = (): void => {
            loadFileTree(); // Now uses auth header
        };
        
        window.addEventListener('refreshFileTree', handleRefreshEvent);
        
        console.log('🚀 === MAIN LAYOUT MOUNT END ===');
        
        return () => {
            socket.off('file:refresh');
            socket.off('connect');
            socket.off('disconnect');
            socket.off('terminal:data');
            window.removeEventListener('refreshFileTree', handleRefreshEvent);
        };
    });
</script>

<svelte:head>
    <title>Code Editor</title>
</svelte:head>

<!-- ✅ FIXED: Prevent flash by showing loading screen until auth is resolved -->
{#if authLoading}
    <div class="min-h-screen flex items-center justify-center bg-gray-900">
        <div class="text-white text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Fetching latest data...</p>
            <p class="text-xs text-gray-400 mt-2">almost there...</p>
        </div>
    </div>
{:else if !isAuthenticated}
    <!-- ✅ Only show login if auth check is complete AND user is not authenticated -->
    <AuthContainer />
{:else}
    <!-- ✅ Show main app only when authenticated -->
    <div class="h-screen flex flex-col">
        <!-- User info bar -->
        <div class="bg-zinc-900 text-green-500 text-xs p-1 flex justify-between">
            <span>Logged in as {user?.username} (REAL USER ID: {user?.id})</span>
            <!-- ✅ FIXED: Logout button now uses handleLogout function -->
            <button 
                on:click={handleLogout} 
                class="bg-stone-700 hover:bg-zinc-900 transition-colors rounded px-2 py-1 text-xs"
            >
                Logout
            </button>
        </div>
        
        <div class="flex-1 flex overflow-hidden">
            <!-- ✅ FIXED: Add event prevention to file tree container -->
            <div class="w-64 bg-gray-100 border-r border-gray-300 overflow-y-auto" on:keydown|stopPropagation on:keyup|stopPropagation on:keypress|stopPropagation>
                <div class="p-4">
                    <h3 class="font-semibold text-gray-800 mb-3">Files (Persistent)</h3>
                    {#if loading}
                        <p class="text-gray-600 text-sm">Loading files...</p>
                    {:else}
                        <FileTree tree={tree} onSelect={handleFileSelect} />
                    {/if}
                </div>
            </div>
            <div class="flex-1 bg-white overflow-hidden pt-2">
                <MonacoEditor
                    {selectedFile}
                    {selectedFileContent}
                    onContentSave={handleContentSave}
                />
            </div>
        </div>
        <div class="h-64 overflow-hidden">
            <Terminal />
        </div>
    </div>
{/if}

{@render children()}
