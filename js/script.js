// ===================================================================
// ==   V8: REFACTORED & CLEANED SCRIPT                           ==
// ===================================================================
const API_BASE_URL = 'https://server-pribadi-hamdi-docker.onrender.com';
console.log(`Ekosistem Digital (Client V8) dimuat! Menghubungi API di: ${API_BASE_URL}`);

// === UTILITY FUNCTIONS ===

/**
 * Menampilkan pesan di elemen yang ditentukan dengan tipe (success/error).
 * @param {string} selector - CSS selector untuk elemen pesan.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {'success'|'error'|'info'} type - Tipe pesan.
 */
function displayMessage(selector, message, type = 'info') {
    const el = document.querySelector(selector);
    if (!el) return;
    el.textContent = message;
    el.className = 'message-box'; // Reset class
    if (type === 'success' || type === 'error') {
        el.classList.add(type);
    }
    el.classList.remove('hidden');
}

/**
 * Menyembunyikan elemen pesan.
 * @param {string} selector - CSS selector untuk elemen pesan.
 */
function hideMessage(selector) {
    const el = document.querySelector(selector);
    if (el) {
        el.classList.add('hidden');
        el.textContent = '';
    }
}

/**
 * Melakukan logout paksa dengan membersihkan token dan mengarahkan ke halaman login.
 */
function forceLogout() {
    localStorage.removeItem('jwt_refresh_token');
    sessionStorage.removeItem('jwt_access_token');
    if (!window.location.pathname.endsWith('auth.html')) {
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
        window.location.href = 'auth.html';
    }
}

/**
 * Wrapper untuk Fetch API yang menangani refresh token secara otomatis.
 * @param {string} url - URL endpoint API.
 * @param {object} options - Opsi untuk fetch.
 * @returns {Promise<Response>}
 */
async function fetchWithAuth(url, options = {}) {
    let accessToken = sessionStorage.getItem('jwt_access_token');
    
    options.headers = { ...options.headers };
    if (accessToken) {
        options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    if (!(options.body instanceof FormData)) {
        if (!options.headers['Content-Type']) {
            options.headers['Content-Type'] = 'application/json';
        }
    } else {
        delete options.headers['Content-Type'];
    }

    let response = await fetch(url, options);

    if (response.status === 401) { // Hanya refresh pada 401 Unauthorized
        console.log("Access Token kedaluwarsa, mencoba refresh...");
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
                console.log("Refresh berhasil, mengulangi permintaan...");
                options.headers['Authorization'] = `Bearer ${data.accessToken}`;
                response = await fetch(url, options); // Ulangi request
            } else {
                forceLogout();
            }
        } catch (error) {
            console.error("Error saat refresh token:", error);
            forceLogout();
        }
    }
    return response;
}

/**
 * Mendecode token JWT.
 * @param {string} token - Token JWT.
 * @returns {object|null}
 */
function decodeJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}


// === MAIN INITIALIZATION ===

document.addEventListener('DOMContentLoaded', () => {
    // Jalankan setup untuk semua halaman
    setupGlobalUI();
    
    // Jalankan setup spesifik per halaman
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) setupDashboardPage();
    else if (path.includes('tools.html')) setupToolsPage();
    else if (path.includes('auth.html')) setupAuthPage();
    else if (path.includes('forgot-password.html')) setupForgotPasswordPage();
    else if (path.includes('reset-password.html')) setupResetPasswordPage();
});


// === GLOBAL UI SETUP ===

function setupGlobalUI() {
    setupMobileMenu();
    setupAboutModal();
    setupChatBubble();
    setupCopyrightYear();
    updateLoginButtonState();
    setupPasswordToggles();
}

function updateLoginButtonState() {
    const loginLink = document.querySelector('a.login-button');
    if (loginLink) {
        if (localStorage.getItem('jwt_refresh_token')) {
            loginLink.textContent = 'Dasbor';
            loginLink.href = 'dashboard.html';
        } else {
            loginLink.textContent = 'Login';
            loginLink.href = 'auth.html';
        }
    }
}

