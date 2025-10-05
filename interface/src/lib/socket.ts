// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';
import { env } from '$env/dynamic/public';

const socket: Socket = io(env.PUBLIC_SOCKET_URL);

export default socket;
