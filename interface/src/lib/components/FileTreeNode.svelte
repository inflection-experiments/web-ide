<script lang="ts">
  import { FolderOpen, Folder, File, ChevronRight } from 'lucide-svelte';

  let { tree, onSelect, currentPath = '' } = $props<{
    tree: Record<string, any>;
    onSelect: (path: string) => void;
    currentPath?: string;
  }>();
  
  // STATE VARIABLES
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

    console.log('[DEBUG] Loading directory contents:', { dirName, fullPath });
    
    loadingDirs.add(dirName);
    loadingDirs = new Set(loadingDirs);
    
    try {
      const url: string = `http://localhost:9000/files/directory?userId=${encodeURIComponent(userId)}&path=${encodeURIComponent(fullPath)}`;
      console.log('[DEBUG] Request URL:', url);
      
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
      
      console.log('[DEBUG] Converted directory tree:', dirTree);
      
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
    console.log('[DEBUG] FORCE REFRESHING ALL EXPANDED DIRECTORIES');
    console.log('  - expandedDirs:', Array.from(expandedDirs));
    console.log('  - currentPath:', `"${currentPath}"`);
    
    directoryContents.clear();
    directoryContents = new Map(directoryContents);
    
    for (const dirName of expandedDirs) {
      const fullPath = currentPath ? `${currentPath}/${dirName}` : dirName;
      console.log(`  [DEBUG] Reloading expanded directory: ${dirName} (${fullPath})`);
      await loadDirectoryContents(dirName, fullPath);
    }
  }

  async function handleFileClick(name: string, isDir: boolean, fullPath: string): Promise<void> {
    console.log('[DEBUG] File click:', { name, isDir, fullPath });
    
    if (isDir) {
      if (expandedDirs.has(name)) {
        console.log('[DEBUG] Collapsing directory:', name);
        expandedDirs.delete(name);
        expandedDirs = new Set(expandedDirs);
      } else {
        console.log('[DEBUG] Expanding directory:', name);
        expandedDirs.add(name);
        expandedDirs = new Set(expandedDirs);
        
        await loadDirectoryContents(name, fullPath);
      }
    } else {
      console.log('[DEBUG] Opening file:', fullPath);
      onSelect(fullPath);
    }
  }

  function handleContextMenu(e: MouseEvent, name: string, fullPath: string, isDir: boolean): void {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[DEBUG] RIGHT CLICK CONTEXT MENU:');
    console.log('  - name:', name);
    console.log('  - fullPath:', `"${fullPath}"`);
    console.log('  - isDir:', isDir);
    console.log('  - currentPath:', `"${currentPath}"`);
    
    contextMenuPosition = { x: e.clientX, y: e.clientY };
    contextMenuPath = fullPath;
    contextMenuType = isDir ? 'directory' : 'file';
    showContextMenu = true;
    
    console.log('[DEBUG] Context menu set:');
    console.log('  - contextMenuPath:', `"${contextMenuPath}"`);
    console.log('  - contextMenuType:', contextMenuType);
  }

  function handleEmptySpaceContextMenu(e: MouseEvent): void {
    if (e.target !== e.currentTarget) {
      console.log('[DEBUG] Ignoring context menu - event from child element');
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[DEBUG] EMPTY SPACE RIGHT CLICK:');
    console.log('  - currentPath:', `"${currentPath}"`);
    
    contextMenuPosition = { x: e.clientX, y: e.clientY };
    contextMenuPath = currentPath;
    contextMenuType = 'empty';
    showContextMenu = true;
    
    console.log('[DEBUG] Empty space context menu set:');
    console.log('  - contextMenuPath:', `"${contextMenuPath}"`);
    console.log('  - contextMenuType:', contextMenuType);
  }

  function createNewItem(type: 'file' | 'directory'): void {
    console.log('[DEBUG] CREATE NEW ITEM TRIGGERED:');
    console.log('  - type:', type);
    console.log('  - contextMenuType:', contextMenuType);
    console.log('  - contextMenuPath:', `"${contextMenuPath}"`);
    
    newItemType = type;
    newItemName = '';
    showCreateDialog = true;
    showContextMenu = false;
  }

  function renameItem(): void {
    console.log('[DEBUG] RENAME ITEM TRIGGERED:');
    console.log('  - contextMenuPath:', `"${contextMenuPath}"`);
    
    const pathParts: string[] = contextMenuPath.split('/');
    oldItemName = pathParts[pathParts.length - 1];
    newItemName = oldItemName;
    
    console.log('  - oldItemName:', `"${oldItemName}"`);
    
    showRenameDialog = true;
    showContextMenu = false;
  }

  async function handleCreate(): Promise<void> {
    console.log('[DEBUG] HANDLE CREATE FUNCTION CALLED:');
    console.log('  - newItemName:', `"${newItemName.trim()}"`);
    console.log('  - newItemType:', newItemType);
    console.log('  - contextMenuType:', contextMenuType);
    console.log('  - contextMenuPath:', `"${contextMenuPath}"`);
    console.log('  - currentPath:', `"${currentPath}"`);
    
    if (!newItemName.trim()) {
      alert('Please enter a name for the item.');
      return;
    }
    
    let parentPath: string = '';
    
    console.log('[DEBUG] DETERMINING PARENT PATH:');
    if (contextMenuType === 'directory') {
      parentPath = contextMenuPath;
      console.log('  [DEBUG] Context: DIRECTORY - using contextMenuPath as parent');
      console.log('     parentPath =', `"${parentPath}"`);
    } else if (contextMenuType === 'file') {
      const pathParts: string[] = contextMenuPath.split('/');
      pathParts.pop();
      parentPath = pathParts.join('/');
      console.log('  [DEBUG] Context: FILE - using file\'s parent directory');
      console.log('     parentPath =', `"${parentPath}"`);
    } else {
      parentPath = currentPath;
      console.log('  [DEBUG] Context: EMPTY - using currentPath');
      console.log('     parentPath =', `"${parentPath}"`);
    }
    
    console.log('[DEBUG] FINAL PARENT PATH:', `"${parentPath}"`);
    
    try {
      const userId: string | null = localStorage.getItem('userId');
      
      if (!userId) {
        console.error('[ERROR] No userId in localStorage');
        alert('Session expired. Please refresh the page.');
        return;
      }
      
      console.log('[DEBUG] UserId:', userId);
      
      const requestPayload = {
        userId: userId,
        path: newItemName.trim(),
        type: newItemType,
        content: newItemType === 'file' ? '' : undefined,
        parentPath: parentPath
      };
      
      console.log('[DEBUG] CREATE REQUEST PAYLOAD:');
      console.log(JSON.stringify(requestPayload, null, 2));
      
      const response: Response = await fetch('http://localhost:9000/files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      
      console.log('[DEBUG] CREATE Response status:', response.status);
      const result = await response.json();
      console.log('[DEBUG] CREATE Server response:', result);
      
      if (response.ok) {
        console.log('[DEBUG] CREATE SUCCESS!');
        showCreateDialog = false;
        
        if (contextMenuType === 'directory') {
          console.log('[DEBUG] Refreshing parent directory after create...');
          const dirName = contextMenuPath.split('/').pop() || contextMenuPath;
          await loadDirectoryContents(dirName, contextMenuPath);
        }
        
        console.log('[DEBUG] Triggering main tree refresh after create...');
        await forceRefreshAllExpandedDirs();
        window.dispatchEvent(new CustomEvent('refreshFileTree'));
        
      } else {
        console.error('[ERROR] CREATE FAILED:', result.error);
        alert(`Failed to create item: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[ERROR] CREATE Network error:', error);
      alert('Network error occurred.');
    }
  }

  async function handleRename(): Promise<void> {
    console.log('[DEBUG] === HANDLE RENAME STARTED ===');
    console.log('  - oldItemName:', `"${oldItemName}"`);
    console.log('  - newItemName:', `"${newItemName.trim()}"`);
    console.log('  - contextMenuPath:', `"${contextMenuPath}"`);
    
    if (!newItemName.trim() || newItemName.trim() === oldItemName) {
      console.log('[DEBUG] Rename cancelled - no change in name');
      return;
    }
    
    const pathParts: string[] = contextMenuPath.split('/');
    pathParts[pathParts.length - 1] = newItemName.trim();
    const newPath: string = pathParts.join('/');
    
    console.log('[DEBUG] RENAME PATH CALCULATION:');
    console.log('  - oldPath:', `"${contextMenuPath}"`);
    console.log('  - newPath:', `"${newPath}"`);
    console.log('  - pathParts:', pathParts);
    
    try {
      const userId: string | null = localStorage.getItem('userId');
      if (!userId) {
        console.error('[ERROR] No userId for rename');
        return;
      }
      
      console.log('[DEBUG] Rename UserId:', userId);
      
      const renamePayload = {
        userId,
        oldPath: contextMenuPath,
        newPath: newPath
      };
      
      console.log('[DEBUG] RENAME REQUEST PAYLOAD:');
      console.log(JSON.stringify(renamePayload, null, 2));
      
      const response: Response = await fetch('http://localhost:9000/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renamePayload)
      });
      
      console.log('[DEBUG] RENAME Response status:', response.status);
      const result = await response.json();
      console.log('[DEBUG] RENAME Server response:', result);
      
      if (response.ok) {
        console.log('[DEBUG] RENAME SUCCESS!');
        showRenameDialog = false;
        
        console.log('[DEBUG] FORCE REFRESHING ALL EXPANDED DIRS AFTER RENAME...');
        await forceRefreshAllExpandedDirs();
        
        console.log('[DEBUG] Triggering main tree refresh after rename...');
        window.dispatchEvent(new CustomEvent('refreshFileTree'));
        
      } else {
        console.error('[ERROR] RENAME FAILED:', result.error || 'Unknown error');
        alert('Failed to rename item: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[ERROR] RENAME Network error:', error);
      alert('Network error during rename.');
    }
    
    console.log('[DEBUG] === HANDLE RENAME COMPLETED ===');
  }

  async function handleDelete(): Promise<void> {
    const itemName: string = contextMenuPath.split('/').pop() || contextMenuPath;
    
    console.log('[DEBUG] === HANDLE DELETE STARTED ===');
    console.log('  - itemName:', `"${itemName}"`);
    console.log('  - contextMenuPath:', `"${contextMenuPath}"`);
    console.log('  - contextMenuType:', contextMenuType);
    
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) {
      console.log('[DEBUG] Delete cancelled by user');
      return;
    }
    
    try {
      const userId: string | null = localStorage.getItem('userId');
      if (!userId) {
        console.error('[ERROR] No userId for delete');
        return;
      }
      
      console.log('[DEBUG] Delete UserId:', userId);
      
      const deleteUrl = `http://localhost:9000/files/delete?userId=${userId}&path=${encodeURIComponent(contextMenuPath)}`;
      console.log('[DEBUG] DELETE URL:', deleteUrl);
      
      const response: Response = await fetch(deleteUrl, {
        method: 'DELETE'
      });
      
      console.log('[DEBUG] DELETE Response status:', response.status);
      const result = await response.json();
      console.log('[DEBUG] DELETE Server response:', result);
      
      if (response.ok) {
        console.log('[DEBUG] DELETE SUCCESS!');
        showContextMenu = false;
        
        console.log('[DEBUG] FORCE REFRESHING ALL EXPANDED DIRS AFTER DELETE...');
        await forceRefreshAllExpandedDirs();
        
        console.log('[DEBUG] Triggering main tree refresh after delete...');
        window.dispatchEvent(new CustomEvent('refreshFileTree'));
        
      } else {
        console.error('[ERROR] DELETE FAILED:', result.error || 'Unknown error');
        alert('Failed to delete item: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[ERROR] DELETE Network error:', error);
      alert('Network error during delete.');
    }
    
    console.log('[DEBUG] === HANDLE DELETE COMPLETED ===');
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
                <span class="animate-spin">Loading</span>
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
                  <span class="text-xs">Empty</span>
                  Empty
                </div>
              {/if}
            {:else}
              <div class="text-red-600 dark:text-red-400 italic py-2 text-sm flex items-center gap-2">
                <span class="text-xs">Warning</span>
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
          <span class="text-base">Edit</span>
          <span>Rename</span>
        </div>
        <div class="px-4 py-3 cursor-pointer text-red-600 dark:text-red-400 flex items-center gap-3 text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/20" on:click={handleDelete}>
          <span class="text-base">Delete</span>
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