function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (!hamburger || !navLinks) return;
    
    const toggleMenu = (open) => {
        const isActive = typeof open === 'boolean' ? open : !hamburger.classList.contains('active');
        hamburger.classList.toggle('active', isActive);
        navLinks.classList.toggle('active', isActive);
        document.body.classList.toggle('menu-open', isActive);
    };

    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    navLinks.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
            toggleMenu(false);
        }
    });
}

function setupAboutModal() {
    const aboutButtons = document.querySelectorAll('#about-button');
    const modalOverlay = document.getElementById('about-modal');
    if (!modalOverlay || aboutButtons.length === 0) return;
    
    const modalCloseButton = modalOverlay.querySelector('.modal-close');
    const toggleModal = (show) => modalOverlay.classList.toggle('active', show);

    aboutButtons.forEach(button => button.addEventListener('click', () => toggleModal(true)));
    modalCloseButton?.addEventListener('click', () => toggleModal(false));
    modalOverlay.addEventListener('click', e => (e.target === modalOverlay) && toggleModal(false));
    document.addEventListener('keydown', e => (e.key === 'Escape') && toggleModal(false));
}

function setupCopyrightYear() {
    const yearSpan = document.getElementById('copyright-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

function setupPasswordToggles() {
    const eyeIconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeOffIconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    document.querySelectorAll('.toggle-password').forEach(toggle => {
        const passwordInput = toggle.parentElement.querySelector('input[type="password"], input[type="text"]');
        if (!passwordInput) return;
        
        toggle.innerHTML = eyeIconHtml; // Set default icon
        toggle.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            toggle.innerHTML = isPassword ? eyeOffIconHtml : eyeIconHtml;
        });
    });
}

