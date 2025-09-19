<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import socket from '$lib/socket';
    import { Trash2 } from 'lucide-svelte';
    import '@xterm/xterm/css/xterm.css';

    let terminalRef: HTMLDivElement | null = null;
    let isRendered = false;
    let term: any = null;
    let terminalReady = false;

    const lightTheme = {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000',
        cursorAccent: '#ffffff',
        selectionBackground: '#b3d4fc',
        selectionForeground: '#000000',
        black: '#000000',
        red: '#cc0000',
        green: '#4e9a06',
        yellow: '#c4a000',
        blue: '#3465a4',
        magenta: '#75507b',
        cyan: '#06989a',
        white: '#d3d7cf',
        brightBlack: '#555753',
        brightRed: '#ef2929',
        brightGreen: '#8ae234',
        brightYellow: '#fce94f',
        brightBlue: '#729fcf',
        brightMagenta: '#ad7fa8',
        brightCyan: '#34e2e2',
        brightWhite: '#eeeeec'
    };

    const darkTheme = {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selectionBackground: '#ff6600',
        selectionForeground: '#000000',
        black: '#555555',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#8be9fd',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#ffffff',
        brightBlack: '#666666',
        brightRed: '#ff6b6b',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff'
    };

    // ✅ FIXED: Function to update terminal theme using direct assignment
    function updateTerminalTheme() {
        if (term && terminalReady) {
            // ✅ Get current theme state from DOM
            const isDark = document.documentElement.classList.contains('dark');
            const newTheme = isDark ? darkTheme : lightTheme;
            
            console.log('🎨 [TERMINAL] Updating theme to:', isDark ? 'DARK' : 'LIGHT');
            
            // ✅ CRITICAL: Direct assignment (setOption is deprecated)
            term.options.theme = newTheme;
            
            // ✅ Force canvas refresh
            term.refresh(0, term.rows - 1);
            
            // ✅ Clear terminal for full repaint
            term.write('\x1b[2J\x1b[H'); // ANSI: clear screen + cursor home
            term.write('Waiting for container...\r\n');
        }
    }

    onMount(() => {
        if (!browser || isRendered) return;
        isRendered = true;

        // ✅ Listen for global theme changes from layout
        function handleGlobalThemeChange(event: CustomEvent) {
            console.log('🎨 [TERMINAL] Global theme change received:', event.detail);
            setTimeout(() => {
                updateTerminalTheme();
            }, 100);
        }

        window.addEventListener('globalThemeChange', handleGlobalThemeChange as EventListener);

        Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit')
        ]).then(([{ Terminal: XTerminal }, { FitAddon }]) => {
        
        // ✅ Get initial theme state
        const isDarkMode = document.documentElement.classList.contains('dark');
        
        term = new XTerminal({
            rows: 15,
            cols: 100,
            cursorBlink: true,
            fontSize: 14,
            lineHeight: 1.2,
            scrollback: 1000,
            convertEol: true,
            theme: isDarkMode ? darkTheme : lightTheme
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        if (terminalRef) {
            term.open(terminalRef);
            
            setTimeout(() => {
                fitAddon.fit();
                terminalReady = true;
                
                setTimeout(() => {
                    if (term) {
                        term.write('Waiting for container...\r\n');
                    }
                }, 100);
            }, 100);
        }

        term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey) {
            if (event.code === 'KeyC' && event.type === 'keydown' && term.hasSelection()) {
                document.execCommand('copy');
                return false;
            }
            
            if (event.code === 'KeyV' && event.type === 'keydown') {
                navigator.clipboard.readText().then(text => {
                socket.emit("terminal:paste", text);
                });
                return false;
            }
            }
            
            return true;
        });

        term.onData((data: string) => {
            socket.emit('terminal:data', data);
        });

        function onTerminalData(data: string) {
            const clearSequences = [
            '\u001b[2J',
            '\u001b[H\u001b[2J',
            '\u001b[3J',
            '\x1Bc'
            ];
            
            const hasClearSequence = clearSequences.some(seq => data.includes(seq));
            
            if (hasClearSequence) {
            term.clear();
            
            let cleanData = data;
            clearSequences.forEach(seq => {
                cleanData = cleanData.replace(new RegExp(seq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
            });
            
            if (cleanData) {
                term.write(cleanData);
            }
            } else {
            term.write(data);
            }
        }

        socket.on('terminal:ready', () => {
            if (term) {
            term.clear();
            term.write('Container ready! Setting up workspace...\r\n');
            }
        });

        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
        });
        
        if (terminalRef) {
            resizeObserver.observe(terminalRef);
        }

        socket.on("terminal:data", onTerminalData);

        const cleanup = () => {
            resizeObserver.disconnect();
            socket.off("terminal:data", onTerminalData);
            socket.off("terminal:ready");
            term?.dispose();
            window.removeEventListener('globalThemeChange', handleGlobalThemeChange as EventListener);
        };

        window.addEventListener('beforeunload', cleanup);
        
        return cleanup;
        });
    });

    function clearTerminal() {
        if (term) {
        term.clear();
        socket.emit("terminal:data", "\x03");
        socket.emit("terminal:data", "cd /workspace\n");
        socket.emit("terminal:data", "export PS1='\\w$ '\n");
        socket.emit("terminal:data", "clear\n");
        }
    }
</script>

<style>
    :global(.xterm .xterm-viewport::-webkit-scrollbar) {
        display: none !important;
    }
    
    :global(.xterm .xterm-viewport) {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
    }
</style>

<div class="h-full w-full relative">
    <button 
        on:click={clearTerminal}
        class="absolute top-3 right-3 z-50 bg-background/90 hover:bg-muted border border-border text-foreground text-xs px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2 backdrop-blur-sm shadow-lg"
        title="Clear Terminal"
    >
        <Trash2 size={14} />
    </button>
    
    <div bind:this={terminalRef} class="h-full w-full p-2"></div>
</div>
