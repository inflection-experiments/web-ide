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

    let portMappings: Array<{containerPort: number, hostPort: number, status: string}> = $state([]);

    async function fetchUserPorts() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;
            
            const response = await fetch('http://localhost:9000/api/user/ports', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                portMappings = data.portMappings || [];
            }
        } catch (error) {
            console.error('Failed to fetch ports:', error);
        }
    }

    const lightTheme = {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#ff6600',
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
        cursor: '#ff6600',
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

    function updateTerminalTheme() {
        if (term && terminalReady) {
            const isDark = document.documentElement.classList.contains('dark');
            const newTheme = isDark ? darkTheme : lightTheme;
            
            console.log('🎨 [TERMINAL] Updating theme to:', isDark ? 'DARK' : 'LIGHT');
            
            term.options.theme = newTheme;
            term.refresh(0, term.rows - 1);
            term.write('\x1b[2J\x1b[H'); 
            term.write('Waiting for container...\r\n');
        }
    }

    function showOnlyActivePort(serverPort: number) {
        const activePort = portMappings.find(port => port.containerPort === serverPort);
        
        if (activePort) {
            term.write('\r\n🎉 \x1b[32mServer URL:\x1b[0m\r\n');
            const url = `http://localhost:${activePort.hostPort}`;
            term.write(`📡 Code accessible on this port → \x1b[34;4m${url}\x1b[0m\r\n\r\n`);
        }
    }

    onMount(() => {
        if (!browser || isRendered) return;
        isRendered = true;

        function handleGlobalThemeChange(event: CustomEvent) {
            console.log('🎨 [TERMINAL] Global theme change received:', event.detail);
            setTimeout(() => {
                updateTerminalTheme();
            }, 100);
        }

        window.addEventListener('globalThemeChange', handleGlobalThemeChange as EventListener);

        Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links')
        ]).then(([{ Terminal: XTerminal }, { FitAddon }, { WebLinksAddon }]) => {
        
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

        const webLinksAddon = new WebLinksAddon((event, uri) => {
            window.open(uri, '_blank');
        });
        term.loadAddon(webLinksAddon);

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
            
            // ✅ IMPROVED: Better detection for different server messages
            if (data.includes('running on port') || data.includes('listening on port') || data.includes('started on port') || 
                data.includes('Server running') || data.includes('server running')) {
                let detectedPort = 9000; // default
                const portMatch = data.match(/port\s+(\d+)/i);
                if (portMatch) {
                    detectedPort = parseInt(portMatch[1]);
                }
                
                setTimeout(() => {
                    fetchUserPorts().then(() => {
                        showOnlyActivePort(detectedPort);
                    });
                }, 1000);
            }
        }

        socket.on('terminal:ready', () => {
            if (term) {
                term.clear();
                term.write('\x1b[2J\x1b[3J\x1b[H');
                term.write('Container ready! Setting up workspace...\r\n');
                
                setTimeout(() => {
                    socket.emit("terminal:data", "export PS1='\\w\\$ '\n");
                    socket.emit("terminal:data", "clear\n");
                }, 500);
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
        
        setTimeout(() => {
            fetchUserPorts();
        }, 2000);
        
        return cleanup;
        });
    });

    function clearTerminal() {
        if (term) {
            term.clear();
            term.write('\x1b[2J\x1b[3J\x1b[H');
            socket.emit("terminal:data", "\x03");
            socket.emit("terminal:data", "clear\n");
            socket.emit("terminal:data", "export PS1='\\w\\$ '\n");
            socket.emit("terminal:data", "cd /workspace\n");
        }
    }
</script>

<div class="h-full w-full relative">
    <button 
        on:click={clearTerminal}
        class="absolute top-3 right-3 z-50 bg-background/90 hover:bg-muted border border-border text-foreground text-xs px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2 backdrop-blur-sm shadow-lg hover:cursor-pointer"
        title="Clear Terminal"
    >
        <Trash2 size={14} />
    </button>
    
    <div bind:this={terminalRef} class="h-full w-full p-2 [&_a]:cursor-pointer [&_a:hover]:text-orange-500"></div>
</div>

<style>
    :global(.xterm .xterm-viewport::-webkit-scrollbar) {
        display: none !important;
    }
    
    :global(.xterm .xterm-viewport) {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
    }

    :global(a):hover, :global(button):hover, :global([role="button"]):hover {
        cursor: pointer !important;
        color: #ff6600 !important;
    }
    
    :global(.xterm a):hover {
        cursor: pointer !important;
        text-decoration: underline !important;
    }
</style>
