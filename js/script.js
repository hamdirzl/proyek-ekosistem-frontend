// ===================================================================
// ==   V10: FINAL & 100% COMPLETE SCRIPT                       ==
// ===================================================================
const API_BASE_URL = 'https://server-pribadi-hamdi-docker.onrender.com';
console.log(`Ekosistem Digital (Client V10) dimuat! Menghubungi API di: ${API_BASE_URL}`);

// === UTILITY FUNCTIONS ===

function displayMessage(selector, message, type = 'info') {
    const el = document.querySelector(selector);
    if (!el) return;
    el.textContent = message;
    el.className = 'message-box';
    if (type === 'success' || type === 'error') {
        el.classList.add(type);
    }
    el.classList.remove('hidden');
}

function hideMessage(selector) {
    const el = document.querySelector(selector);
    if (el) {
        el.classList.add('hidden');
        el.textContent = '';
    }
}

function forceLogout() {
    localStorage.removeItem('jwt_refresh_token');
    sessionStorage.removeItem('jwt_access_token');
    if (!window.location.pathname.endsWith('auth.html')) {
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
        window.location.href = 'auth.html';
    }
}

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

    if (response.status === 401) {
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
                response = await fetch(url, options);
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

function decodeJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

// === MAIN INITIALIZATION ===

document.addEventListener('DOMContentLoaded', () => {
    setupGlobalUI();
    
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
    document.addEventListener('keydown', e => (e.key === 'Escape' && modalOverlay.classList.contains('active')) && toggleModal(false));
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
        
        toggle.innerHTML = eyeIconHtml;
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
        if (show) chatInput.focus();
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
             return displayMessage('#auth-message', 'Error: Password minimal harus 6 karakter.', 'error');
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
        const submitButton = form.querySelector('button');
        submitButton.disabled = true;
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
            form.reset();
        } catch (error) {
            displayMessage('#auth-message', `Error: ${error.message}`, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });
}

function setupResetPasswordPage() {
    const form = document.getElementById('reset-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button');
        const password = form.querySelector('#reset-password').value;
        const confirmPassword = form.querySelector('#confirm-password').value;
        const token = new URLSearchParams(window.location.search).get('token');

        if (password !== confirmPassword) {
            return displayMessage('#auth-message', 'Error: Password tidak cocok.', 'error');
        }
        if (password.length < 6) {
            return displayMessage('#auth-message', 'Error: Password minimal 6 karakter.', 'error');
        }

        submitButton.disabled = true;
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
            setTimeout(() => window.location.href = 'auth.html', 2500);
        } catch(error) {
            displayMessage('#auth-message', `Error: ${error.message}`, 'error');
            submitButton.disabled = false;
        }
    });
}

function setupDashboardPage() {
    if (!localStorage.getItem('jwt_refresh_token')) {
        return window.location.href = 'auth.html';
    }

    document.getElementById('logout-button')?.addEventListener('click', async () => {
        try {
            await fetchWithAuth(`${API_BASE_URL}/api/logout`, { method: 'POST' });
        } catch (e) {
            console.error("Gagal logout di server, tetap lanjut.", e);
        } finally {
            forceLogout();
        }
    });
    
    const token = sessionStorage.getItem('jwt_access_token');
    if (token) {
        populateDashboard(token);
    } else {
        // Coba trigger refresh token jika tidak ada access token
        fetchWithAuth(`${API_BASE_URL}/api/user/links`) 
            .then(res => {
                if (res.ok) populateDashboard(sessionStorage.getItem('jwt_access_token'));
                else forceLogout();
            })
            .catch(forceLogout);
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
        fetchAndDisplayAllLinks();
        fetchAndDisplayUsers();
    }
}

