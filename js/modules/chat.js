// js/modules/chat.js
// Mengelola semua fungsionalitas live chat, baik dari sisi pengguna maupun admin.

import { API_BASE_URL } from '../config.js';
import { fetchWithAuth } from '../utils/auth.js';

// --- Variabel Global untuk Live Chat Admin ---
let adminWebSocket = null;
let currentAdminChatTarget = null;
const allChatHistories = {}; // Objek untuk menyimpan riwayat chat per user

async function uploadChatFile(file, type) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/chat/upload`, {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || `Gagal mengunggah ${type}.`);
        }
        return { success: true, url: data.location };
    } catch (error) {
        console.error(`Error uploading ${type}:`, error);
        return { success: false, message: error.message };
    }
}

export function setupChatBubble() {
    const chatBubble = document.getElementById('chat-bubble');
    const chatWindow = document.getElementById('chat-window');
    if (!chatBubble || !chatWindow) return;

    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatStatus = document.getElementById('chat-status');
    const chatStartForm = document.getElementById('chat-start-form');
    const chatUserNameInput = document.getElementById('chat-user-name');
    const chatMain = document.getElementById('chat-main');
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const typingIndicator = document.getElementById('typing-indicator');
    const imageInput = document.getElementById('chat-image-input');
    const micBtn = document.getElementById('chat-mic-btn');
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    if (window.location.pathname.includes('dashboard.html')) {
        chatBubble.style.display = 'none';
        chatWindow.style.display = 'none';
        return;
    }

    let ws = null;
    let isConnecting = false;
    const backendWsUrl = 'wss://server-pribadi-hamdi-docker.onrender.com';
    let typingTimeout;

    const showTypingIndicator = (show) => {
        if (typingIndicator) {
            typingIndicator.textContent = show ? 'Admin sedang mengetik...' : '';
        }
    };

    if (chatInput) {
        chatInput.addEventListener('input', () => {
            clearTimeout(typingTimeout);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'typing', isTyping: true }));
            }
            typingTimeout = setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
                }
            }, 2000);
        });
    }

    const appendMessage = (content, type, messageType = 'text') => {
        if (!chatMessages) return;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        if (messageType === 'text') {
            messageDiv.textContent = content;
        } else if (messageType === 'image') {
            const img = document.createElement('img');
            img.src = content;
            img.alt = 'Gambar terkirim';
            img.onload = () => { chatMessages.scrollTop = chatMessages.scrollHeight; };
            messageDiv.appendChild(img);
        } else if (messageType === 'audio') {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = content;
            messageDiv.appendChild(audio);
        } else if (messageType === 'info-upload') {
            messageDiv.className = 'message server-info';
            messageDiv.style.fontStyle = 'italic';
            messageDiv.style.color = 'var(--text-muted-color)';
            messageDiv.textContent = content;
        }

        chatMessages.appendChild(messageDiv);
        if (messageType !== 'image') {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    };

    const updateStatus = (status) => {
        if (!chatStatus) return;
        if (status === 'terhubung') {
            chatStatus.textContent = 'Terhubung dengan admin';
            chatStatus.style.color = '#198754';
        } else if (status === 'menghubungi') {
            chatStatus.textContent = 'Sedang menghubungi admin...';
            chatStatus.style.color = 'var(--text-muted-color)';
        } else {
            chatStatus.textContent = 'Koneksi terputus';
            chatStatus.style.color = '#dc3545';
        }
    };

    const loadChatHistory = async (userId) => {
        if (!userId) return;
        chatMessages.innerHTML = '<div class="message server-info">Memuat riwayat...</div>';
        try {
            const response = await fetch(`${API_BASE_URL}/api/chat/history/${userId}`);
            if (!response.ok) throw new Error('Gagal memuat riwayat');
            const history = await response.json();
            chatMessages.innerHTML = '';
            if (history.length > 0) {
                appendMessage('Ini adalah riwayat percakapan Anda sebelumnya.', 'server-info');
            } else {
                const session = JSON.parse(localStorage.getItem('chatSession'));
                const welcomeName = session ? session.userName : 'Pengunjung';
                appendMessage(`Halo ${welcomeName}! Ada yang bisa kami bantu?`, 'admin');
            }
            history.forEach(msg => {
                appendMessage(msg.content, msg.sender_type, msg.message_type);
            });
        } catch (error) {
            console.error("Gagal memuat riwayat chat:", error);
            appendMessage('Gagal memuat riwayat percakapan.', 'server-info');
        }
    };

    const connect = () => {
        const session = JSON.parse(localStorage.getItem('chatSession'));
        if (isConnecting || (ws && ws.readyState === WebSocket.OPEN) || !session) return;
        isConnecting = true;
        updateStatus('menghubungi');
        ws = new WebSocket(backendWsUrl);
        ws.onopen = () => {
            isConnecting = false;
            ws.send(JSON.stringify({ type: 'identify', session: session }));
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'chat':
                    showTypingIndicator(false);
                    appendMessage(data.content, 'admin', data.messageType);
                    if (chatWindow.classList.contains('hidden')) {
                        new Audio('https://cdn.pixabay.com/audio/2022/10/14/audio_94305374f6.mp3').play().catch(e => console.log("Gagal memainkan suara:", e));
                    }
                    break;
                case 'status_update':
                    updateStatus(data.status);
                    break;
                case 'typing':
                    showTypingIndicator(data.isTyping);
                    break;
            }
        };
        ws.onclose = () => {
            isConnecting = false;
            updateStatus('offline');
            ws = null;
            setTimeout(connect, 3000);
        };
        ws.onerror = (error) => {
            isConnecting = false;
            if (ws) ws.close();
        };
    };

    chatBubble.addEventListener('click', () => {
        chatWindow.classList.remove('hidden');
        const session = JSON.parse(localStorage.getItem('chatSession'));
        if (session && session.userId && session.userName) {
            chatStartForm.style.display = 'none';
            chatMain.classList.remove('hidden');
            chatMain.style.display = 'flex';
            if (!ws || ws.readyState !== WebSocket.OPEN) connect();
        } else {
            chatStartForm.style.display = 'flex';
            chatMain.classList.add('hidden');
        }
    });

    closeChatBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    if (chatStartForm) {
        chatStartForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userName = chatUserNameInput.value.trim();
            if (!userName) return alert('Nama tidak boleh kosong.');
            const newSession = { userId: crypto.randomUUID(), userName: userName };
            localStorage.setItem('chatSession', JSON.stringify(newSession));
            chatStartForm.style.display = 'none';
            chatMain.classList.remove('hidden');
            chatMain.style.display = 'flex';
            await loadChatHistory(newSession.userId);
            connect();
        });
    }

    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearTimeout(typingTimeout);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
            }
            const message = chatInput.value.trim();
            if (message && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'user_message', content: message, messageType: 'text' }));
                appendMessage(message, 'user', 'text');
                chatInput.value = '';
            } else if (!ws || ws.readyState !== WebSocket.OPEN) {
                appendMessage('Koneksi terputus, mencoba menyambungkan kembali...', 'server-info', 'info-upload');
                connect();
            }
        });
    }

    if (imageInput) {
        imageInput.addEventListener('change', async () => {
            const file = imageInput.files[0];
            if (!file) return;
            appendMessage('Mengunggah gambar...', 'server-info', 'info-upload');
            const result = await uploadChatFile(file, 'gambar');
            if (result.success) {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'user_message', content: result.url, messageType: 'image' }));
                    appendMessage(result.url, 'user', 'image');
                }
            } else {
                appendMessage(`Gagal: ${result.message}`, 'server-info', 'info-upload');
            }
            imageInput.value = '';
        });
    }

    if (micBtn) {
        micBtn.addEventListener('click', async () => {
            if (isRecording) {
                mediaRecorder.stop();
                micBtn.classList.remove('is-recording');
                isRecording = false;
            } else {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    mediaRecorder.addEventListener("dataavailable", event => { audioChunks.push(event.data); });
                    mediaRecorder.addEventListener("stop", async () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        const audioFile = new File([audioBlob], `pesan_suara_${Date.now()}.webm`, { type: 'audio/webm' });
                        appendMessage('Mengunggah suara...', 'server-info', 'info-upload');
                        const result = await uploadChatFile(audioFile, 'audio');
                        if (result.success) {
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ type: 'user_message', content: result.url, messageType: 'audio' }));
                                appendMessage(result.url, 'user', 'audio');
                            }
                        } else {
                            appendMessage(`Gagal: ${result.message}`, 'server-info', 'info-upload');
                        }
                        stream.getTracks().forEach(track => track.stop());
                    });
                    mediaRecorder.start();
                    isRecording = true;
                    micBtn.classList.add('is-recording');
                } catch (err) {
                    alert("Tidak dapat mengakses mikrofon. Pastikan Anda telah memberikan izin.");
                }
            }
        });
    }

    const existingSession = JSON.parse(localStorage.getItem('chatSession'));
    if (existingSession && existingSession.userId) {
        if (chatStartForm) chatStartForm.style.display = 'none';
        if (chatMain) {
            chatMain.classList.remove('hidden');
            chatMain.style.display = 'flex';
        }
        loadChatHistory(existingSession.userId);
        connect();
    }
}

function appendAdminMessage(userId, content, type, messageType = 'text', timestamp) {
    const activeChatMessages = document.getElementById('active-chat-messages');
    if (!activeChatMessages || currentAdminChatTarget !== userId) return;

    const messageDate = new Date(timestamp);
    const timeString = messageDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    let lastGroup = activeChatMessages.lastElementChild;
    const senderClass = type === 'admin' ? 'admin' : 'user';

    if (!lastGroup || !lastGroup.classList.contains(`message-group-${senderClass}`)) {
        lastGroup = document.createElement('div');
        lastGroup.className = `message-group message-group-${senderClass}`;
        activeChatMessages.appendChild(lastGroup);
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${senderClass}`;

    if (messageType === 'text') {
        messageDiv.textContent = content;
    } else if (messageType === 'image') {
        const img = document.createElement('img');
        img.src = content;
        img.alt = 'Gambar terkirim';
        img.style.cursor = 'pointer';
        img.onclick = () => window.open(content, '_blank');
        img.onload = () => { activeChatMessages.scrollTop = activeChatMessages.scrollHeight; };
        messageDiv.appendChild(img);
    } else if (messageType === 'audio') {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = content;
        messageDiv.appendChild(audio);
    }

    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';
    metaDiv.textContent = timeString;

    lastGroup.appendChild(messageDiv);
    lastGroup.appendChild(metaDiv);

    activeChatMessages.scrollTop = activeChatMessages.scrollHeight;
}