function setupChatBubble() {
    const chatBubble = document.getElementById('chat-bubble');
    const openChatButton = document.getElementById('open-chat-button');
    const closeChatButton = document.getElementById('close-chat');
    const chatForm = document.getElementById('chat-form');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input-text');

    if (!chatBubble || !openChatButton) return;

    const toggleChat = (show) => {
        chatBubble.classList.toggle('hidden', !show);
        openChatButton.classList.toggle('hidden', show);
        if (show) chatMessages.scrollTop = chatMessages.scrollHeight;
    };
    
    openChatButton.addEventListener('click', () => toggleChat(true));
    closeChatButton?.addEventListener('click', () => toggleChat(false));

    const appendMessage = (text, type, id = null) => {
        const el = document.createElement('div');
        el.className = `message ${type}`;
        el.textContent = text;
        if (id) el.id = id;
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const sendMessage = async () => {
        const userMessage = chatInput.value.trim();
        if (userMessage === '') return;

        appendMessage(userMessage, 'user-message');
        chatInput.value = '';
        appendMessage('Mengetik...', 'ai-message', 'typing-indicator');

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/chat-with-ai`, {
                method: 'POST',
                body: JSON.stringify({ message: userMessage })
            });
            
            const typingIndicator = document.getElementById('typing-indicator');
            typingIndicator?.remove();
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Gagal terhubung ke AI.");
            
            appendMessage(data.reply || "Maaf, saya tidak mengerti.", 'ai-message');
        } catch (error) {
            const typingIndicator = document.getElementById('typing-indicator');
            typingIndicator?.remove();
            appendMessage(`Error: ${error.message}`, 'ai-message');
        }
    };

    chatForm?.addEventListener('submit', sendMessage);
}

// === PAGE-SPECIFIC SETUP ===

function setupAuthPage() {
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const authTitle = document.getElementById('auth-title');

    const toggleForms = (showRegister) => {
        loginSection.classList.toggle('hidden', showRegister);
        registerSection.classList.toggle('hidden', !showRegister);
        authTitle.textContent = showRegister ? 'Registrasi' : 'Login';
        hideMessage('#auth-message');
    };

    document.getElementById('show-register')?.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });
    document.getElementById('show-login')?.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const password = form.querySelector('#register-password').value;
        if (password.length < 6) {
             displayMessage('#auth-message', 'Error: Password minimal harus 6 karakter.', 'error');
             return;
        }

        displayMessage('#auth-message', 'Memproses...', 'info');
        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form)))
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            displayMessage('#auth-message', 'Registrasi berhasil! Silakan login.', 'success');
            toggleForms(false);
            form.reset();
        } catch (error) {
            displayMessage('#auth-message', `Error: ${error.message}`, 'error');
        }
    });

    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        displayMessage('#auth-message', 'Memproses...', 'info');
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form)))
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            
            localStorage.setItem('jwt_refresh_token', data.refreshToken);
            sessionStorage.setItem('jwt_access_token', data.accessToken);
            
            displayMessage('#auth-message', 'Login berhasil! Mengalihkan...', 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } catch (error) {
            displayMessage('#auth-message', `Error: ${error.message}`, 'error');
        }
    });
}

function setupForgotPasswordPage() {
    const form = document.getElementById('forgot-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        displayMessage('#auth-message', 'Mengirim permintaan...', 'info');
        try {
            const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form)))
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            displayMessage('#auth-message', data.message, 'success');
        } catch (error) {
            displayMessage('#auth-message', `Error: ${error.message}`, 'error');
        }
    });
}

function setupResetPasswordPage() {
    const form = document.getElementById('reset-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = form.querySelector('#reset-password').value;
        const confirmPassword = form.querySelector('#confirm-password').value;
        const token = new URLSearchParams(window.location.search).get('token');

        if (password !== confirmPassword) {
            displayMessage('#auth-message', 'Error: Password tidak cocok.', 'error');
            return;
        }
        if (password.length < 6) {
            displayMessage('#auth-message', 'Error: Password minimal 6 karakter.', 'error');
            return;
        }

        displayMessage('#auth-message', 'Menyimpan password baru...', 'info');
        try {
             const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            displayMessage('#auth-message', `${data.message} Mengalihkan ke login...`, 'success');
            setTimeout(() => window.location.href = 'auth.html', 2000);
        } catch(error) {
            displayMessage('#auth-message', `Error: ${error.message}`, 'error');
        }
    });
}

function setupDashboardPage() {
    if (!localStorage.getItem('jwt_refresh_token')) {
        window.location.href = 'auth.html';
        return;
    }

    document.getElementById('logout-button')?.addEventListener('click', async () => {
        try {
            await fetchWithAuth(`${API_BASE_URL}/api/logout`, { method: 'POST' });
        } catch (e) {
            console.error("Gagal logout di server, tetap lanjut.", e);
        } finally {
            forceLogout();
            window.location.href = 'index.html';
        }
    });
    
    const token = sessionStorage.getItem('jwt_access_token');
    if (!token) {
        // Coba refresh token jika access token tidak ada di session
        fetchWithAuth(`${API_BASE_URL}/api/user/links`) // Panggil endpoint dummy untuk trigger refresh
            .then(() => populateDashboard(sessionStorage.getItem('jwt_access_token')))
            .catch(forceLogout);
    } else {
        populateDashboard(token);
    }
}

function populateDashboard(token) {
    const decoded = decodeJwt(token);
    if (!decoded) return forceLogout();

    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl) userEmailEl.textContent = decoded.email;

    if (decoded.role === 'admin') {
        userEmailEl.innerHTML += ' (Admin)';
        document.getElementById('admin-section')?.classList.remove('hidden');
        document.getElementById('admin-users-section')?.classList.remove('hidden');
        // fetchAndDisplayAllLinks();
        // fetchAndDisplayUsers();
    }
}

function setupToolsPage() {
    if (!localStorage.getItem('jwt_refresh_token')) {
        document.getElementById('login-prompt')?.classList.remove('hidden');
        document.querySelector('.tool-selection')?.classList.add('hidden');
        return;
    }

    const toolButtons = document.querySelectorAll('.tool-selector-button');
    const toolWrappers = document.querySelectorAll('.tool-section[id$="-wrapper"], .history-section');

    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.id.replace('show-', '') + '-wrapper';
            
            toolWrappers.forEach(wrapper => {
                wrapper.classList.toggle('hidden', wrapper.id !== targetId);
            });
            
            const historySection = document.getElementById('history-section');
            if (historySection) {
                 historySection.classList.toggle('hidden', targetId !== 'shortener-wrapper');
                 if(targetId === 'shortener-wrapper') {
                    // fetchUserLinkHistory();
                 }
            }

            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Event listeners untuk setiap form tool...
    document.getElementById('shortener-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        // ... Logika fetchWithAuth ke /api/shorten
    });
}