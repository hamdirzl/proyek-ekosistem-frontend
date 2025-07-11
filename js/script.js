// VERSI FINAL (PERBAIKAN 2) - Logika Pemuatan Halaman Diperbaiki
const API_BASE_URL = 'https://server-pribadi-hamdi-docker.onrender.com';

// --- Variabel Global untuk Fitur Cropping & Editor ---
let cropper = null;
let imageToCropElement = null;
let cropModal = null;
let confirmCropBtn = null;
let cancelCropBtn = null;
let currentCropCallback = null;

// --- Variabel Global untuk Live Chat Admin ---
let adminWebSocket = null;
let currentAdminChatTarget = null;
const allChatHistories = {}; // Objek untuk menyimpan riwayat chat per user

// === FUNGSI HELPER UPLOAD FILE CHAT ===
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


function forceLogout() {
    localStorage.removeItem('jwt_refresh_token');
    sessionStorage.removeItem('jwt_access_token');
    localStorage.removeItem('chatSession');
    const authPath = window.location.href.includes('github.io') ? '/hrportof/auth.html' : '/auth.html';
    if (!window.location.pathname.endsWith('auth.html')) {
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
        window.location.href = authPath;
    }
}

async function fetchWithAuth(url, options = {}) {
    let accessToken = sessionStorage.getItem('jwt_access_token');

    options.headers = { ...options.headers };
    if (accessToken) {
        options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    if (options.body instanceof FormData) {
        delete options.headers['Content-Type'];
    } else if (!options.headers['Content-Type'] && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }

    let response = await fetch(url, options);

    if (response.status === 401 || response.status === 403) {
        const refreshToken = localStorage.getItem('jwt_refresh_token');

        if (!refreshToken) {
            forceLogout();
            return response;
        }

        try {
            const refreshResponse = await fetch(`${API_BASE_URL}/api/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: refreshToken })
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                sessionStorage.setItem('jwt_access_token', data.accessToken);

                options.headers['Authorization'] = `Bearer ${data.accessToken}`;
                response = await fetch(url, options);
            } else {
                forceLogout();
            }
        } catch (error) {
            forceLogout();
        }
    }

    return response;
}

// GANTI SELURUH BLOK DOMContentLoaded ANDA DENGAN INI

document.addEventListener('DOMContentLoaded', async () => {
    // Logika autentikasi navbar
    const navDasbor = document.getElementById('nav-dasbor');
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');
    const logoutButtonNav = document.getElementById('logout-button-nav');

    const refreshToken = localStorage.getItem('jwt_refresh_token');

    if (refreshToken) {
        if (navDasbor) navDasbor.style.display = 'list-item';
        if (navLogin) navLogin.style.display = 'none';
        if (navLogout) navLogout.style.display = 'list-item';

        if (logoutButtonNav) {
            logoutButtonNav.addEventListener('click', async () => {
                try {
                    await fetchWithAuth(`${API_BASE_URL}/api/logout`, { method: 'POST' });
                } catch (e) {
                    console.error("Gagal logout di server, tapi tetap lanjut logout di client.", e);
                } finally {
                    forceLogout();
                    const indexPath = window.location.href.includes('github.io') ? '/hrportof/' : '/';
                    window.location.href = indexPath;
                }
            });
        }

    } else {
        if (navDasbor) navDasbor.style.display = 'none';
        if (navLogin) navLogin.style.display = 'list-item';
        if (navLogout) navLogout.style.display = 'none';
    }

    if (refreshToken && !sessionStorage.getItem('jwt_access_token')) {
        try {
            const refreshResponse = await fetch(`${API_BASE_URL}/api/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: refreshToken })
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                sessionStorage.setItem('jwt_access_token', data.accessToken);
                if (document.body.contains(document.getElementById('dashboard-main'))) {
                    await setupDashboardPage();
                }
            } else {
                forceLogout();
            }
        } catch (error) {
            forceLogout();
        }
    }

    // =================================================================
    // == [PERBAIKAN UTAMA] Logika Pemuatan Halaman yang Lebih Spesifik ==
    // =================================================================
    const pageTitle = document.title;
    
    if (document.body.contains(document.getElementById('dashboard-main'))) {
        await setupDashboardPage();
        setupCropModal();
    } else if (pageTitle.includes("Portofolio - HAMDI RIZAL")) {
        setupPortfolioPage();
    } else if (pageTitle.includes("Detail Proyek")) {
        setupProjectDetailPage();
    } else if (pageTitle.includes("Detail Jurnal")) {
        setupJurnalDetailPage();
    } else if (pageTitle.includes("Jurnal - HAMDI RIZAL")) {
        setupJurnalPage();
    } else if (pageTitle.includes("URL Shortener")) {
        setupUrlShortenerPage();
    } else if (pageTitle.includes("Media Converter")) {
        setupMediaConverterPage();
    } else if (pageTitle.includes("QR Code Generator")) {
        attachQrCodeGeneratorListener();
    } else if (pageTitle.includes("Image Compressor")) {
        setupImageCompressorPage();
    } else if (pageTitle.includes("Images to PDF")) {
        attachImagesToPdfListener();
    } else if (document.getElementById('login-form')) {
        setupAuthPage();
    } else if (pageTitle.includes("Logging In...")) {
        setupAuthCallbackPage();
    }

    setupMobileMenu();
    setupAllPasswordToggles();
    setupChatBubble();
    setupAccountManagement();
    setupDashboardTabs();
});


function decodeJwt(token) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
}

function setupChatBubble() {
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

    // Buat grup baru jika tidak ada grup, atau jika pengirimnya berbeda
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
    
    // Auto-scroll ke pesan terakhir
    activeChatMessages.scrollTop = activeChatMessages.scrollHeight;
}

async function setupAdminChatUI() {
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

    // Fungsi untuk merender satu entri percakapan
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
                if(unreadDot) unreadDot.classList.add('hidden');

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
    
    // Fungsi untuk mengambil dan merender semua percakapan saat dasbor dimuat
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
    
    // Logika WebSocket
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
                    if(unreadDot) unreadDot.classList.remove('hidden');
                }
            }
        } else if (data.type === 'user_disconnected') {
            const userEntry = document.getElementById(`chat-user-${data.userId}`);
            if (userEntry) userEntry.style.opacity = '0.7'; 
            if(currentAdminChatTarget === data.userId) {
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

function setupCropModal() {
    cropModal = document.getElementById('crop-modal');
    imageToCropElement = document.getElementById('image-to-crop');
    confirmCropBtn = document.getElementById('confirm-crop-btn');
    cancelCropBtn = document.getElementById('cancel-crop-btn');

    if (!cropModal) return;

    cancelCropBtn.addEventListener('click', () => {
        cropModal.classList.add('hidden');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    });

    confirmCropBtn.addEventListener('click', () => {
        if (cropper && currentCropCallback) {
            cropper.getCroppedCanvas({
                width: 1280,
                imageSmoothingQuality: 'high',
            }).toBlob(blob => {
                currentCropCallback(blob);
                cropModal.classList.add('hidden');
                cropper.destroy();
                cropper = null;
            }, 'image/jpeg', 0.9);
        }
    });
}

function showCropModal(imageSrc, callback, aspectRatio = 16 / 9) {
    if (!cropModal || !imageToCropElement) return;

    currentCropCallback = callback;
    imageToCropElement.src = imageSrc;
    cropModal.classList.remove('hidden');

    if (cropper) {
        cropper.destroy();
    }

    cropper = new Cropper(imageToCropElement, {
        aspectRatio: NaN,
        viewMode: 1,
        background: false,
        autoCropArea: 0.9,
        responsive: true,
        checkOrientation: false,
    });
}

function handleImageSelectionForCropping(file, callback, aspectRatio) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            showCropModal(e.target.result, callback, aspectRatio);
        };
        reader.readAsDataURL(file);
    }
}

