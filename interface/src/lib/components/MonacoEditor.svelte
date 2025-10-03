<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { ChevronRight, Save, AlertTriangle, CheckCircle2, FileText, FileCode, Palette, Globe, FileJson, FileType, Braces, Coffee, Settings, FolderOpen } from 'lucide-svelte';

  export let selectedFile: string = '';
  export let selectedFileContent: string = '';
  export let getFileMode: ((args: { selectedFile: string }) => string) | undefined = undefined;
  export let onContentSave: ((path: string, content: string) => void) | undefined = undefined;
  export let theme: 'light' | 'dark' = 'dark';

  let code: string = '';
  let lastContent: string = '';
  let monaco: any;
  let editor: any;
  let editorContainer: HTMLDivElement;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let resizeObserver: ResizeObserver;
  const dispatch = createEventDispatcher();

  $: isSaved = code === selectedFileContent && code !== "";
  $: pathParts = selectedFile ? selectedFile.split('/').filter(Boolean) : [];

  // MANUAL SAVE FUNCTION
  function manualSave() {
    if (!browser) return;
    
    console.log(`[DEBUG] Manual save triggered for: ${selectedFile}`);
    
    if (!selectedFile || code === undefined || code === null) {
      console.log('[DEBUG] Cannot save - no file selected or no code');
      return;
    }
    
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
      console.log('[DEBUG] Cleared auto-save timeout');
    }
    
    let cleanCode = String(code || '');
    const originalLength = cleanCode.length;
    cleanCode = cleanCode.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    cleanCode = cleanCode.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
    
    console.log(`[DEBUG] Manual save - Original: ${originalLength}, Cleaned: ${cleanCode.length}`);
    
    selectedFileContent = cleanCode;
    
    if (onContentSave) {
      onContentSave(selectedFile, cleanCode);
      console.log(`[DEBUG] Manual save - onContentSave called`);
    }
    
    dispatch('save', { path: selectedFile, content: cleanCode });
    console.log(`[DEBUG] Manual save - Event dispatched`);
  }

  // KEYBOARD SHORTCUTS
  function handleKeyDown(event: KeyboardEvent) {
    if (!browser) return;
    
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      event.stopPropagation();
      console.log('[DEBUG] Ctrl+S detected, triggering save');
      manualSave();
      return false;
    }
  }

  async function loadMonacoFromCDN() {
    if (!browser) return null;
    
    return new Promise((resolve, reject) => {
      if ((window as any).monaco) {
        resolve((window as any).monaco);
        return;
      }

      const existingRequire = (window as any).require;
      const existingDefine = (window as any).define;
      
      delete (window as any).require;
      delete (window as any).define;

      const loaderScript = document.createElement('script');
      loaderScript.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/loader.js';
      
      loaderScript.onload = () => {
        const require = (window as any).require;
        
        require.config({ 
          paths: { 
            vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs' 
          },
          'vs/nls': {
            availableLanguages: {
              '*': undefined
            }
          }
        });
        
        require(['vs/editor/editor.main'], () => {
          if (existingRequire) (window as any).require = existingRequire;
          if (existingDefine) (window as any).define = existingDefine;
          resolve((window as any).monaco);
        }, (error: any) => {
          console.error('Failed to load Monaco modules:', error);
          if (existingRequire) (window as any).require = existingRequire;
          if (existingDefine) (window as any).define = existingDefine;
          reject(error);
        });
      };
      
      loaderScript.onerror = (error) => {
        if (existingRequire) (window as any).require = existingRequire;
        if (existingDefine) (window as any).define = existingDefine;
        reject(error);
      };
      
      document.head.appendChild(loaderScript);
    });
  }

  onMount(async () => {
    if (!browser) return;
    
    console.log('[DEBUG] MonacoEditor mounting');
    
    document.addEventListener('keydown', handleKeyDown, true);
    
    try {
      monaco = await loadMonacoFromCDN();
      
      if (!monaco) {
        console.error('Monaco failed to load');
        return;
      }
      
      console.log('[DEBUG] Monaco loaded successfully');
      
      editor = monaco.editor.create(editorContainer, {
        value: '',
        language: getEditorLanguage(selectedFile, getFileMode),
        theme: theme === 'dark' ? 'vs-dark' : 'vs',
        automaticLayout: false,
        wordWrap: 'on',
        wordWrapColumn: 120,
        scrollbar: {
          vertical: 'hidden',
          horizontal: 'hidden',
          verticalScrollbarSize: 0,
          horizontalScrollbarSize: 0,
          useShadows: false,
          verticalHasArrows: false,
          horizontalHasArrows: false
        },
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        formatOnPaste: true,
        formatOnType: true,
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: false,
        padding: { top: 0, bottom: 0 }
      });

      console.log('[DEBUG] Monaco editor created');

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        console.log('[DEBUG] Monaco keybinding triggered');
        manualSave();
      });

      editor.addAction({
        id: 'save-file',
        label: 'Save File',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => {
          console.log('[DEBUG] Monaco action triggered');
          manualSave();
        }
      });

      editor.onDidChangeModelContent(() => {
        const newCode = editor.getValue();
        if (newCode !== code) {
          code = newCode;
          console.log('[DEBUG] Editor content changed, length:', code.length);
        }
      });

      resizeObserver = new ResizeObserver(() => {
        if (editor) {
          try {
            editor.layout();
          } catch (e) {
            // Ignore layout errors
          }
        }
      });
      resizeObserver.observe(editorContainer);
      
      console.log('[DEBUG] Monaco setup complete');
      
    } catch (error) {
      console.error('[ERROR] Failed to initialize Monaco Editor:', error);
      createFallbackEditor();
    }
  });

  function createFallbackEditor() {
    if (!browser) return;
    
    console.log('[DEBUG] Creating fallback editor');
    
    const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    const textColor = theme === 'dark' ? '#d4d4d4' : '#333333';
    const borderColor = theme === 'dark' ? '#3c3c3c' : '#e1e1e1';
    const headerBg = theme === 'dark' ? '#2d2d30' : '#f8f8f8';
    
    editorContainer.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
        <div style="padding: 8px; background: ${headerBg}; color: ${textColor}; font-size: 12px; border-bottom: 1px solid ${borderColor};">
          Monaco Editor failed to load - using fallback editor (Ctrl+S to save)
        </div>
        <textarea 
          id="fallback-editor"
          style="flex: 1; width: 100%; border: none; outline: none; resize: none; padding: 10px; background: ${bgColor}; color: ${textColor}; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; scrollbar-width: none; -ms-overflow-style: none;"
          placeholder="Loading..."
        ></textarea>
      </div>
    `;
    
    const textarea = editorContainer.querySelector('#fallback-editor') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.setProperty('scrollbar-width', 'none');
      textarea.style.setProperty('-webkit-scrollbar', 'none');
      
      textarea.addEventListener('input', (e) => {
        code = (e.target as HTMLTextAreaElement).value;
      });
      
      textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          manualSave();
        }
      });
      
      editor = {
        setValue: (value: string) => { 
          textarea.value = value;
          code = value;
        },
        getValue: () => textarea.value || '',
        layout: () => {},
        dispose: () => {},
        addCommand: () => {},
        addAction: () => {}
      };
    }
  }

  onDestroy(() => {
    if (!browser) return;
    
    document.removeEventListener('keydown', handleKeyDown, true);
    if (resizeObserver) resizeObserver.disconnect();
    if (editor && editor.dispose) {
      try {
        editor.dispose();
      } catch (e) {
        // Ignore disposal errors
      }
    }
    if (saveTimeout) clearTimeout(saveTimeout);
  });

  // THEME UPDATE
  $: if (browser && monaco && editor && editor.updateOptions) {
    updateTheme();
  }

  function updateTheme() {
    if (!browser || !monaco || !editor) return;
    
    try {
      monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
      console.log(`[DEBUG] Theme updated to: ${theme}`);
    } catch (error) {
      console.error('[ERROR] Failed to update theme:', error);
    }
  }

  // CONTENT UPDATE
  $: if (browser && editor && selectedFile && selectedFileContent !== lastContent) {
    updateEditorContent();
  }

  function updateEditorContent() {
    if (!browser || !editor || !selectedFile) return;
    
    if (selectedFileContent === lastContent) return;
    
    console.log('[DEBUG] Updating editor content');
    
    lastContent = selectedFileContent;
    code = selectedFileContent;
    
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    
    try {
      let cleanContent = selectedFileContent || '';
      cleanContent = cleanContent.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
      cleanContent = cleanContent.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
      
      editor.setValue(cleanContent);
      
      if (monaco && monaco.editor && editor.getModel) {
        const language = getEditorLanguage(selectedFile, getFileMode);
        monaco.editor.setModelLanguage(editor.getModel(), language);
      }
    } catch (error) {
      console.error('[ERROR] Error updating editor content:', error);
    }
  }

  // AUTO-SAVE
  $: if (browser && editor && selectedFile && code !== selectedFileContent && code !== lastContent) {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
      console.log(`[DEBUG] Auto-save triggered for: ${selectedFile}`);
      
      let cleanCode = String(code || '');
      cleanCode = cleanCode.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      cleanCode = cleanCode.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
      
      if (onContentSave) {
        onContentSave(selectedFile, cleanCode);
      }
      dispatch('save', { path: selectedFile, content: cleanCode });
    }, 2000);
  }

  function getEditorLanguage(path: string, customModeFn?: ((args: { selectedFile: string }) => string)): string {
    if (customModeFn) return customModeFn({ selectedFile: path });
    if (!path) return 'plaintext';
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'css': return 'css';
      case 'html': return 'html';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'svelte': return 'html';
      case 'py': return 'python';
      case 'java': return 'java';
      case 'cpp': case 'c': return 'cpp';
      case 'xml': return 'xml';
      case 'yaml': case 'yml': return 'yaml';
      default: return 'plaintext';
    }
  }

  function getFileIcon(filename: string) {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'js':
        return { component: FileCode, class: 'text-yellow-600 dark:text-yellow-400' };
      case 'ts':
        return { component: FileCode, class: 'text-blue-600 dark:text-blue-400' };
      case 'svelte':
        return { component: Braces, class: 'text-orange-600 dark:text-orange-400' };
      case 'css':
        return { component: Palette, class: 'text-purple-600 dark:text-purple-400' };
      case 'html':
        return { component: Globe, class: 'text-red-600 dark:text-red-400' };
      case 'json':
        return { component: FileJson, class: 'text-green-600 dark:text-green-400' };
      case 'md':
        return { component: FileType, class: 'text-gray-600 dark:text-gray-400' };
      case 'py':
        return { component: FileCode, class: 'text-green-600 dark:text-green-400' };
      case 'java':
        return { component: Coffee, class: 'text-orange-600 dark:text-orange-400' };
      case 'cpp':
      case 'c':
        return { component: Settings, class: 'text-gray-600 dark:text-gray-400' };
      default:
        return { component: FileText, class: 'text-gray-500 dark:text-gray-400' };
    }
  }
</script>

{#if selectedFile}
  <div class="editor-header bg-white dark:bg-stone-900 border-b border-gray-300 dark:border-stone-700">
    <!-- File Path Breadcrumb -->
    <div class="flex items-center justify-between px-4 py-2">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <FolderOpen size="16" class="text-gray-500 dark:text-stone-400 flex-shrink-0" />
        
        {#each pathParts as part, i}
          {#if i === pathParts.length - 1}
            <!-- Current File - NO BACKGROUND -->
            {#each [getFileIcon(part)] as iconInfo}
              {@const { component: IconComponent, class: iconClass } = iconInfo}
              <div class="flex items-center gap-2">
                <svelte:component this={IconComponent} size="16" class={iconClass} />
                <span class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {part}
                </span>
              </div>
            {/each}
          {:else}
            <!-- Path Segment -->
            <div class="flex items-center gap-1">
              <span class="text-sm text-gray-600 dark:text-stone-400 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors truncate">
                {part}
              </span>
              <ChevronRight size="12" class="text-gray-400 dark:text-stone-500 flex-shrink-0" />
            </div>
          {/if}
        {/each}
      </div>

      <!-- Status & Actions -->
      <div class="flex items-center gap-3 flex-shrink-0 ml-4">
        {#if isSaved}
          <div class="flex items-center gap-1.5 text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-lg border border-green-300 dark:border-green-700">
            <CheckCircle2 size="14" />
            <span class="text-xs font-medium">Saved</span>
          </div>
        {:else}
          <div class="flex items-center gap-1.5 text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-lg border border-orange-300 dark:border-orange-700">
            <AlertTriangle size="14" />
            <span class="text-xs font-medium">Unsaved</span>
          </div>
        {/if}

        <!-- Save Button -->
        <button
          on:click={manualSave}
          class="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium transition-all rounded-lg
            {isSaved 
              ? 'text-gray-500 dark:text-stone-400 bg-gray-100 dark:bg-stone-800 cursor-default border border-gray-200 dark:border-stone-700' 
              : 'text-orange-800 dark:text-orange-200 bg-orange-200 dark:bg-orange-900/40 hover:bg-orange-300 dark:hover:bg-orange-900/60 border border-orange-400 dark:border-orange-600'
            }"
          disabled={isSaved}
        >
          <Save size="12" />
          <span>Save</span>
          <span class="text-xs opacity-75">(Ctrl+S)</span>
        </button>
      </div>
    </div>

    <!-- File Info Bar -->
    <div class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-stone-900 border-t border-gray-200 dark:border-stone-700">
      <div class="flex items-center gap-4 text-xs text-gray-600 dark:text-stone-400">
        <span class="font-medium">Language: <span class="text-orange-600 dark:text-orange-400">{getEditorLanguage(selectedFile, getFileMode)}</span></span>
        <span>•</span>
        <span>Lines: <span class="font-medium">{code.split('\n').length}</span></span>
        <span>•</span>
        <span>Characters: <span class="font-medium">{code.length}</span></span>
      </div>
      <div class="text-xs text-gray-500 dark:text-stone-400">
        Last saved: <span class="font-medium {isSaved ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}">{isSaved ? 'Now' : 'Pending...'}</span>
      </div>
    </div>
  </div>
{/if}

<div 
  bind:this={editorContainer} 
  class="w-full bg-white dark:bg-stone-900"
  style="height:calc(100% - {selectedFile ? '85px' : '0px'});"
></div>