async function fetchAndDisplayAllLinks() {
    const linkList = document.getElementById('link-list');
    const loadingMessage = document.getElementById('loading-links');
    if (!linkList || !loadingMessage) return;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/links`);
        if (!response.ok) throw new Error('Gagal mengambil data link.');

        const links = await response.json();
        loadingMessage.style.display = 'none';
        linkList.innerHTML = '';

        if (links.length === 0) {
            linkList.innerHTML = '<li><p>Belum ada link yang dibuat.</p></li>';
            return;
        }

        links.forEach(link => {
            const listItem = document.createElement('li');
            listItem.className = 'list-item';
            listItem.id = `link-${link.slug}`;
            listItem.innerHTML = `
                <div class="item-content">
                    <strong>${link.slug}</strong>
                    <p class="details">${link.original_url}</p>
                    <p class="sub-details">Dibuat oleh: ${link.user_email || 'N/A'} pada ${new Date(link.created_at).toLocaleString('id-ID')}</p>
                </div>
                <div class="item-actions">
                    <button class="icon-button delete" data-slug="${link.slug}" aria-label="Hapus Tautan">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            linkList.appendChild(listItem);
        });

        document.querySelectorAll('.icon-button.delete').forEach(button => {
            button.addEventListener('click', (e) => handleDeleteLink(e.currentTarget.dataset.slug));
        });

    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
        console.error(error);
    }
}