async function uploadCroppedImageForEditor(blob, successCallback, failureCallback) {
    const formData = new FormData();
    formData.append('file', blob, 'cropped-image.jpg');

    try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/jurnal/upload-image`, {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengunggah gambar');

        successCallback(data.location);

    } catch (error) {
        failureCallback(`Gagal unggah: ${error.message}`);
    }
}

async function setupDashboardPage() {
    const refreshToken = localStorage.getItem('jwt_refresh_token');
    const authPath = window.location.href.includes('github.io') ? '/hrportof/auth.html' : '/auth.html';
    if (!refreshToken) {
        window.location.href = authPath;
        return;
    }

    const accessToken = sessionStorage.getItem('jwt_access_token');
    if (!accessToken) {
        return;
    }

    const decodedToken = decodeJwt(accessToken);
    populateUserInfo(decodedToken);
    populateUserDashboard();

    if (decodedToken && decodedToken.role === 'admin') {
        setupAdminPanels();
        await setupAdminChatUI();
    }
}

function populateUserInfo(decodedToken) {
    if (decodedToken && decodedToken.email) {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) userEmailElement.textContent = decodedToken.email;
    }
}

async function populateUserDashboard() {
    const userDashboardSection = document.getElementById('user-dashboard-section');
    if (!userDashboardSection) return;

    const statsLinkCountEl = document.getElementById('stats-link-count');
    const statsLastLoginEl = document.getElementById('stats-last-login');

    try {
        const statsResponse = await fetchWithAuth(`${API_BASE_URL}/api/user/dashboard-stats`);
        if (!statsResponse.ok) throw new Error('Gagal memuat data statistik.');

        const stats = await statsResponse.json();

        statsLinkCountEl.textContent = stats.linkCount;
        if (stats.lastLogin) {
            statsLastLoginEl.innerHTML = `${stats.lastLogin.time}<br><small style="font-weight: 400; color: var(--text-muted-color);">${stats.lastLogin.ip}</small>`;
        } else {
            statsLastLoginEl.textContent = 'Belum ada data.';
        }
    } catch (error) {
        statsLinkCountEl.textContent = 'Error';
        statsLastLoginEl.textContent = 'Gagal memuat';
    }

    const historyList = document.getElementById('user-links-list');
    const loadingMessage = document.getElementById('loading-user-links');
    if (!historyList || !loadingMessage) return;

    loadingMessage.textContent = 'Memuat riwayat tautan...';
    try {
        const linksResponse = await fetchWithAuth(`${API_BASE_URL}/api/user/links`);
        if (!linksResponse.ok) throw new Error('Gagal memuat riwayat tautan.');

        const links = await linksResponse.json();

        historyList.innerHTML = '';
        if (links.length === 0) {
            loadingMessage.textContent = 'Anda belum pernah membuat tautan pendek.';
        } else {
            loadingMessage.style.display = 'none';
            links.slice(0, 5).forEach(link => renderUserLinkItem(link, historyList));
        }
    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
    }
}

function setupAdminPanels() {
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) userEmailElement.innerHTML += ' <span style="color: var(--accent-color); font-size: 0.9em;">(Admin)</span>';

    document.getElementById('admin-portfolio-tab')?.classList.remove('hidden');
    document.getElementById('admin-jurnal-tab')?.classList.remove('hidden');
    document.getElementById('admin-links-tab')?.classList.remove('hidden');
    document.getElementById('admin-users-tab')?.classList.remove('hidden');

    setupAdminPortfolioPanel();
    setupAdminJurnalPanel();

    const adminSection = document.getElementById('admin-section');
    if (adminSection) {
        const linkSearchInput = document.getElementById('link-search-input');
        let linkSearchTimeout;
        linkSearchInput.addEventListener('input', (e) => {
            clearTimeout(linkSearchTimeout);
            linkSearchTimeout = setTimeout(() => {
                fetchAndDisplayLinks(e.target.value);
            }, 300);
        });
        fetchAndDisplayLinks();
    }
    const adminUsersSection = document.getElementById('admin-users-section');
    if (adminUsersSection) {
        const userSearchInput = document.getElementById('user-search-input');
        let userSearchTimeout;
        userSearchInput.addEventListener('input', (e) => {
            clearTimeout(userSearchTimeout);
            userSearchTimeout = setTimeout(() => {
                fetchAndDisplayUsers(e.target.value);
            }, 300);
        });
        fetchAndDisplayUsers();
    }
}

function setupAdminPortfolioPanel() {
    const form = document.getElementById('portfolio-form');
    if (!form) return;

    let portfolioQuill;

    const formTitle = document.getElementById('portfolio-form-title');
    const hiddenId = document.getElementById('portfolio-id');
    const titleInput = document.getElementById('portfolio-title');
    const messageDiv = document.getElementById('portfolio-message');
    const clearButton = document.getElementById('clear-portfolio-form');
    const editorDiv = document.getElementById('quill-portfolio-editor');

    const toolbarOptions = [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'image', 'video'],
        ['clean']
    ];

    if (editorDiv) {
        portfolioQuill = new Quill(editorDiv, {
            modules: { toolbar: toolbarOptions },
            theme: 'snow',
            placeholder: 'Jelaskan detail proyek Anda di sini...'
        });
        editorDiv.__quill = portfolioQuill;
    }

    if (portfolioQuill) {
        portfolioQuill.getModule('toolbar').addHandler('image', () => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();

            input.onchange = () => {
                const file = input.files[0];
                if (file) {
                    handleImageSelectionForCropping(file, (blob) => {
                        uploadCroppedImageForEditor(
                            blob,
                            (location) => {
                                const range = portfolioQuill.getSelection(true);
                                portfolioQuill.insertEmbed(range.index, 'image', location);
                            },
                            (errorText) => {
                                console.error(errorText);
                                alert(`Gagal mengunggah gambar: ${errorText}`);
                            }
                        );
                    }, 16 / 9);
                }
            };
        });
    }

    function resetPortfolioForm() {
        form.reset();
        hiddenId.value = '';
        formTitle.textContent = 'Tambah Proyek Baru';
        messageDiv.textContent = '';
        messageDiv.className = '';
        if (portfolioQuill) {
            portfolioQuill.setText('');
        }
    }

    clearButton.addEventListener('click', resetPortfolioForm);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = hiddenId.value;
        const title = titleInput.value;
        const description = portfolioQuill.root.innerHTML;

        if (!title || portfolioQuill.getLength() <= 1) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Error: Judul dan deskripsi tidak boleh kosong.';
            return;
        }

        messageDiv.className = '';
        messageDiv.textContent = "Menyimpan proyek...";

        const url = id ? `${API_BASE_URL}/api/admin/portfolio/${id}` : `${API_BASE_URL}/api/admin/portfolio`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetchWithAuth(url, {
                method,
                body: JSON.stringify({ title, description })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Terjadi kesalahan.');

            messageDiv.className = 'success';
            messageDiv.textContent = id ? 'Proyek berhasil diperbarui!' : 'Proyek berhasil ditambahkan!';

            resetPortfolioForm();
            fetchAndDisplayPortfolioAdmin();
        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = `Error: ${error.message}`;
        }
    });

    fetchAndDisplayPortfolioAdmin();
}

async function fetchAndDisplayPortfolioAdmin() {
    const listContainer = document.getElementById('portfolio-list-admin');
    const loadingMessage = document.getElementById('loading-portfolio-admin');
    if (!listContainer || !loadingMessage) return;

    loadingMessage.style.display = 'block';
    listContainer.innerHTML = '';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/portfolio`);
        const projects = await response.json();
        if (!response.ok) throw new Error(projects.error || 'Gagal memuat proyek.');

        loadingMessage.style.display = 'none';

        if (projects.length === 0) {
            listContainer.innerHTML = '<li><p>Belum ada proyek ditambahkan.</p></li>';
            return;
        }

        projects.forEach(project => renderAdminPortfolioItem(project, listContainer));
    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
    }
}

