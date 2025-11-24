<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import socket from '$lib/socket';
    import { Trash2 } from 'lucide-svelte';
    import '@xterm/xterm/css/xterm.css';
    import { PUBLIC_API_BASE_URL } from '$env/static/public';

    console.log('[DEBUG] [TERMINAL] [ENV] API_BASE_URL loaded:', PUBLIC_API_BASE_URL);

    let terminalRef: HTMLDivElement | null = null;
    let isRendered = false;
    let term: any = null;
    let terminalReady = false;

    // ✅ FIXED: Changed from $state([]) to plain array for Svelte 4
    let portMappings: Array<{containerPort: number, hostPort: number, status: string}> = [];

    async function fetchUserPorts() {
        console.log('[DEBUG] [TERMINAL] Fetching user ports...');
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.log('[DEBUG] [TERMINAL] No auth_token found in localStorage');
                return;
            }
            
            console.log('[DEBUG] [TERMINAL] [ENV CHECK] Using API_BASE_URL:', PUBLIC_API_BASE_URL);
            const response = await fetch(`${PUBLIC_API_BASE_URL}/api/user/ports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('[DEBUG] [TERMINAL] Fetch ports response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                portMappings = data.portMappings || [];
                console.log('[DEBUG] [TERMINAL] Port mappings loaded:', portMappings);
            } else {
                console.error('[ERROR] [TERMINAL] Failed to fetch ports:', response.status);
            }
        } catch (error) {
            console.error('[ERROR] [TERMINAL] Failed to fetch ports:', error);
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
        console.log('[DEBUG] [TERMINAL] updateTerminalTheme called, term ready:', terminalReady);
        if (term && terminalReady) {
            const isDark = document.documentElement.classList.contains('dark');
            const newTheme = isDark ? darkTheme : lightTheme;
            
            console.log('[DEBUG] [TERMINAL] Updating theme to:', isDark ? 'DARK' : 'LIGHT');
            
            term.options.theme = newTheme;
            term.refresh(0, term.rows - 1);
            term.write('\x1b[2J\x1b[H'); 
            term.write('Waiting for container...\r\n');
        }
    }

    function showOnlyActivePort(serverPort: number) {
        console.log('[DEBUG] [TERMINAL] showOnlyActivePort called with port:', serverPort);
        const activePort = portMappings.find(port => port.containerPort === serverPort);
        
        if (activePort) {
            console.log('[DEBUG] [TERMINAL] Active port found:', activePort);
            term.write('\r\n \x1b[32mServer URL:\x1b[0m\r\n');
            const url = `http://localhost:${activePort.hostPort}`;
            term.write(` Code accessible on this port \x1b[34;4m${url}\x1b[0m\r\n\r\n`);
        } else {
            console.log('[DEBUG] [TERMINAL] No matching active port found for:', serverPort);
        }
    }

    onMount(() => {
        console.log('[DEBUG] [TERMINAL] onMount called');
        if (!browser || isRendered) {
            console.log('[DEBUG] [TERMINAL] Skipping mount - browser:', browser, 'isRendered:', isRendered);
            return;
        }
        isRendered = true;

        function handleGlobalThemeChange(event: CustomEvent) {
            console.log('[DEBUG] [TERMINAL] Global theme change received:', event.detail);
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
            console.log('[DEBUG] [TERMINAL] XTerm modules loaded');
            const isDarkMode = document.documentElement.classList.contains('dark');
            console.log('[DEBUG] [TERMINAL] Initial dark mode:', isDarkMode);
            
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

            console.log('[DEBUG] [TERMINAL] XTerm instance created');

            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);

            const webLinksAddon = new WebLinksAddon((event, uri) => {
                console.log('[DEBUG] [TERMINAL] Web link clicked:', uri);
                window.open(uri, '_blank');
            });
            term.loadAddon(webLinksAddon);

            if (terminalRef) {
                console.log('[DEBUG] [TERMINAL] Opening terminal in DOM');
                term.open(terminalRef);
                
                setTimeout(() => {
                    fitAddon.fit();
                    terminalReady = true;
                    console.log('[DEBUG] [TERMINAL] Terminal ready set to true');
                    
                    setTimeout(() => {
                        if (term) {
                            term.write('Waiting for container...\r\n');
                        }
                    }, 100);
                }, 100);
            }

            term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
                const isCtrlOrCmd = event.ctrlKey || event.metaKey;
                
                if (isCtrlOrCmd) {
                    if (event.code === 'KeyC' && event.type === 'keydown' && term.hasSelection()) {
                        console.log('[DEBUG] [TERMINAL] Copy command detected');
                        document.execCommand('copy');
                        return false;
                    }
                    
                    if (event.code === 'KeyV' && event.type === 'keydown') {
                        console.log('[DEBUG] [TERMINAL] Paste command detected');
                        event.preventDefault();
                        event.stopPropagation();
                        
                        navigator.clipboard.readText().then(text => {
                            const cleanText = text
                                .replace(/\r\n/g, ' ')
                                .replace(/\n/g, ' ')
                                .replace(/\r/g, ' ')
                                .trim();
                            
                            console.log('[DEBUG] [TERMINAL] [PASTE] Original:', text.length, 'chars');
                            console.log('[DEBUG] [TERMINAL] [PASTE] Cleaned:', cleanText);
                            
                            socket.emit('terminal:data', cleanText);
                        }).catch(err => {
                            console.error('[ERROR] [TERMINAL] Paste failed:', err);
                        });
                        
                        return false;
                    }
                }
                
                return true;
            });

            term.onData((data: string) => {
                console.log('[DEBUG] [TERMINAL] User input data:', data.length, 'chars');
                socket.emit('terminal:data', data);
            });

            function onTerminalData(data: string) {
                console.log('[DEBUG] [TERMINAL] Received terminal data:', data.length, 'chars');
                const clearSequences = [
                    '\u001b[2J',
                    '\u001b[H\u001b[2J',
                    '\u001b[3J',
                    '\x1Bc'
                ];
                
                const hasClearSequence = clearSequences.some(seq => data.includes(seq));
                
                if (hasClearSequence) {
                    console.log('[DEBUG] [TERMINAL] Clear sequence detected');
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
                
                if (data.includes('running on port') || data.includes('listening on port') || data.includes('started on port') || 
                    data.includes('Server running') || data.includes('server running')) {
                    console.log('[DEBUG] [TERMINAL] Server port detected in output');
                    let detectedPort = 9000;
                    const portMatch = data.match(/port\s+(\d+)/i);
                    if (portMatch) {
                        detectedPort = parseInt(portMatch[1]);
                        console.log('[DEBUG] [TERMINAL] Extracted port number:', detectedPort);
                    }
                    
                    setTimeout(() => {
                        console.log('[DEBUG] [TERMINAL] Fetching ports after server start detection...');
                        fetchUserPorts().then(() => {
                            showOnlyActivePort(detectedPort);
                        });
                    }, 1000);
                }
            }

            socket.on('terminal:ready', () => {
                console.log('[DEBUG] [TERMINAL] Socket event: terminal:ready');
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
                console.log('[DEBUG] [TERMINAL] Resize detected, fitting terminal');
                fitAddon.fit();
            });
            
            if (terminalRef) {
                resizeObserver.observe(terminalRef);
            }

            socket.on("terminal:data", onTerminalData);

            const cleanup = () => {
                console.log('[DEBUG] [TERMINAL] Cleanup function called');
                resizeObserver.disconnect();
                socket.off("terminal:data", onTerminalData);
                socket.off("terminal:ready");
                term?.dispose();
                window.removeEventListener('globalThemeChange', handleGlobalThemeChange as EventListener);
            };

            window.addEventListener('beforeunload', cleanup);
            
            setTimeout(() => {
                console.log('[DEBUG] [TERMINAL] Initial port fetch after 2s delay');
                fetchUserPorts();
            }, 2000);
            
            return cleanup;
        });
    });

    function clearTerminal() {
        console.log('[DEBUG] [TERMINAL] Clear terminal button clicked');
        if (term) {
            term.clear();
            term.write('\x1b[2J\x1b[3J\x1b[H');
            socket.emit("terminal:data", "\x03");
            socket.emit("terminal:data", "clear\n");
            socket.emit("terminal:data", "export PS1='\\w\\$ '\n");
            socket.emit("terminal:data", "cd /workspace\n");
            console.log('[DEBUG] [TERMINAL] Clear commands sent');
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
