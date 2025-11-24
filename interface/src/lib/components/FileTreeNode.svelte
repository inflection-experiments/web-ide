<script lang="ts">
  import { FolderOpen, Folder, File, ChevronRight } from 'lucide-svelte';
  import { PUBLIC_API_BASE_URL } from '$env/static/public';

  console.log('[DEBUG] [ENV] API_BASE_URL loaded:', PUBLIC_API_BASE_URL);

  let { tree, onSelect, currentPath = '' } = $props<{
    tree: Record<string, any>;
    onSelect: (path: string) => void;
    currentPath?: string;
  }>();
  
  let expandedDirs = $state(new Set<string>());
  let showContextMenu = $state(false);
  let contextMenuPosition = $state({ x: 0, y: 0 });
  let contextMenuPath = $state('');
  let showCreateDialog = $state(false);
  let newItemName = $state('');
  let newItemType = $state<'file' | 'directory'>('file');
  let directoryContents = $state(new Map<string, Record<string, any>>());
  let loadingDirs = $state(new Set<string>());
  let showRenameDialog = $state(false);
  let oldItemName = $state('');
  let contextMenuType = $state<'file' | 'directory' | 'empty'>('empty');

  async function loadDirectoryContents(dirName: string, fullPath: string): Promise<void> {
    const userId: string | null = localStorage.getItem('userId');
    if (!userId) {
      console.error('[ERROR] No userId in localStorage');
      return;
    }

    loadingDirs.add(dirName);
    loadingDirs = new Set(loadingDirs); 
    
    try {
      const url: string = `${PUBLIC_API_BASE_URL}/files/directory?userId=${encodeURIComponent(userId)}&path=${encodeURIComponent(fullPath)}`;
      console.log('[DEBUG] Request URL:', url);
      console.log('[DEBUG] [ENV CHECK] Using API_BASE_URL:', PUBLIC_API_BASE_URL);
      
      const response: Response = await fetch(url);
      
      if (!response.ok) {
        console.error('[ERROR] Failed to load directory:', response.status, response.statusText);
        return;
      }
      
      const data: { items: string[] } = await response.json();
      const items: string[] = data.items || [];
      console.log('[DEBUG] Directory items received:', items);
      
      const dirTree: Record<string, any> = {};
      
      for (const item of items) {
        const [name, type] = item.split('|');
        if (name && type) {
          dirTree[name] = type === 'd' ? {} : null;
        }
      }
      
      directoryContents.set(dirName, dirTree);
      directoryContents = new Map(directoryContents);
      
    } catch (error) {
      console.error(`[ERROR] Error loading directory ${fullPath}:`, error);
    } finally {
      loadingDirs.delete(dirName);
      loadingDirs = new Set(loadingDirs);
    }
  }

  async function forceRefreshAllExpandedDirs(): Promise<void> {
    directoryContents.clear();
    directoryContents = new Map(directoryContents);
    
    for (const dirName of expandedDirs) {
      const fullPath = currentPath ? `${currentPath}/${dirName}` : dirName;
      await loadDirectoryContents(dirName, fullPath);
    }
  }

  async function handleFileClick(name: string, isDir: boolean, fullPath: string): Promise<void> {
    if (isDir) {
      if (expandedDirs.has(name)) {
        expandedDirs.delete(name);
        expandedDirs = new Set(expandedDirs);
      } else {
        expandedDirs.add(name);
        expandedDirs = new Set(expandedDirs);
        
        await loadDirectoryContents(name, fullPath);
      }
    } else {
      onSelect(fullPath);
    }
  }

  function handleContextMenu(e: MouseEvent, name: string, fullPath: string, isDir: boolean): void {
    e.preventDefault();
    e.stopPropagation();
    
    contextMenuPosition = { x: e.clientX, y: e.clientY };
    contextMenuPath = fullPath;
    contextMenuType = isDir ? 'directory' : 'file';
    showContextMenu = true;
  }

  function handleEmptySpaceContextMenu(e: MouseEvent): void {
    if (e.target !== e.currentTarget) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    contextMenuPosition = { x: e.clientX, y: e.clientY };
    contextMenuPath = currentPath;
    contextMenuType = 'empty';
    showContextMenu = true;
  }

  function createNewItem(type: 'file' | 'directory'): void {
    newItemType = type;
    newItemName = '';
    showCreateDialog = true;
    showContextMenu = false;
  }

  function renameItem(): void {
    const pathParts: string[] = contextMenuPath.split('/');
    oldItemName = pathParts[pathParts.length - 1];
    newItemName = oldItemName;
    showRenameDialog = true;
    showContextMenu = false;
  }

  async function handleCreate(): Promise<void> {
    if (!newItemName.trim()) {
      alert('Please enter a name for the item.');
      return;
    }
    
    let parentPath: string = '';
    
    if (contextMenuType === 'directory') {
      parentPath = contextMenuPath;
    } else if (contextMenuType === 'file') {
      const pathParts: string[] = contextMenuPath.split('/');
      pathParts.pop();
      parentPath = pathParts.join('/');
    } else {
      parentPath = currentPath;
    }
    
    try {
      const userId: string | null = localStorage.getItem('userId');
      
      if (!userId) {
        console.error('[ERROR] No userId in localStorage');
        alert('Session expired. Please refresh the page.');
        return;
      }
      
      const requestPayload = {
        userId: userId,
        path: newItemName.trim(),
        type: newItemType,
        content: newItemType === 'file' ? '' : undefined,
        parentPath: parentPath
      };
      
      const response: Response = await fetch(`${PUBLIC_API_BASE_URL}/files/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      
      if (response.ok) {
        showCreateDialog = false;
        
        if (contextMenuType === 'directory') {
          const dirName = contextMenuPath.split('/').pop() || contextMenuPath;
          await loadDirectoryContents(dirName, contextMenuPath);
        }
        
        await forceRefreshAllExpandedDirs();
        window.dispatchEvent(new CustomEvent('refreshFileTree'));
        
      } else {
        const result = await response.json();
        console.error('[ERROR] CREATE FAILED:', result.error);
        alert(`Failed to create item: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[ERROR] CREATE Network error:', error);
      alert('Network error occurred.');
    }
  }

  async function handleRename(): Promise<void> {
    if (!newItemName.trim() || newItemName.trim() === oldItemName) {
      return;
    }
    
    const pathParts: string[] = contextMenuPath.split('/');
    pathParts[pathParts.length - 1] = newItemName.trim();
    const newPath: string = pathParts.join('/');
    
    try {
      const userId: string | null = localStorage.getItem('userId');
      if (!userId) {
        console.error('[ERROR] No userId for rename');
        return;
      }
      
      const renamePayload = {
        userId,
        oldPath: contextMenuPath,
        newPath: newPath
      };
      
      const response: Response = await fetch(`${PUBLIC_API_BASE_URL}/files/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renamePayload)
      });
      
      if (response.ok) {
        showRenameDialog = false;
        
        await forceRefreshAllExpandedDirs();
        window.dispatchEvent(new CustomEvent('refreshFileTree'));
        
      } else {
        const result = await response.json();
        console.error('[ERROR] RENAME FAILED:', result.error || 'Unknown error');
        alert('Failed to rename item: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[ERROR] RENAME Network error:', error);
      alert('Network error during rename.');
    }
  }

  async function handleDelete(): Promise<void> {
    const itemName: string = contextMenuPath.split('/').pop() || contextMenuPath;
    
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) {
      return;
    }
    
    try {
      const userId: string | null = localStorage.getItem('userId');
      if (!userId) {
        console.error('[ERROR] No userId for delete');
        return;
      }
      
      const deleteUrl = `${PUBLIC_API_BASE_URL}/files/delete?userId=${userId}&path=${encodeURIComponent(contextMenuPath)}`;
      
      const response: Response = await fetch(deleteUrl, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showContextMenu = false;
        
        await forceRefreshAllExpandedDirs();
        window.dispatchEvent(new CustomEvent('refreshFileTree'));
        
      } else {
        const result = await response.json();
        console.error('[ERROR] DELETE FAILED:', result.error || 'Unknown error');
        alert('Failed to delete item: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[ERROR] DELETE Network error:', error);
      alert('Network error during delete.');
    }
  }

  $effect(() => {
    const handleClick = (): void => {
      if (showContextMenu) {
        showContextMenu = false;
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  });
</script>

<div class="min-h-full w-full bg-transparent p-2" on:contextmenu={handleEmptySpaceContextMenu}>
  {#each Object.entries(tree) as [name, value]}
    {#if value !== null && typeof value === 'object'}
      <!-- Directory -->
      <div class="mb-0.5">
        <div 
          class="cursor-pointer px-2 py-1 select-none rounded-md flex items-center gap-2 transition-all duration-200 hover:bg-gray-200/70 dark:hover:bg-orange-800/30 {expandedDirs.has(name) ? 'bg-gray-300/80 dark:bg-orange-900/40' : ''} group"
          on:click={() => handleFileClick(name, true, currentPath ? `${currentPath}/${name}` : name)}
          on:contextmenu={(e) => handleContextMenu(e, name, currentPath ? `${currentPath}/${name}` : name, true)}
        >
          <!-- Expand/Collapse Arrow -->
          <div class="w-4 h-4 flex items-center justify-center">
            <ChevronRight 
              size="12"
              class="transition-transform duration-200 text-gray-500 dark:text-gray-400 {expandedDirs.has(name) ? 'rotate-90' : ''}"
            />
          </div>
          
          <!-- Folder Icon -->
          <div class="w-4 h-4 flex items-center justify-center">
            {#if expandedDirs.has(name)}
              <FolderOpen size="16" class="text-gray-800 dark:text-orange-400" />
            {:else}
              <Folder size="16" class="text-gray-800 dark:text-orange-400" />
            {/if}
          </div>
          
          <!-- Folder Name -->
          <span class="text-sm font-medium text-gray-900 dark:text-white flex-1 truncate">{name}</span>
          
          <!-- Status -->
          {#if !expandedDirs.has(name) && !loadingDirs.has(name)}
            <span class="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {Object.keys(directoryContents.get(name) || {}).length || '?'}
            </span>
          {/if}
        </div>
        
        {#if expandedDirs.has(name)}
          <div class="ml-6 border-l border-gray-300 dark:border-gray-700 pl-3 mt-1 space-y-0.5">
            {#if loadingDirs.has(name)}
              <div class="text-gray-500 dark:text-gray-400 italic py-2 text-sm flex items-center gap-2">
                <span class="animate-spin">⟳</span>
                Loading...
              </div>
            {:else if directoryContents.has(name)}
              {@const dirContent = directoryContents.get(name) || {}}
              {#if Object.keys(dirContent).length > 0}
                <svelte:self
                  tree={dirContent}
                  {onSelect}
                  currentPath={currentPath ? `${currentPath}/${name}` : name}
                />
              {:else}
                <div class="text-gray-500 dark:text-gray-400 italic py-2 text-sm flex items-center gap-2">
                  <span class="text-xs">∅</span>
                  Empty
                </div>
              {/if}
            {:else}
              <div class="text-red-600 dark:text-red-400 italic py-2 text-sm flex items-center gap-2">
                <span class="text-xs">⚠</span>
                Failed to load
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <!-- File -->
      <div 
        class="cursor-pointer px-2 py-1 select-none rounded-md flex items-center gap-2 transition-all duration-200 hover:bg-gray-100/70 dark:hover:bg-gray-800/30 group mb-0.5"
        on:click={() => handleFileClick(name, false, currentPath ? `${currentPath}/${name}` : name)}
        on:contextmenu={(e) => handleContextMenu(e, name, currentPath ? `${currentPath}/${name}` : name, false)}
      >
        <!-- Spacer for alignment with folders -->
        <div class="w-4 h-4"></div>
        
        <!-- File Icon -->
        <div class="w-4 h-4 flex items-center justify-center">
          <File size="14" class="text-gray-700 dark:text-gray-300" />
        </div>
        
        <!-- File Name -->
        <span class="text-sm text-gray-900 dark:text-gray-300 flex-1 truncate">{name}</span>
        
        <!-- File Type -->
        <span class="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {name.includes('.') ? name.split('.').pop()?.toUpperCase() : ''}
        </span>
      </div>
    {/if}
  {/each}

  <!-- Context Menu -->
  {#if showContextMenu}
    <div 
      class="fixed bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 shadow-xl z-50 min-w-44 rounded-lg overflow-hidden backdrop-blur-sm"
      style="position: fixed; top: {contextMenuPosition.y}px; left: {contextMenuPosition.x}px;"
    >
      <div class="px-4 py-3 cursor-pointer border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white" on:click={() => createNewItem('file')}>
        <File size="16" />
        <span>New File</span>
      </div>
      <div class="px-4 py-3 cursor-pointer border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white" on:click={() => createNewItem('directory')}>
        <Folder size="16" />
        <span>New Folder</span>
      </div>
      
      {#if contextMenuType === 'file' || contextMenuType === 'directory'}
        <div class="px-4 py-3 cursor-pointer border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white" on:click={renameItem}>
          <span class="text-base">✎</span>
          <span>Rename</span>
        </div>
        <div class="px-4 py-3 cursor-pointer text-red-600 dark:text-red-400 flex items-center gap-3 text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/20" on:click={handleDelete}>
          <span class="text-base">🗑</span>
          <span>Delete</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Create Dialog -->
  {#if showCreateDialog}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div class="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-8 shadow-2xl min-w-96">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Create New {newItemType === 'file' ? 'File' : 'Folder'}
          {#if contextMenuType === 'directory'}
            <br><small class="text-sm text-gray-600 dark:text-gray-400 font-normal">Inside: {contextMenuPath || 'root'}</small>
          {:else if contextMenuType === 'file'}
            <br><small class="text-sm text-gray-600 dark:text-gray-400 font-normal">In same directory as: {contextMenuPath}</small>
          {:else}
            <br><small class="text-sm text-gray-600 dark:text-gray-400 font-normal">In: {currentPath || 'root'}</small>
          {/if}
        </h3>
        <input 
          bind:value={newItemName} 
          placeholder="Enter name..." 
          class="w-full mb-6 p-4 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-white text-black placeholder:text-gray-500 rounded-lg text-base outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50"
          on:keydown={(e) => e.key === 'Enter' && handleCreate()}
          autofocus
        />
        <div class="flex gap-3 justify-end">
          <button 
            class="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-105"
            on:click={() => showCreateDialog = false}
          >
            Cancel
          </button>
          <button 
            class="px-6 py-3 bg-orange-500 text-black rounded-lg text-sm font-medium transition-all hover:bg-orange-600 hover:scale-105 shadow-lg"
            on:click={handleCreate}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Rename Dialog -->
  {#if showRenameDialog}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div class="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-8 shadow-2xl min-w-96">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Rename {contextMenuType === 'file' ? 'File' : 'Folder'}
          <br><small class="text-sm text-gray-600 dark:text-gray-400 font-normal">Current: {oldItemName}</small>
        </h3>
        <input 
          bind:value={newItemName} 
          placeholder="Enter new name..." 
          class="w-full mb-6 p-4 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-white text-black placeholder:text-gray-500 rounded-lg text-base outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50"
          on:keydown={(e) => e.key === 'Enter' && handleRename()}
          autofocus
        />
        <div class="flex gap-3 justify-end">
          <button 
            class="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-105"
            on:click={() => showRenameDialog = false}
          >
            Cancel
          </button>
          <button 
            class="px-6 py-3 bg-orange-500 text-black rounded-lg text-sm font-medium transition-all hover:bg-orange-600 hover:scale-105 shadow-lg"
            on:click={handleRename}
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