function renderAdminPortfolioItem(project, container) {
    const listItem = document.createElement('li');
    listItem.className = 'mood-item';
    listItem.id = `portfolio-item-${project.id}`;
    const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

    const strippedDescription = project.description.replace(/<[^>]+>/g, ' ');

    listItem.innerHTML = `
        <div class="mood-item-header">
            <span><strong>${project.title}</strong></span>
            <div class="mood-item-actions">
                <button class="mood-icon-button edit-portfolio-btn" data-id="${project.id}" aria-label="Edit Proyek">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button class="mood-icon-button delete-portfolio-btn delete-button" data-id="${project.id}" aria-label="Hapus Proyek">
                    ${trashIconSvg}
                </button>
            </div>
        </div>
        <p class="mood-notes">${strippedDescription.substring(0, 100)}...</p>
        <small class="mood-date">Dibuat: ${new Date(project.created_at).toLocaleString('id-ID')}</small>
    `;
    container.appendChild(listItem);

    listItem.querySelector('.edit-portfolio-btn').addEventListener('click', async () => {
        document.getElementById('portfolio-form-title').textContent = 'Edit Proyek';
        document.getElementById('portfolio-id').value = project.id;
        document.getElementById('portfolio-title').value = project.title;

        const editorDiv = document.getElementById('quill-portfolio-editor');
        if (editorDiv && editorDiv.__quill) {
            editorDiv.__quill.root.innerHTML = project.description;
        }

        document.getElementById('portfolio-form').scrollIntoView({ behavior: 'smooth' });
    });

    listItem.querySelector('.delete-portfolio-btn').addEventListener('click', async () => {
        if (!confirm(`Yakin ingin menghapus proyek "${project.title}"?`)) return;

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/portfolio/${project.id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            alert('Proyek berhasil dihapus.');
            fetchAndDisplayPortfolioAdmin();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });
}

function setupAdminJurnalPanel() {
    const form = document.getElementById('jurnal-form');
    if (!form) return;

    let quill;

    const formTitle = document.getElementById('jurnal-form-title');
    const hiddenId = document.getElementById('jurnal-id');
    const titleInput = document.getElementById('jurnal-title');
    const messageDiv = document.getElementById('jurnal-message');
    const clearButton = document.getElementById('clear-jurnal-form');
    const editorDiv = document.getElementById('quill-editor');

    const toolbarOptions = [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'image', 'video'],
        ['clean']
    ];

    if (editorDiv) {
        quill = new Quill(editorDiv, {
            modules: {
                toolbar: toolbarOptions
            },
            theme: 'snow',
            placeholder: 'Tuliskan pemikiran Anda di sini...'
        });
        editorDiv.__quill = quill;
    }


    if (quill) {
        quill.getModule('toolbar').addHandler('image', () => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();

            input.onchange = () => {
                const file = input.files[0];
                if (file) {
                    handleImageSelectionForCropping(file, (blob) => {
                        uploadCroppedImageForEditor(
                            blob,
                            (location) => {
                                const range = quill.getSelection(true);
                                quill.insertEmbed(range.index, 'image', location);
                            },
                            (errorText) => {
                                console.error(errorText);
                                alert(`Gagal mengunggah gambar: ${errorText}`);
                            }
                        );
                    }, 16 / 9);
                }
            };
        });
    }

    function resetJurnalForm() {
        form.reset();
        hiddenId.value = '';
        formTitle.textContent = 'Tambah Postingan Baru';
        messageDiv.textContent = '';
        messageDiv.className = '';
        if (quill) {
            quill.setText('');
        }
    }

    clearButton.addEventListener('click', resetJurnalForm);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = hiddenId.value;
        const title = titleInput.value;
        const content = quill.root.innerHTML;

        if (!title || quill.getLength() <= 1) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Error: Judul dan konten tidak boleh kosong.';
            return;
        }

        messageDiv.className = '';
        messageDiv.textContent = "Menyimpan postingan...";

        const url = id ? `${API_BASE_URL}/api/admin/jurnal/${id}` : `${API_BASE_URL}/api/admin/jurnal`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetchWithAuth(url, {
                method,
                body: JSON.stringify({ title, content })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Terjadi kesalahan.');

            messageDiv.className = 'success';
            messageDiv.textContent = id ? 'Postingan berhasil diperbarui!' : 'Postingan berhasil ditambahkan!';

            resetJurnalForm();
            fetchAndDisplayJurnalAdmin();
        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = `Error: ${error.message}`;
        }
    });

    fetchAndDisplayJurnalAdmin();
}

async function fetchAndDisplayJurnalAdmin() {
    const listContainer = document.getElementById('jurnal-list-admin');
    const loadingMessage = document.getElementById('loading-jurnal-admin');
    if (!listContainer || !loadingMessage) return;

    loadingMessage.style.display = 'block';
    listContainer.innerHTML = '';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/jurnal`);
        const posts = await response.json();
        if (!response.ok) throw new Error(posts.error || 'Gagal memuat postingan.');

        loadingMessage.style.display = 'none';

        if (posts.length === 0) {
            listContainer.innerHTML = '<li><p>Belum ada postingan jurnal ditambahkan.</p></li>';
            return;
        }

        posts.forEach(post => renderAdminJurnalItem(post, listContainer));
    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
    }
}

function renderAdminJurnalItem(post, container) {
    const listItem = document.createElement('li');
    listItem.className = 'mood-item';
    listItem.id = `jurnal-item-${post.id}`;
    const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    const strippedContent = post.content.replace(/<[^>]+>/g, ' ');

    listItem.innerHTML = `
        <div class="mood-item-header">
            <span><strong>${post.title}</strong></span>
            <div class="mood-item-actions">
                <button class="mood-icon-button edit-jurnal-btn" data-id="${post.id}" aria-label="Edit Postingan">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button class="mood-icon-button delete-jurnal-btn delete-button" data-id="${post.id}" aria-label="Hapus Postingan">
                    ${trashIconSvg}
                </button>
            </div>
        </div>
        <p class="mood-notes">${strippedContent.substring(0, 100)}...</p>
        <small class="mood-date">Dibuat: ${new Date(post.created_at).toLocaleString('id-ID')}</small>
    `;
    container.appendChild(listItem);

    listItem.querySelector('.edit-jurnal-btn').addEventListener('click', async () => {
        document.getElementById('jurnal-form-title').textContent = 'Edit Postingan';
        document.getElementById('jurnal-id').value = post.id;
        document.getElementById('jurnal-title').value = post.title;

        const editorDiv = document.getElementById('quill-editor');
        if (editorDiv && editorDiv.__quill) {
            editorDiv.__quill.root.innerHTML = post.content;
        }

        document.getElementById('jurnal-form').scrollIntoView({ behavior: 'smooth' });
    });

    listItem.querySelector('.delete-jurnal-btn').addEventListener('click', async () => {
        if (!confirm(`Yakin ingin menghapus postingan "${post.title}"?`)) return;

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/jurnal/${post.id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            alert('Postingan berhasil dihapus.');
            fetchAndDisplayJurnalAdmin();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });
}

async function fetchAndDisplayLinks(searchQuery = '') {
    const linkList = document.getElementById('link-list');
    const loadingMessage = document.getElementById('loading-links');
    if (!linkList || !loadingMessage) return;

    const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

    loadingMessage.textContent = 'Memuat semua tautan...';
    loadingMessage.style.display = 'block';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/links?search=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) throw new Error('Gagal mengambil data link. Pastikan Anda adalah admin.');

        const links = await response.json();
        loadingMessage.style.display = 'none';
        linkList.innerHTML = '';

        if (links.length === 0) {
            linkList.innerHTML = '<li><p>Tidak ada link yang cocok ditemukan.</p></li>';
            return;
        }

        links.forEach(link => {
            const listItem = document.createElement('li');
            listItem.className = 'mood-item';
            listItem.id = `link-${link.slug}`;
            listItem.innerHTML = `
                <div class="mood-item-header">
                    <span><strong>Slug:</strong> ${link.slug}</span>
                    <div class="mood-item-actions">
                         <button class="mood-icon-button delete-link-btn delete-button" data-slug="${link.slug}" aria-label="Hapus Tautan">${trashIconSvg}</button>
                    </div>
                </div>
                <p class="mood-notes" style="word-break: break-all;">
                  <strong>URL Asli:</strong> <a href="${link.original_url}" target="_blank">${link.original_url}</a>
                </p>
                <small class="mood-date">Dibuat pada: ${new Date(link.created_at).toLocaleString('id-ID')}</small>
            `;
            linkList.appendChild(listItem);
        });

        document.querySelectorAll('.delete-link-btn').forEach(button => {
            button.addEventListener('click', handleDeleteLink);
        });

    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
    }
}
async function fetchAndDisplayUsers(searchQuery = '') {
    const userList = document.getElementById('user-list');
    const loadingMessage = document.getElementById('loading-users');
    if (!userList || !loadingMessage) return;

    loadingMessage.textContent = 'Memuat daftar pengguna...';
    loadingMessage.style.display = 'block';
    userList.innerHTML = '';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/users?search=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch users.');
        }

        const users = await response.json();
        loadingMessage.style.display = 'none';

        if (users.length === 0) {
            userList.innerHTML = '<li><p>Tidak ada pengguna yang cocok ditemukan.</p></li>';
            return;
        }

        const repeatIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-repeat"><polyline points="17 1 21 5 17 9"></polyline><path d="M21 15v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12"></path></svg>`;
        const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

        users.forEach(user => {
            const listItem = document.createElement('li');
            listItem.className = 'mood-item';
            listItem.id = `user-${user.id}`;
            listItem.innerHTML = `
                <div class="mood-item-header">
                    <span><strong>Email:</strong> ${user.email}</span>
                    <span><strong>Role:</strong> <span id="role-${user.id}">${user.role}</span></span>
                    <div class="mood-item-actions">
                        <button class="mood-icon-button toggle-user-role-btn" data-user-id="${user.id}" data-current-role="${user.role}" aria-label="Ubah Peran">${repeatIconSvg}</button>
                        <button class="mood-icon-button delete-user-btn delete-button" data-user-id="${user.id}" aria-label="Hapus Pengguna">${trashIconSvg}</button>
                    </div>
                </div>
                <small class="mood-date">Bergabung pada: ${new Date(user.created_at).toLocaleString('id-ID')}</small>
            `;
            userList.appendChild(listItem);
        });

        document.querySelectorAll('.toggle-user-role-btn').forEach(button => button.addEventListener('click', toggleUserRole));
        document.querySelectorAll('.delete-user-btn').forEach(button => button.addEventListener('click', deleteUser));

    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
    }
}
async function handleDeleteLink(event) {
    const button = event.currentTarget;
    const slugToDelete = button.dataset.slug;
    if (!confirm(`Anda yakin ingin menghapus link dengan slug "${slugToDelete}"?`)) return;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/links/${slugToDelete}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal menghapus link.');

        alert(data.message);
        const listItemToRemove = document.getElementById(`link-${slugToDelete}`);
        if (listItemToRemove) listItemToRemove.remove();

    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}