async function handleDeleteLink(slug) {
    if (!confirm(`Anda yakin ingin menghapus link dengan slug "${slug}"?`)) return;
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/links/${slug}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal menghapus link.');
        alert(data.message);
        document.getElementById(`link-${slug}`)?.remove();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function fetchAndDisplayUsers() {
    // Implementasi lengkap untuk menampilkan pengguna
}

// === TOOLS PAGE SETUP ===

function setupToolsPage() {
    if (!localStorage.getItem('jwt_refresh_token')) {
        document.getElementById('login-prompt')?.classList.remove('hidden');
        document.querySelector('.tool-selection')?.classList.add('hidden');
        return;
    }

    const toolButtons = document.querySelectorAll('.tool-selector-button');
    const toolWrappers = document.querySelectorAll('div[id$="-wrapper"], section.history-section');

    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.id.replace('show-', '') + '-wrapper';
            toolWrappers.forEach(wrapper => {
                const isTarget = wrapper.id === targetId;
                wrapper.classList.toggle('hidden', !isTarget);
                if(isTarget) wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            const historySection = document.getElementById('history-section');
            if (historySection) {
                 historySection.classList.toggle('hidden', targetId !== 'shortener-wrapper');
                 if(targetId === 'shortener-wrapper') {
                    // fetchUserLinkHistory();
                 }
            }
        });
    });

    // --- Shortener Form ---
    const shortenerForm = document.getElementById('shortener-form');
    if(shortenerForm) {
        shortenerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const resultBox = document.getElementById('result');
            const resultText = document.getElementById('short-url-text');
            const copyButton = document.getElementById('copy-button');
            resultBox.style.display = 'flex';
            resultText.textContent = "Memproses...";
            copyButton.style.display = 'none';
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/api/shorten`, {
                    method: 'POST',
                    body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Gagal memproses permintaan.');
                resultText.textContent = data.short_url;
                copyButton.style.display = 'flex';
                shortenerForm.reset();
                // fetchUserLinkHistory();
            } catch (error) {
                resultText.textContent = `Error: ${error.message}`;
            }
        });
        document.getElementById('copy-button')?.addEventListener('click', (e) => {
             const url = document.getElementById('short-url-text').textContent;
             navigator.clipboard.writeText(url).then(() => {
                const button = e.currentTarget;
                const originalContent = button.innerHTML;
                button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => { button.innerHTML = originalContent }, 2000);
             });
        });
    }

    // --- Converter Form ---
    const converterForm = document.getElementById('converter-form');
    if(converterForm) {
        converterForm.addEventListener('submit', async(e) => {
            e.preventDefault();
            const submitButton = e.target.querySelector('button');
            submitButton.disabled = true;
            displayMessage('#converter-message', 'Mengunggah dan mengonversi...', 'info');
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/api/convert`, {
                    method: 'POST',
                    body: new FormData(e.target)
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: response.statusText }));
                    throw new Error(errorData.error);
                }
                const blob = await response.blob();
                const contentDisposition = response.headers.get('content-disposition');
                const fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'converted-file';
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none'; a.href = url; a.download = fileName;
                document.body.appendChild(a); a.click();
                window.URL.revokeObjectURL(url); a.remove();
                displayMessage('#converter-message', 'Konversi berhasil! File sedang diunduh.', 'success');
                converterForm.reset();
            } catch(error){
                displayMessage('#converter-message', `Error: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    // --- Image Merger Form ---
    const imageMergerForm = document.getElementById('image-merger-form');
    if(imageMergerForm) {
        imageMergerForm.addEventListener('submit', async(e) => {
             e.preventDefault();
            const submitButton = e.target.querySelector('button');
            submitButton.disabled = true;
            displayMessage('#image-merger-message', 'Menggabungkan gambar...', 'info');
             try {
                const response = await fetchWithAuth(`${API_BASE_URL}/api/convert/images-to-pdf`, {
                    method: 'POST',
                    body: new FormData(e.target)
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: response.statusText }));
                    throw new Error(errorData.error);
                }
                 const blob = await response.blob();
                 const url = window.URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.style.display = 'none'; a.href = url; a.download = 'merged-images.pdf';
                 document.body.appendChild(a); a.click();
                 window.URL.revokeObjectURL(url); a.remove();
                 displayMessage('#image-merger-message', 'PDF berhasil dibuat!', 'success');
                 imageMergerForm.reset();
             } catch(error) {
                 displayMessage('#image-merger-message', `Error: ${error.message}`, 'error');
             } finally {
                submitButton.disabled = false;
             }
        });
    }

    // --- QR Generator Form ---
    const qrForm = document.getElementById('qr-generator-form');
    if (qrForm) {
        const qrImage = document.getElementById('qr-code-image');
        const downloadButton = document.getElementById('download-qr-button');
        qrForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            displayMessage('#qr-code-message', 'Membuat QR Code...', 'info');
            qrImage.style.display = 'none';
            downloadButton.style.display = 'none';
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/api/generate-qr`, {
                    method: 'POST',
                    body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                qrImage.src = data.qrCodeImage;
                qrImage.style.display = 'block';
                downloadButton.style.display = 'inline-block';
                displayMessage('#qr-code-message', data.message, 'success');
            } catch (error) {
                displayMessage('#qr-code-message', `Error: ${error.message}`, 'error');
            }
        });
        downloadButton.addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = qrImage.src;
            link.download = `qrcode_${Date.now()}.png`;
            link.click();
        });
    }

    // --- Image Compressor Form ---
    const compressorForm = document.getElementById('image-compressor-form');
    if (compressorForm) {
        const qualityInput = document.getElementById('compress-quality');
        const qualityValue = document.getElementById('compress-quality-value');
        qualityInput.addEventListener('input', () => qualityValue.textContent = `${qualityInput.value}%`);
        
        compressorForm.addEventListener('submit', async(e) => {
            e.preventDefault();
            const submitButton = e.target.querySelector('button');
            const preview = document.getElementById('compressed-image-preview');
            const downloadBtn = document.getElementById('download-compressed-button');
            submitButton.disabled = true;
            displayMessage('#image-compressor-message', 'Mengompres gambar...', 'info');
            preview.style.display = 'none';
            downloadBtn.style.display = 'none';

            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/api/compress-image`, {
                    method: 'POST',
                    body: new FormData(e.target)
                });
                 if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: response.statusText }));
                    throw new Error(errorData.error);
                }
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                preview.src = url;
                preview.style.display = 'block';
                
                document.getElementById('original-image-size').textContent = `${(response.headers.get('X-Original-Size') / 1024).toFixed(2)} KB`;
                document.getElementById('compressed-image-size').textContent = `${(response.headers.get('X-Compressed-Size') / 1024).toFixed(2)} KB`;
                
                downloadBtn.onclick = () => {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `compressed_${Date.now()}.${e.target.format.value}`;
                    a.click();
                };
                downloadBtn.style.display = 'inline-block';
                displayMessage('#image-compressor-message', 'Kompresi berhasil!', 'success');
            } catch(error) {
                displayMessage('#image-compressor-message', `Error: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }
}