import { io, Socket } from 'socket.io-client';
import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

// Prevent SSR crash by only initializing socket in browser
const socket: Socket = browser
    ? io(env.PUBLIC_SOCKET_URL, {
        autoConnect: false, // Control connection manually in layout/auth
        reconnection: true
    })
    : {} as Socket;

export default socket;