async function toggleUserRole(event) {
    const button = event.currentTarget;
    const userId = button.dataset.userId;
    const currentRole = button.dataset.currentRole;
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Anda yakin ingin mengubah peran pengguna ini menjadi ${newRole}?`)) return;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal memperbarui peran.');

        alert(data.message);
        const roleSpan = document.getElementById(`role-${userId}`);
        if (roleSpan) {
            roleSpan.textContent = newRole;
            button.dataset.currentRole = newRole;
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}
async function deleteUser(event) {
    const button = event.currentTarget;
    const userId = button.dataset.userId;
    if (!confirm(`Anda yakin ingin menghapus pengguna ini secara permanen? Tindakan ini tidak bisa dibatalkan.`)) return;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/users/${userId}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal menghapus pengguna.');

        alert(data.message);
        const listItemToRemove = document.getElementById(`user-${userId}`);
        if (listItemToRemove) listItemToRemove.remove();

    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}
function setupPortfolioPage() {
    const portfolioGrid = document.querySelector('.portfolio-grid');
    if (!portfolioGrid) return;

    async function fetchAndRenderPortfolio() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/portfolio`);
            if (!response.ok) throw new Error('Gagal memuat data portofolio.');

            const projects = await response.json();
            portfolioGrid.innerHTML = '';

            if (projects.length === 0) {
                portfolioGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted-color);">Belum ada proyek portofolio untuk ditampilkan.</p>';
                return;
            }

            projects.forEach(project => {
                const projectCard = document.createElement('a');
                projectCard.className = 'portfolio-card portfolio-link-card';
                projectCard.href = `project-detail.html?id=${project.id}`;
                projectCard.setAttribute('data-aos', 'fade-up');

                const projectImage = project.image_url || 'https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=500&q=80';

                const projectLinkButton = `<span class="button-pintu">Lihat Detail</span>`;

                projectCard.innerHTML = `
                    <img src="${projectImage}" alt="Gambar proyek ${project.title}">
                    <div class="card-content">
                        <h3>${project.title}</h3>
                        <p>${project.description.replace(/<[^>]+>/g, ' ').substring(0, 150)}...</p>
                        ${projectLinkButton}
                    </div>
                `;
                portfolioGrid.appendChild(projectCard);
            });

        } catch (error) {
            console.error('Error:', error);
            portfolioGrid.innerHTML = `<p style="text-align: center; color: var(--text-muted-color);">${error.message}</p>`;
        }
    }
    fetchAndRenderPortfolio();
}

