<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import socket from '$lib/socket';
    import Terminal from '$lib/components/Terminal.svelte';
    import FileTree from '$lib/components/FileTreeNode.svelte';
    import MonacoEditor from '$lib/components/MonacoEditor.svelte';
    import Theme from '$lib/components/theme/Theme.svelte';
    import { auth } from '$lib/stores/auth';
    import { FolderOpen, Code2, LogOut, Circle, Loader2 } from 'lucide-svelte';

    // Get auth context from layout
    const authContext = getContext<{
        isAuthenticated: boolean;
        user: any;
        loading: boolean;
    }>('auth');

    let tree = $state<Record<string, any>>({});
    let loading = $state(true);
    let selectedFile = $state('');
    let selectedFileContent = $state('');
    let userId = $state('');
    let saveTimeout: ReturnType<typeof setTimeout>;
    let lastSavedContent = $state('');
    let saveInProgress = $state(false);
    let refreshInterval: ReturnType<typeof setInterval>;

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

    async function loadFileTree(): Promise<void> {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.error('[ERROR] No auth token for file tree request');
                return;
            }

            console.log('[DEBUG] Loading file tree with auth token...');
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
            console.log('[DEBUG] File tree loaded successfully');
        } catch (error) {
            console.error('[ERROR] Error loading file tree:', error);
            loading = false;
        }
    }

    async function loadFileContent(path: string): Promise<void> {
        if (!path) return;
        
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.error('[ERROR] No auth token for file content request');
                return;
            }

            const cleanPath = cleanFilePath(path);
            const params = new URLSearchParams({ path: cleanPath });
            
            console.log(`[DEBUG] Loading file content with auth token: ${cleanPath}`);
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
            lastSavedContent = content;
            console.log(`[DEBUG] File content loaded successfully: ${cleanPath}`);
        } catch (error) {
            console.error('[ERROR] Failed to load file content:', error);
            selectedFileContent = '';
            lastSavedContent = '';
        }
    }

    function handleFileSelect(path: string): void {
        const cleanPath = cleanFilePath(path);
        if (!cleanPath) return;
        
        saveInProgress = false;
        if (saveTimeout) clearTimeout(saveTimeout);
        selectedFileContent = '';
        lastSavedContent = '';
        selectedFile = cleanPath;
        loadFileContent(cleanPath);
    }

    function handleContentSave(path: string, content: string): void {
        const cleanPath = cleanFilePath(path);
        if (!cleanPath || saveInProgress || !content) return;
        
        if (content === lastSavedContent || content === selectedFileContent) {
            console.log('[DEBUG] Skipping identical content save');
            return;
        }
        
        if (saveTimeout) clearTimeout(saveTimeout);
        
        saveTimeout = setTimeout(() => {
            if (saveInProgress) return;
            
            saveInProgress = true;
            console.log('[SAVE] Executing:', { path: cleanPath, length: content.length });
            
            try {
                socket.emit("file:change", { path: cleanPath, content: content });
                selectedFileContent = content;
                lastSavedContent = content;
                console.log('[SAVE] Success');
            } catch (error) {
                console.error('[SAVE] Failed:', error);
            } finally {
                setTimeout(() => { saveInProgress = false; }, 500);
            }
        }, 1000);
    }

    async function handleLogout() {
        try {
            if (saveTimeout) clearTimeout(saveTimeout);
            if (refreshInterval) clearInterval(refreshInterval);
            saveInProgress = false;
            
            if (socket.connected) {
                socket.disconnect();
            }
            
            auth.logout();
            window.location.reload();
        } catch (error) {
            console.error('[ERROR] Logout error:', error);
            window.location.reload();
        }
    }

    onMount(() => {
        console.log('[PAGE] Mounted');
        console.log('[PAGE] Socket connected status:', socket.connected);
        
        let socketInitialized = false;
        
        // Check if socket is already connected when page mounts
        if (socket.connected && !socketInitialized) {
            console.log('[PAGE] Socket already connected on mount');
            userId = socket.id ?? '';
            localStorage.setItem('userId', userId);
            loadFileTree();
            socketInitialized = true;
            
            // Start auto-refresh
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(() => {
                if (!saveInProgress && authContext.isAuthenticated) {
                    console.log('[AUTO-REFRESH] Refreshing file tree...');
                    loadFileTree();
                }
            }, 3000);
        }
        
        // Listen for future connect events
        socket.on('connect', () => {
            if (!socketInitialized) {
                console.log('[PAGE] Socket connected event');
                userId = socket.id ?? '';
                localStorage.setItem('userId', userId);
                loadFileTree();
                socketInitialized = true;
                
                if (refreshInterval) clearInterval(refreshInterval);
                refreshInterval = setInterval(() => {
                    if (!saveInProgress && authContext.isAuthenticated) {
                        console.log('[AUTO-REFRESH] Refreshing file tree...');
                        loadFileTree();
                    }
                }, 3000);
            }
        });
        
        socket.on('disconnect', () => {
            console.log('[PAGE] Socket disconnected');
            socketInitialized = false;
            if (refreshInterval) clearInterval(refreshInterval);
        });
        
        socket.on('file:refresh', () => {
            setTimeout(() => {
                if (!saveInProgress) loadFileTree();
            }, 500);
        });
        
        const handleRefreshEvent = () => {
            if (!saveInProgress) loadFileTree();
        };
        
        window.addEventListener('refreshFileTree', handleRefreshEvent);
        
        return () => {
            if (saveTimeout) clearTimeout(saveTimeout);
            if (refreshInterval) clearInterval(refreshInterval);
            saveInProgress = false;
            socket.off('file:refresh');
            socket.off('connect');
            socket.off('disconnect');
            window.removeEventListener('refreshFileTree', handleRefreshEvent);
        };
    });
</script>

<div class="h-screen flex flex-col bg-background font-['Epunda_Slab']">
    <div class="bg-sidebar-background/95 backdrop-blur-sm border-b border-sidebar-border text-sidebar-foreground text-xs px-4 py-3 flex justify-between items-center">
        <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span class="text-sidebar-foreground/80">
                    Connected as <span class="font-medium text-sidebar-foreground">{authContext.user?.username}</span>
                </span>
            </div>
            <span class="text-sidebar-foreground/60">•</span>
            <span class="text-sidebar-foreground/60 font-mono text-xs">ID: {authContext.user?.id}</span>
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