export async function setupAdminChatUI() {
    const adminChatTab = document.getElementById('admin-chat-tab');
    if (adminChatTab) adminChatTab.classList.remove('hidden');

    const adminChatContainer = document.getElementById('admin-chat-container');
    const userChatListItems = document.getElementById('user-chat-list-items');
    const activeChatMessages = document.getElementById('active-chat-messages');
    const adminChatForm = document.getElementById('admin-chat-form');
    const adminChatInput = document.getElementById('admin-chat-input');
    const backToListBtn = document.getElementById('back-to-list-btn');
    const chatPlaceholder = document.getElementById('chat-placeholder');
    const activeChatContent = document.getElementById('active-chat-content');
    const activeChatAvatar = document.getElementById('active-chat-avatar');
    const activeChatUsername = document.getElementById('active-chat-username');
    const activeChatStatus = document.getElementById('active-chat-status');
    const noChatsMessage = document.getElementById('no-active-chats');

    if (!userChatListItems || !adminChatContainer) return;

    if (backToListBtn) {
        backToListBtn.addEventListener('click', () => {
            adminChatContainer.classList.remove('chat-active');
            currentAdminChatTarget = null;
        });
    }

    const renderConversationEntry = (convo) => {
        let userEntry = document.getElementById(`chat-user-${convo.conversation_id}`);
        if (noChatsMessage) noChatsMessage.style.display = 'none';

        const lastMessageContent = convo.last_message_type === 'image' ? '🖼️ Gambar' : (convo.last_message_type === 'audio' ? '🎤 Pesan Suara' : convo.last_message);
        const timeString = convo.last_message_time ? new Date(convo.last_message_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
        const statusClass = convo.is_online ? 'online' : 'offline';
        const statusText = convo.is_online ? 'Online' : 'Offline';

        if (!userEntry) {
            userEntry = document.createElement('div');
            userEntry.id = `chat-user-${convo.conversation_id}`;
            userEntry.className = 'chat-user-entry';
            userChatListItems.appendChild(userEntry);

            userEntry.addEventListener('click', async () => {
                document.querySelectorAll('.chat-user-entry.active').forEach(el => el.classList.remove('active'));
                userEntry.classList.add('active');
                currentAdminChatTarget = convo.conversation_id;

                chatPlaceholder.style.display = 'none';
                activeChatContent.classList.remove('hidden');
                adminChatContainer.classList.add('chat-active');

                activeChatAvatar.textContent = convo.user_name.charAt(0).toUpperCase();
                activeChatUsername.textContent = convo.user_name;
                activeChatStatus.textContent = statusText;
                activeChatStatus.className = statusClass;

                activeChatMessages.innerHTML = '<p class="message server-info">Memuat riwayat...</p>';
                const unreadDot = userEntry.querySelector('.unread-dot');
                if (unreadDot) unreadDot.classList.add('hidden');

                try {
                    const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/chat/history/${convo.conversation_id}`);
                    if (!res.ok) throw new Error('Gagal mengambil riwayat');
                    const history = await res.json();
                    activeChatMessages.innerHTML = '';
                    history.forEach(msg => {
                        const type = (msg.sender_type === 'admin') ? 'admin' : 'user';
                        appendAdminMessage(convo.conversation_id, msg.content, type, msg.message_type, msg.created_at);
                    });
                } catch (e) {
                    activeChatMessages.innerHTML = '<p class="message server-info" style="color: red;">Gagal memuat riwayat.</p>';
                }
            });
        }

        userEntry.innerHTML = `
            <div class="chat-avatar">${convo.user_name.charAt(0).toUpperCase()}</div>
            <div class="chat-user-info">
                <span class="username">${convo.user_name}</span>
                <span class="message-preview">${lastMessageContent || 'Belum ada pesan'}</span>
            </div>
            <div class="chat-user-meta">
                <span class="timestamp">${timeString}</span>
                <div class="unread-dot hidden"></div>
            </div>
        `;

        if (userChatListItems.firstChild !== userEntry) {
            userChatListItems.prepend(userEntry);
        }
    };

    const fetchAndRenderConversations = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/chat/conversations`);
            if (!res.ok) throw new Error('Gagal memuat daftar percakapan');
            const conversations = await res.json();

            if (conversations.length > 0) {
                userChatListItems.innerHTML = '';
                conversations.forEach(renderConversationEntry);
            } else {
                if (noChatsMessage) noChatsMessage.style.display = 'block';
            }
        } catch (error) {
            console.error(error);
            if (noChatsMessage) noChatsMessage.textContent = 'Gagal memuat percakapan.';
        }
    };

    await fetchAndRenderConversations();

    const accessToken = sessionStorage.getItem('jwt_access_token');
    if (!accessToken) return;
    const backendWsUrl = `wss://server-pribadi-hamdi-docker.onrender.com?token=${accessToken}`;
    adminWebSocket = new WebSocket(backendWsUrl);

    adminWebSocket.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'chat') {
            renderConversationEntry({
                conversation_id: data.sender,
                user_name: data.userName,
                last_message: data.content,
                last_message_type: data.messageType,
                last_message_time: new Date(),
                is_online: true
            });

            if (currentAdminChatTarget === data.sender) {
                appendAdminMessage(data.sender, data.content, 'user', data.messageType, new Date());
            } else {
                const userEntry = document.getElementById(`chat-user-${data.sender}`);
                if (userEntry) {
                    const unreadDot = userEntry.querySelector('.unread-dot');
                    if (unreadDot) unreadDot.classList.remove('hidden');
                }
            }
        } else if (data.type === 'user_disconnected') {
            const userEntry = document.getElementById(`chat-user-${data.userId}`);
            if (userEntry) userEntry.style.opacity = '0.7';
            if (currentAdminChatTarget === data.userId) {
                activeChatStatus.textContent = 'Offline';
                activeChatStatus.className = 'offline';
            }
        }
    };

    if (adminChatForm) {
        adminChatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = adminChatInput.value.trim();
            if (message && currentAdminChatTarget && adminWebSocket.readyState === WebSocket.OPEN) {
                const timestamp = new Date();
                adminWebSocket.send(JSON.stringify({
                    type: 'admin_message',
                    content: message,
                    targetUserId: currentAdminChatTarget,
                    messageType: 'text'
                }));
                appendAdminMessage(currentAdminChatTarget, message, 'admin', 'text', timestamp);

                renderConversationEntry({
                    conversation_id: currentAdminChatTarget,
                    user_name: activeChatUsername.textContent,
                    last_message: `Anda: ${message}`,
                    last_message_type: 'text',
                    last_message_time: timestamp,
                    is_online: true
                });

                adminChatInput.value = '';
            }
        });
    }
}