function setupProjectDetailPage() {
    const titleElement = document.getElementById('jurnal-title');
    const metaElement = document.getElementById('jurnal-meta');
    const imageElement = document.getElementById('jurnal-image');
    const contentElement = document.getElementById('jurnal-content');
    const linkElement = document.getElementById('project-link');
    const mainContent = document.getElementById('main-content');
    const loadingIndicator = document.getElementById('loading-indicator');

    async function fetchProjectDetails() {
        try {
            const params = new URLSearchParams(window.location.search);
            const projectId = params.get('id');

            if (!projectId) {
                throw new Error('ID Proyek tidak ditemukan di URL.');
            }

            const response = await fetch(`${API_BASE_URL}/api/portfolio/${projectId}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Proyek tidak ditemukan.');
            }

            const project = await response.json();

            document.title = `${project.title} - Detail Proyek`;
            titleElement.textContent = project.title;
            metaElement.textContent = `Dipublikasikan pada ${new Date(project.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;

            if (project.image_url) {
                imageElement.src = project.image_url;
                imageElement.alt = `Gambar utama untuk ${project.title}`;
                imageElement.style.display = 'block';
            } else {
                imageElement.style.display = 'none';
            }

            contentElement.innerHTML = project.description;

            if (project.project_link) {
                linkElement.href = project.project_link;
                linkElement.style.display = 'inline-block';
            } else {
                linkElement.style.display = 'none';
            }

            loadingIndicator.style.display = 'none';
            mainContent.style.display = 'block';

        } catch (error) {
            loadingIndicator.innerHTML = `<p style="color: #ff4d4d;">Error: ${error.message}</p>`;
        }
    }
    fetchProjectDetails();
}

function setupJurnalPage() {
    const jurnalGrid = document.querySelector('.jurnal-grid');
    if (!jurnalGrid) return;

    async function fetchAndRenderJurnal() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/jurnal`);
            if (!response.ok) throw new Error('Gagal memuat data jurnal.');

            const posts = await response.json();
            jurnalGrid.innerHTML = '';

            if (posts.length === 0) {
                jurnalGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted-color);">Belum ada tulisan untuk ditampilkan.</p>';
                return;
            }

            posts.forEach(post => {
                const postCard = document.createElement('article');
                postCard.className = 'jurnal-card';
                postCard.setAttribute('data-aos', 'fade-up');

                const firstImageMatch = post.content.match(/<img[^>]+src="([^">]+)"/);
                const postImage = post.image_url || (firstImageMatch ? firstImageMatch[1] : 'https://images.unsplash.com/photo-1489549132488-d00b7d8818e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80');

                const strippedContent = post.content.replace(/<[^>]+>/g, ' ');
                const excerpt = strippedContent.substring(0, 150).trim() + (strippedContent.length > 150 ? '...' : '');

                postCard.innerHTML = `
                    <a href="jurnal-detail.html?id=${post.id}" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; height: 100%;">
                        <img src="${postImage}" alt="Gambar untuk ${post.title}">
                        <div class="jurnal-content">
                            <h3>${post.title}</h3>
                            <p class="post-meta">Dipublikasikan pada ${new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p>${excerpt}</p>
                            <span class="button-pintu" style="margin-top: auto;">Baca Selengkapnya</span>
                        </div>
                    </a>
                `;
                jurnalGrid.appendChild(postCard);
            });

        } catch (error) {
            console.error('Error:', error);
            jurnalGrid.innerHTML = `<p style="text-align: center; color: var(--text-muted-color);">${error.message}</p>`;
        }
    }
    fetchAndRenderJurnal();
}

function setupJurnalDetailPage() {
    const titleElement = document.getElementById('jurnal-title');
    const metaElement = document.getElementById('jurnal-meta');
    const imageElement = document.getElementById('jurnal-image');
    const contentElement = document.getElementById('jurnal-content');
    const mainContent = document.getElementById('main-content');
    const loadingIndicator = document.getElementById('loading-indicator');

    async function fetchJurnalDetails() {
        try {
            const params = new URLSearchParams(window.location.search);
            const postId = params.get('id');

            if (!postId) throw new Error('ID Postingan tidak ditemukan di URL.');

            const response = await fetch(`${API_BASE_URL}/api/jurnal/${postId}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Postingan tidak ditemukan.');
            }

            const post = await response.json();

            document.title = `${post.title} - Detail Jurnal`;
            titleElement.textContent = post.title;
            metaElement.textContent = `Dipublikasikan pada ${new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;

            const firstImageMatch = post.content.match(/<img[^>]+src="([^">]+)"/);
            const mainImage = post.image_url || (firstImageMatch ? firstImageMatch[1] : null);

            if (mainImage) {
                imageElement.src = mainImage;
                imageElement.alt = `Gambar untuk ${post.title}`;
                imageElement.style.display = 'block';
            } else {
                imageElement.style.display = 'none';
            }

            contentElement.innerHTML = post.content;

            loadingIndicator.style.display = 'none';
            mainContent.style.display = 'block';

        } catch (error) {
            loadingIndicator.innerHTML = `<p style="color: #ff4d4d;">Error: ${error.message}</p>`;
        }
    }
    fetchJurnalDetails();
}

function setupCustomFileInputs() {
    // Media Converter
    const converterInput = document.getElementById('file-input');
    const converterLabel = document.getElementById('file-count-label');
    if (converterInput && converterLabel) {
        converterInput.addEventListener('change', () => {
            if (converterInput.files.length > 0) {
                converterLabel.textContent = `${converterInput.files[0].name} dipilih.`;
            } else {
                converterLabel.textContent = '';
            }
        });
    }

    // Image Compressor
    const compressorInput = document.getElementById('image-compress-input');
    const compressorLabel = document.getElementById('compress-file-count-label');
    if (compressorInput && compressorLabel) {
        compressorInput.addEventListener('change', () => {
            if (compressorInput.files.length > 0) {
                compressorLabel.textContent = `${compressorInput.files[0].name} dipilih.`;
            } else {
                compressorLabel.textContent = '';
            }
        });
    }
}


function setupCustomDropdowns() {
    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        const select = wrapper.querySelector('select');
        if (!select) return;

        wrapper.querySelector('.select-trigger')?.remove();
        wrapper.querySelector('.select-options')?.remove();

        const trigger = document.createElement('div');
        trigger.className = 'select-trigger';
        
        const optionsList = document.createElement('ul');
        optionsList.className = 'select-options';

        [...select.options].forEach(option => {
            const listItem = document.createElement('li');
            listItem.textContent = option.textContent;
            listItem.dataset.value = option.value;
            if (option.selected) {
                trigger.textContent = option.textContent;
                listItem.classList.add('selected');
            }
            optionsList.appendChild(listItem);

            listItem.addEventListener('click', (e) => {
                e.stopPropagation();
                optionsList.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                listItem.classList.add('selected');
                
                trigger.textContent = listItem.textContent;
                select.value = listItem.dataset.value;
                wrapper.classList.remove('active');
                
                select.dispatchEvent(new Event('change'));
            });
        });

        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsList);

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper.active').forEach(openWrapper => {
                if (openWrapper !== wrapper) {
                    openWrapper.classList.remove('active');
                }
            });
            wrapper.classList.toggle('active');
        });
    });

    window.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper.active').forEach(wrapper => {
            wrapper.classList.remove('active');
        });
    });
}

function setupUrlShortenerPage() {
    attachShortenerListener();
    if (localStorage.getItem('jwt_refresh_token')) {
        const historySection = document.getElementById('history-section');
        if (historySection) {
            historySection.classList.remove('hidden');
            fetchUserLinkHistory();
        }
    }
}

function setupMediaConverterPage() {
    attachConverterListener();
    setupCustomFileInputs(); // Cukup panggil ini
    setupCustomDropdowns();
    
    const fileInput = document.getElementById('file-input');
    const outputFormatSelect = document.getElementById('output-format');

    const conversionOptions = {
        'default': [
            { value: 'pdf', text: 'PDF' },
            { value: 'docx', text: 'DOCX (Word Document)' },
        ],
        'pdf': [
            { value: 'docx', text: 'DOCX (Word - Kualitas Terbaik)' },
            { value: 'txt', text: 'TXT (Teks Polos)' },
            { value: 'jpg', text: 'JPG (Setiap halaman jadi gambar)' }
        ],
        'docx': [{ value: 'pdf', text: 'PDF' }, { value: 'txt', text: 'TXT' }],
        'pptx': [{ value: 'pdf', text: 'PDF' }],
        'jpg': [{ value: 'png', text: 'PNG' }, { value: 'pdf', text: 'PDF' }],
        'png': [{ value: 'jpg', text: 'JPG' }, { value: 'pdf', text: 'PDF' }]
    };

    if (fileInput && outputFormatSelect) {
        fileInput.addEventListener('change', () => {
            if (!fileInput.files || fileInput.files.length === 0) return;
            const fileName = fileInput.files[0].name.toLowerCase();
            const extension = fileName.split('.').pop();
            const options = conversionOptions[extension] || conversionOptions['default'];
            
            outputFormatSelect.innerHTML = '';
            options.forEach(opt => {
                const optionElement = document.createElement('option');
                optionElement.value = opt.value;
                optionElement.textContent = opt.text;
                outputFormatSelect.appendChild(optionElement);
            });
            
            // Re-initialize custom dropdown setelah opsi diubah
            setupCustomDropdowns();
        });
    }
}

function setupImageCompressorPage() {
    attachImageCompressorListener();
    setupCustomFileInputs(); // Cukup panggil ini
    setupCustomDropdowns();
}

function setupImagesToPdfPage() {
    attachImagesToPdfListener();
    setupCustomFileInputs();
    setupCustomDropdowns();
}

function attachImagesToPdfListener() {
    const form = document.getElementById('images-to-pdf-form');
    if (!form) return;

    const previewsContainer = document.getElementById('image-previews-container');
    const prevBtn = document.getElementById('prev-preview-btn');
    const nextBtn = document.getElementById('next-preview-btn');
    const sliderContainer = document.querySelector('.preview-slider-container');
    const fabButton = document.getElementById('toggle-pdf-options-btn');

    const imageInput = document.getElementById('images-to-pdf-input');
    const fileCountLabel = document.getElementById('file-count-label'); // [MODIFIKASI] Menggunakan ID baru
    const messageDiv = document.getElementById('images-to-pdf-message');
    const progressWrapper = document.getElementById('images-to-pdf-progress-wrapper');
    const submitButton = form.querySelector('button[type="submit"]');
    const pageSizeSelect = document.getElementById('page-size');

    let selectedFiles = [];
    let currentSlideIndex = 0;

    if (fabButton) {
        fabButton.classList.add('hidden');
    }

    const updateAllPreviewsLayout = () => {
        const orientation = form.querySelector('input[name="orientation"]:checked').value;
        const marginChoice = form.querySelector('input[name="margin"]:checked').value;
        document.querySelectorAll('.preview-page').forEach(page => {
            page.classList.remove('portrait', 'landscape', 'margin-small', 'margin-big');
            page.classList.add(orientation);
            if (marginChoice === 'small') page.classList.add('margin-small');
            else if (marginChoice === 'big') page.classList.add('margin-big');
        });
    };

    form.querySelectorAll('input[name="orientation"], input[name="margin"]').forEach(radio => radio.addEventListener('change', updateAllPreviewsLayout));
    if (pageSizeSelect) pageSizeSelect.addEventListener('change', updateAllPreviewsLayout);

    const updateNavButtons = () => {
        if (!prevBtn || !nextBtn) return;
        if (selectedFiles.length <= 2 || window.innerWidth <= 768) {
            prevBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
            return;
        }

        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
        prevBtn.disabled = currentSlideIndex === 0;
        nextBtn.disabled = currentSlideIndex >= selectedFiles.length - 2;
    };

    const goToSlide = (index) => {
        if (!previewsContainer.firstChild || !sliderContainer) return;

        const firstCard = previewsContainer.querySelector('.image-preview-card');
        if (!firstCard) return;

        const gapStyle = window.getComputedStyle(previewsContainer).getPropertyValue('gap');
        const gap = parseFloat(gapStyle) || 24;
        const slideWidth = firstCard.offsetWidth + gap;
        
        sliderContainer.scrollLeft = index * slideWidth;
        currentSlideIndex = index;
        updateNavButtons();
    };

    const updatePreviews = () => {
        previewsContainer.innerHTML = '';
        
        // [MODIFIKASI] Logika untuk menampilkan jumlah file di elemen <p>
        if (fileCountLabel) {
            if (selectedFiles.length > 0) {
                fileCountLabel.textContent = `${selectedFiles.length} gambar telah dipilih.`;
            } else {
                fileCountLabel.textContent = ''; // Kosongkan jika tidak ada file
            }
        }
        
        if (fabButton) {
            if (selectedFiles.length > 0) {
                fabButton.classList.remove('hidden');
            } else {
                fabButton.classList.add('hidden');
            }
        }
        
        if (selectedFiles.length === 0) {
            goToSlide(0);
            return;
        }

        const currentOrientation = form.querySelector('input[name="orientation"]:checked').value;
        const currentMargin = form.querySelector('input[name="margin"]:checked').value;
        let pageClasses = `preview-page ${currentOrientation}`;
        if (currentMargin === 'small') pageClasses += ' margin-small';
        else if (currentMargin === 'big') pageClasses += ' margin-big';

        let loadedImages = 0;
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewCard = document.createElement('div');
                previewCard.className = 'image-preview-card';
                previewCard.innerHTML = `
                    <div class="${pageClasses}">
                        <img src="${e.target.result}" alt="${file.name}">
                    </div>
                    <button type="button" class="remove-btn" data-index="${index}" title="Hapus gambar">&times;</button>
                `;
                previewsContainer.appendChild(previewCard);
                previewCard.querySelector('.remove-btn').addEventListener('click', (event) => {
                    const idxToRemove = parseInt(event.target.dataset.index, 10);
                    selectedFiles.splice(idxToRemove, 1);
                    updatePreviews();
                });
                
                loadedImages++;
                if (loadedImages === selectedFiles.length) {
                    goToSlide(0);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    imageInput.addEventListener('change', () => {
        selectedFiles.push(...Array.from(imageInput.files));
        imageInput.value = '';
        updatePreviews();
    });

    if(nextBtn) nextBtn.addEventListener('click', () => {
        if (currentSlideIndex < selectedFiles.length - 2) {
            goToSlide(currentSlideIndex + 1);
        }
    });

    if(prevBtn) prevBtn.addEventListener('click', () => {
        if (currentSlideIndex > 0) {
            goToSlide(currentSlideIndex - 1);
        }
    });

    form.addEventListener('submit', async (event) => {
        // ... Logika submit form (tidak ada perubahan di sini)
        event.preventDefault();
        if (selectedFiles.length === 0) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Silakan pilih setidaknya satu gambar.';
            return;
        }
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('images', file));
        formData.append('pageSize', pageSizeSelect.value);
        formData.append('orientation', form.querySelector('input[name="orientation"]:checked').value);
        formData.append('marginChoice', form.querySelector('input[name="margin"]:checked').value);
        submitButton.disabled = true;
        messageDiv.textContent = '';
        messageDiv.className = '';
        progressWrapper.classList.remove('hidden');
        const progressBarContainer = progressWrapper.querySelector('.progress-bar');
        const progressText = progressWrapper.querySelector('.progress-bar-text');
        progressBarContainer.classList.add('indeterminate');
        progressText.textContent = 'Mengonversi gambar ke PDF, harap tunggu...';
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/api/images-to-pdf`, true);
        xhr.responseType = 'blob';
        xhr.onload = function() {
            progressBarContainer.classList.remove('indeterminate');
            if (this.status === 200) {
                messageDiv.className = 'success';
                progressText.textContent = 'Konversi berhasil! Mengunduh file...';
                const header = this.getResponseHeader('Content-Disposition');
                let filename = 'converted.pdf';
                if(header) {
                    const parts = header.split(';');
                    parts.forEach(part => {
                        if (part.trim().startsWith('filename=')) {
                            filename = part.split('=')[1].replace(/"/g, '');
                        }
                    });
                }
                const url = window.URL.createObjectURL(this.response);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                selectedFiles = [];
                updatePreviews();
                form.reset();
                updateAllPreviewsLayout();
            } else {
                messageDiv.className = 'error';
                messageDiv.textContent = 'Error: Gagal membuat PDF.';
            }
            setTimeout(() => {
                progressWrapper.classList.add('hidden');
                messageDiv.textContent = '';
            }, 4000);
            submitButton.disabled = false;
        };
        xhr.onerror = function() {
            progressBarContainer.classList.remove('indeterminate');
            messageDiv.className = 'error';
            messageDiv.textContent = 'Error: Terjadi kesalahan jaringan.';
            progressWrapper.classList.add('hidden');
            submitButton.disabled = false;
        };
        xhr.send(formData);
    });
    
    const optionsPanel = form.querySelector('.pdf-tool-options');
    const backButton = document.getElementById('back-to-previews-btn');
    const overlay = form.querySelector('.pdf-options-overlay');
    
    const openOptions = () => form.classList.add('options-active');
    const closeOptions = () => form.classList.remove('options-active');

    if (fabButton) fabButton.addEventListener('click', openOptions);
    if (backButton) backButton.addEventListener('click', closeOptions);
    if (overlay) overlay.addEventListener('click', closeOptions);
}

function attachShortenerListener() {
    const form = document.getElementById('shortener-form');
    if (!form) return;
    
    const longUrlInput = document.getElementById('long-url');
    const customSlugInput = document.getElementById('custom-slug');
    const resultBox = document.getElementById('result');
    const resultText = document.getElementById('short-url-text');
    const copyButton = document.getElementById('copy-button');
    const copyIcon = document.getElementById('copy-icon');
    const checkIcon = document.getElementById('check-icon');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        resultBox.style.display = 'block';
        resultText.textContent = 'Memproses...';
        copyButton.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/api/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_url: longUrlInput.value, custom_slug: customSlugInput.value }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal mengambil data');

            resultBox.style.display = 'flex';
            copyButton.style.display = 'flex';
            resultText.textContent = data.short_url;
            longUrlInput.value = '';
            customSlugInput.value = '';

            if (localStorage.getItem('jwt_refresh_token')) {
                fetchUserLinkHistory();
            }

        } catch (error) {
            resultText.textContent = 'Gagal: ' + error.message;
            copyButton.style.display = 'none';
        }
    });

    if (copyButton) {
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(resultText.textContent).then(() => {
                copyIcon.style.display = 'none'; checkIcon.style.display = 'block';
                setTimeout(() => { copyIcon.style.display = 'block'; checkIcon.style.display = 'none'; }, 2000);
            });
        });
    }
}

