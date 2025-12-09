<script lang="ts">
    import { onMount } from 'svelte';
    import { PUBLIC_API_BASE_URL } from '$env/static/public';
    import socket from '$lib/socket';
    import Terminal from '$lib/components/Terminal.svelte';
    import FileTree from '$lib/components/FileTreeNode.svelte';
    import MonacoEditor from '$lib/components/MonacoEditor.svelte';
    import { auth } from '$lib/stores/auth'; // ADD THIS
    import { FolderOpen, Code2, Loader2, Circle } from 'lucide-svelte';

    // ============ DEBUG LOGGER ============
    const DEBUG_PREFIX = '[PAGE]';
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
        SAVE_DEBOUNCE_DELAY: 1000,
        FILE_REFRESH_DELAY: 500,
        SAVE_LOCK_DURATION: 500,
    };

    log.info('Configuration loaded:', CONFIG);

    // ============ COMPONENT STATE ============
    let tree = $state<Record<string, any>>({});
    let loading = $state(true);
    let selectedFile = $state('');
    let selectedFileContent = $state('');
    let userId = $state('');
    let saveTimeout: ReturnType<typeof setTimeout>;
    let lastSavedContent = $state('');
    let saveInProgress = $state(false);

    // ============ DERIVED STATE ============
    let isAuthenticated = $derived($auth.isAuthenticated); // ADD THIS

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
        
        // ADD THIS CHECK
        if (!isAuthenticated) {
            log.warn('Cannot load file tree - user not authenticated yet');
            setTimeout(() => loadFileTree(), 500); // Retry after 500ms
            return;
        }
        
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
            log.debug('Tree data:', tree);
            log.debug('Tree keys count:', Object.keys(tree).length);
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

    // ============ COMPONENT LIFECYCLE ============
    onMount(() => {
        log.info('=== PAGE COMPONENT MOUNTED ===');
        log.debug('Initial auth state:', isAuthenticated);

        // Wait a bit for auth to complete, then load files
        const initDelay = setTimeout(() => {
            if (socket.connected && isAuthenticated) {
                log.success('Socket connected and authenticated');
                userId = socket.id ?? '';
                localStorage.setItem('userId', userId);
                log.debug('User ID:', userId);
                loadFileTree();
            } else {
                log.warn('Socket not ready, waiting for connect event');
            }
        }, 100); // Small delay to let auth complete

        // Listen for connect event
        socket.on('connect', () => {
            log.success('Socket connected');
            userId = socket.id ?? '';
            localStorage.setItem('userId', userId);
            log.debug('User ID:', userId);
            
            // Wait for auth before loading
            if (isAuthenticated) {
                loadFileTree();
            } else {
                log.warn('Waiting for authentication to complete...');
                setTimeout(() => loadFileTree(), 500);
            }
        });

        socket.on('disconnect', () => {
            log.warn('Socket disconnected');
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

        return () => {
            clearTimeout(initDelay);
            if (saveTimeout) clearTimeout(saveTimeout);
            socket.off('connect');
            socket.off('disconnect');
            socket.off('file:refresh');
        };
    });
</script>

<div class="h-full p-6 bg-background overflow-hidden">
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

            <div class="p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                {#if loading}
                    <div class="flex items-center space-x-2 text-sidebar-foreground/60">
                        <Loader2 class="w-3 h-3 animate-spin" />
                        <p class="text-xs">Loading files...</p>
                    </div>
                {:else if Object.keys(tree).length === 0}
                    <div class="text-sidebar-foreground/60 text-xs text-center py-4">
                        <p class="mb-2">No files found</p>
                        <p class="text-[10px] text-sidebar-foreground/40">Create files using terminal</p>
                    </div>
                {:else}
                    <FileTree {tree} onSelect={handleFileSelect} />
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