function attachConverterListener() {
    const form = document.getElementById('converter-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const submitButton = form.querySelector('button');
        const messageDiv = document.getElementById('converter-message');
        const progressWrapper = document.getElementById('converter-progress-wrapper');
        const progressBarContainer = document.getElementById('converter-progress-wrapper').querySelector('.progress-bar');
        const progressText = progressWrapper.querySelector('.progress-bar-text');

        messageDiv.textContent = '';
        messageDiv.className = '';
        progressWrapper.classList.remove('hidden');
        submitButton.disabled = true;

        progressBarContainer.classList.add('indeterminate');
        progressText.textContent = 'Uploading file, please wait...';

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/api/convert`, true);
        xhr.responseType = 'blob';

        xhr.onload = function () {
            progressBarContainer.classList.remove('indeterminate');

            if (this.status === 200) {
                progressText.textContent = 'Konversi berhasil! File sedang diunduh.';
                const contentDisposition = xhr.getResponseHeader('content-disposition');
                let fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'converted-file';

                const blob = this.response;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none'; a.href = url; a.download = fileName;
                document.body.appendChild(a); a.click();
                window.URL.revokeObjectURL(url); a.remove();

                form.reset();
                const fileLabel = form.querySelector('.file-upload-label');
                if (fileLabel) fileLabel.textContent = 'Tidak ada file yang dipilih';

            } else {
                try {
                    const reader = new FileReader();
                    reader.onload = function() {
                       const errorResult = JSON.parse(this.result);
                       messageDiv.textContent = `Error: ${errorResult.error || 'Gagal memproses file.'}`;
                       messageDiv.className = 'error';
                    }
                    reader.readAsText(this.response);
                } catch (e) {
                     messageDiv.textContent = `Error: Terjadi kesalahan pada server (Status: ${this.status}).`;
                     messageDiv.className = 'error';
                }
            }

            setTimeout(() => progressWrapper.classList.add('hidden'), 3000);
            submitButton.disabled = false;
        };

        xhr.onerror = function () {
            progressBarContainer.classList.remove('indeterminate');
            messageDiv.textContent = 'Error: Terjadi kesalahan jaringan.';
            messageDiv.className = 'error';
            progressWrapper.classList.add('hidden');
            submitButton.disabled = false;
        };

        xhr.send(formData);
    });
}
function attachQrCodeGeneratorListener() {
    const form = document.getElementById('qr-generator-form');
    if (!form) return;
    
    const qrText = document.getElementById('qr-text');
    const qrErrorLevel = document.getElementById('qr-error-level');
    const qrColorDark = document.getElementById('qr-color-dark');
    const qrColorLight = document.getElementById('qr-color-light');
    const qrCodeMessage = document.getElementById('qr-code-message');
    const qrCodeImage = document.getElementById('qr-code-image');
    const downloadQrButton = document.getElementById('download-qr-button');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        qrCodeMessage.textContent = 'Generating QR Code...';
        qrCodeMessage.className = '';
        qrCodeImage.style.display = 'none';
        downloadQrButton.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/api/generate-qr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: qrText.value,
                    level: qrErrorLevel.value,
                    colorDark: qrColorDark.value,
                    colorLight: qrColorLight.value
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to generate QR Code.');

            qrCodeMessage.textContent = data.message;
            qrCodeMessage.className = 'success';
            qrCodeImage.src = data.qrCodeImage;
            qrCodeImage.style.display = 'block';
            downloadQrButton.style.display = 'block';

        } catch (error) {
            qrCodeMessage.textContent = `Error: ${error.message}`;
            qrCodeMessage.className = 'error';
        }
    });

    downloadQrButton.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = qrCodeImage.src;
        link.download = `qrcode_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}
function attachImageCompressorListener() {
    const form = document.getElementById('image-compressor-form');
    if (!form) return;
    
    const imageInput = document.getElementById('image-compress-input');
    const qualityInput = document.getElementById('compress-quality');
    const qualityValueSpan = document.getElementById('compress-quality-value');
    const formatSelect = document.getElementById('compress-format');
    const messageDiv = document.getElementById('image-compressor-message');
    const compressedImagePreview = document.getElementById('compressed-image-preview');
    const originalSizeSpan = document.getElementById('original-image-size');
    const compressedSizeSpan = document.getElementById('compressed-image-size');
    const downloadButton = document.getElementById('download-compressed-button');

    qualityInput.addEventListener('input', () => {
        qualityValueSpan.textContent = `${qualityInput.value}%`;
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageDiv.textContent = 'Compressing image, please wait...';
        messageDiv.className = '';
        compressedImagePreview.style.display = 'none';
        downloadButton.style.display = 'none';
        originalSizeSpan.textContent = 'N/A';
        compressedSizeSpan.textContent = 'N/A';

        const file = imageInput.files[0];
        if (!file) {
            messageDiv.textContent = 'Please select an image file.';
            messageDiv.className = 'error';
            return;
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('quality', qualityInput.value);
        formData.append('format', formatSelect.value);

        try {
            const response = await fetch(`${API_BASE_URL}/api/compress-image`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || 'Failed to compress image.');
            }

            const compressedBlob = await response.blob();
            const originalSize = response.headers.get('X-Original-Size');
            const compressedSize = response.headers.get('X-Compressed-Size');
            const outputFileName = `compressed-image.${formatSelect.value}`;

            originalSizeSpan.textContent = `${(originalSize / 1024).toFixed(2)} KB`;
            compressedSizeSpan.textContent = `${(compressedSize / 1024).toFixed(2)} KB`;

            const imageUrl = URL.createObjectURL(compressedBlob);
            compressedImagePreview.src = imageUrl;
            compressedImagePreview.style.display = 'block';

            downloadButton.onclick = () => {
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = outputFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
            downloadButton.style.display = 'block';
            messageDiv.textContent = 'Image compressed successfully!';
            messageDiv.className = 'success';

        } catch (error) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'error';
        }
    });
}
async function fetchUserLinkHistory() {
    const historyList = document.getElementById('link-history-list');
    const loadingMessage = document.getElementById('loading-history');
    if (!historyList || !loadingMessage) return;

    loadingMessage.textContent = 'Memuat riwayat...';
    loadingMessage.style.display = 'block';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/user/links`);
        if (!response.ok) throw new Error('Gagal mengambil riwayat.');
        const links = await response.json();
        historyList.innerHTML = '';
        if (links.length === 0) {
            loadingMessage.textContent = 'Anda belum memiliki riwayat tautan.';
            loadingMessage.style.display = 'block';
        } else {
            loadingMessage.style.display = 'none';
            links.forEach(link => renderUserLinkItem(link, historyList));
        }
    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
        loadingMessage.style.display = 'block';
    }
}
function renderUserLinkItem(link, container) {
    const shortUrl = `https://link.hamdirzl.my.id/${link.slug}`;
    const listItem = document.createElement('li');
    listItem.className = 'mood-item';
    listItem.id = `user-link-${link.slug}`;
    const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

    listItem.innerHTML = `
        <div class="mood-item-header">
            <strong>${shortUrl}</strong>
            <div class="mood-item-actions">
                <button class="mood-icon-button copy-history-btn" data-url="${shortUrl}" aria-label="Salin tautan">${copyIconSvg}</button>
                <button class="mood-icon-button delete-user-link-btn delete-button" data-slug="${link.slug}" aria-label="Hapus tautan">${trashIconSvg}</button>
            </div>
        </div>
        <p class="mood-notes">URL Asli: <a href="${link.original_url}" target="_blank">${link.original_url}</a></p>
        <small class="mood-date">Dibuat pada: ${new Date(link.created_at).toLocaleString('id-ID')}</small>
    `;
    container.appendChild(listItem);

    listItem.querySelector('.copy-history-btn').addEventListener('click', (e) => {
        navigator.clipboard.writeText(e.currentTarget.dataset.url).then(() => {
            const originalSvg = e.currentTarget.innerHTML;
            e.currentTarget.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f5a0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => { e.currentTarget.innerHTML = originalSvg; }, 2000);
        });
    });

    listItem.querySelector('.delete-user-link-btn').addEventListener('click', (e) => handleDeleteUserLink(e));
}
async function handleDeleteUserLink(event) {
    const button = event.currentTarget;
    const slugToDelete = button.dataset.slug;
    if (!confirm(`Anda yakin ingin menghapus tautan ${slugToDelete} dari riwayat Anda?`)) return;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/user/links/${slugToDelete}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal menghapus tautan dari riwayat.');

        alert(data.message);
        const listItemToRemove = document.getElementById(`user-link-${slugToDelete}`);
        if (listItemToRemove) listItemToRemove.remove();

        const historyList = document.getElementById('link-history-list');
        const loadingMessage = document.getElementById('loading-history');
        if (historyList && historyList.children.length === 0) {
            loadingMessage.textContent = 'Anda belum memiliki riwayat tautan.';
            loadingMessage.style.display = 'block';
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
        console.error('Error deleting user link:', error);
    }
}
function setupAuthPage() {
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const authMessage = document.getElementById('auth-message');
    const authTitle = document.getElementById('auth-title');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const googleRegisterBtn = document.getElementById('google-register-btn');

    const startGoogleAuth = () => {
        window.location.href = `${API_BASE_URL}/api/auth/google`;
    };

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', startGoogleAuth);
    }

    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', startGoogleAuth);
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
        authMessage.textContent = 'Error: Gagal login dengan Google. Silakan coba lagi.';
        authMessage.className = 'error';
    }

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginSection.classList.add('hidden');
            registerSection.classList.remove('hidden');
            if (authTitle) authTitle.textContent = 'Registrasi';
            authMessage.textContent = '';
            authMessage.className = '';
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            if (authTitle) authTitle.textContent = 'Login';
            authMessage.textContent = '';
            authMessage.className = '';
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            authMessage.textContent = 'Memproses...';
            try {
                const response = await fetch(`${API_BASE_URL}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                authMessage.textContent = 'Registrasi berhasil! Silakan login.';
                authMessage.className = 'success';
                if (showLoginLink) showLoginLink.click();
            } catch (error) {
                authMessage.textContent = `Error: ${error.message}`;
                authMessage.className = 'error';
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            authMessage.textContent = 'Memproses...';
            try {
                const response = await fetch(`${API_BASE_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                localStorage.setItem('jwt_refresh_token', data.refreshToken);
                sessionStorage.setItem('jwt_access_token', data.accessToken);

                authMessage.textContent = 'Login berhasil! Mengalihkan ke halaman utama...';
                authMessage.className = 'success';
                setTimeout(() => { window.location.href = 'index.html'; }, 1000);
            } catch (error) {
                authMessage.textContent = `Error: ${error.message}`;
                authMessage.className = 'error';
            }
        });
    }
}

const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        const messageDiv = document.getElementById('auth-message');
        const submitButton = forgotForm.querySelector('button');

        messageDiv.textContent = 'Memproses...';
        messageDiv.className = '';
        submitButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/api/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan');
            messageDiv.textContent = data.message;
            messageDiv.className = 'success';
            forgotForm.reset();
        } catch (error) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'error';
        } finally {
            submitButton.disabled = false;
        }
    });
}
const resetForm = document.getElementById('reset-form');
if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageDiv = document.getElementById('auth-message');
        const submitButton = resetForm.querySelector('button');
        const token = new URLSearchParams(window.location.search).get('token');
        const password = document.getElementById('reset-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!token) { messageDiv.textContent = 'Error: Token tidak ditemukan.'; messageDiv.className = 'error'; return; }
        if (password !== confirmPassword) { messageDiv.textContent = 'Error: Password dan konfirmasi password tidak cocok.'; messageDiv.className = 'error'; return; }

        messageDiv.textContent = 'Memproses...';
        messageDiv.className = '';
        submitButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/api/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            messageDiv.textContent = `${data.message} Anda akan diarahkan ke halaman login...`;
            messageDiv.className = 'success';
            setTimeout(() => { window.location.href = 'auth.html'; }, 3000);
        } catch (error) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'error';
            submitButton.disabled = false;
        }
    });
}
function setupAccountManagement() {
    const form = document.getElementById('change-password-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;
        const messageDiv = document.getElementById('change-password-message');
        const submitButton = form.querySelector('button');

        messageDiv.className = '';
        messageDiv.textContent = '';

        if (newPassword !== confirmNewPassword) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Error: Password baru dan konfirmasi tidak cocok.';
            return;
        }

        submitButton.disabled = true;
        messageDiv.textContent = 'Memproses...';

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/user/change-password`, {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            messageDiv.className = 'success';
            messageDiv.textContent = data.message;
            form.reset();

        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = `Error: ${error.message}`;
        } finally {
            submitButton.disabled = false;
        }
    });
}
function setupDashboardTabs() {
    const dashboardNav = document.querySelector('.dashboard-nav');
    if (!dashboardNav) return;

    const tabButtons = dashboardNav.querySelectorAll('.dashboard-tab-button');
    const contentPanels = document.querySelectorAll('.dashboard-panel');

    dashboardNav.addEventListener('click', (e) => {
        const clickedButton = e.target.closest('.dashboard-tab-button');
        if (!clickedButton) return;

        tabButtons.forEach(button => button.classList.remove('active'));
        contentPanels.forEach(panel => panel.classList.remove('active'));

        clickedButton.classList.add('active');

        const targetPanelId = clickedButton.dataset.target;
        const targetPanel = document.getElementById(targetPanelId);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    });
}
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const menuOverlay = document.getElementById('menu-overlay');

    const toggleMenu = () => {
        if (hamburger) hamburger.classList.toggle('active');
        if (navLinks) navLinks.classList.toggle('active');
        if (menuOverlay) menuOverlay.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        document.documentElement.classList.toggle('menu-open');
    };

    if (hamburger) hamburger.addEventListener('click', toggleMenu);
    if (menuOverlay) menuOverlay.addEventListener('click', toggleMenu);
}

function setupAllPasswordToggles() {
    const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    const setupPasswordToggle = (toggleId, passwordId) => {
        const toggleElement = document.getElementById(toggleId);
        const passwordElement = document.getElementById(passwordId);
        if (toggleElement && passwordElement) {
            toggleElement.addEventListener('click', () => {
                const isPassword = passwordElement.type === 'password';
                passwordElement.type = isPassword ? 'text' : 'password';
                toggleElement.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
            });
        }
    };

    setupPasswordToggle('toggle-login-password', 'login-password');
    setupPasswordToggle('toggle-register-password', 'register-password');
    setupPasswordToggle('toggle-reset-password', 'reset-password');
    setupPasswordToggle('toggle-confirm-password', 'confirm-password');
}

function setupAuthCallbackPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');
    const indexPath = window.location.href.includes('github.io') ? '/hrportof/' : '/';
    const authPath = window.location.href.includes('github.io') ? '/hrportof/auth.html?error=token-missing' : '/auth.html?error=token-missing';


    if (accessToken && refreshToken) {
        sessionStorage.setItem('jwt_access_token', accessToken);
        localStorage.setItem('jwt_refresh_token', refreshToken);
        window.location.href = indexPath;
    } else {
        window.location.href = authPath;
    }
}