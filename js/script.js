// ===================================================================
// ==   FILE FINAL SCRIPT.JS (dengan Fitur Admin)                 ==
// ===================================================================
const API_BASE_URL = 'https://server-pribadi-hamdi.onrender.com';

console.log(`Ekosistem Digital (Client v12) dimuat! Menghubungi API di: ${API_BASE_URL}`);

/* === FUNGSI GLOBAL UNTUK CEK STATUS LOGIN === */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    const loginLink = document.querySelector('a.login-button'); 
    const logoutButton = document.getElementById('logout-button'); 

    if (token) {
        if(loginLink) {
            loginLink.textContent = 'Dasbor';
            loginLink.href = 'dashboard.html';
        }
    } else {
        if (document.body.contains(document.getElementById('dashboard-main'))) {
            window.location.href = 'auth.html';
        }
    }

    if(logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            window.location.href = 'index.html';
        });
    }
});

// ===================================
// === FUNGSI UNTUK URL SHORTENER ===
// ===================================
const shortenerForm = document.getElementById('shortener-form');
if (shortenerForm) {
    const longUrlInput = document.getElementById('long-url');
    const customSlugInput = document.getElementById('custom-slug');
    const resultBox = document.getElementById('result');

    shortenerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const originalUrl = longUrlInput.value;
        const customSlug = customSlugInput.value;
        resultBox.textContent = 'Memproses...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    original_url: originalUrl,
                    custom_slug: customSlug
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal mengambil data');
            resultBox.textContent = `Link pendek Anda: ${data.short_url}`;
            longUrlInput.value = '';
            customSlugInput.value = '';
        } catch (error) {
            console.error('Terjadi Error:', error);
            resultBox.textContent = 'Gagal: ' + error.message;
        }
    });
}

// ==========================================================
// ===         LOGIKA UNTUK HALAMAN AUTENTIKASI           ===
// ==========================================================
if (document.getElementById('login-form')) {
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const authMessage = document.getElementById('auth-message');
    const authTitle = document.getElementById('auth-title');

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginSection.classList.add('hidden');
            registerSection.classList.remove('hidden');
            if(authTitle) authTitle.textContent = 'Registrasi';
            authMessage.textContent = '';
            authMessage.className = '';
        });
    }
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            if(authTitle) authTitle.textContent = 'Login';
            authMessage.textContent = '';
            authMessage.className = '';
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
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
            try {
                const response = await fetch(`${API_BASE_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                localStorage.setItem('jwt_token', data.token);
                authMessage.textContent = 'Login berhasil! Mengalihkan ke dashboard...';
                authMessage.className = 'success';
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
            } catch (error) {
                authMessage.textContent = `Error: ${error.message}`;
                authMessage.className = 'error';
            }
        });
    }
}


// =================================================================
// ===         LOGIKA UNTUK HALAMAN DASHBOARD (MOOD)           ===
// =================================================================
if (document.getElementById('dashboard-main')) {
    // Kode untuk Mood tracker, bisa ditambahkan di sini
}

// ==========================================================
// ===         LOGIKA UNTUK MENU DROPDOWN MOBILE          ===
// ==========================================================
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });
}

// ==========================================================
// ===         LOGIKA UNTUK MODAL TENTANG SAYA            ===
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    const aboutButtons = document.querySelectorAll('#about-button');
    const modalOverlay = document.getElementById('about-modal');
    const modalCloseButton = document.querySelector('.modal-close');

    const openModal = () => { if (modalOverlay) modalOverlay.classList.remove('hidden'); };
    const closeModal = () => { if (modalOverlay) modalOverlay.classList.add('hidden'); };

    aboutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!modalOverlay) window.location.href = 'index.html#open-about';
            else { e.preventDefault(); openModal(); }
        });
    });

    if (window.location.hash === '#open-about') {
        openModal();
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    
    if (modalOverlay) {
        modalCloseButton.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (event) => { if (event.target === modalOverlay) closeModal(); });
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal(); });
    }
});


// ==========================================================
// ===         LOGIKA BARU UNTUK LUPA PASSWORD           ===
// ==========================================================
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
            if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan');
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

// ==========================================================
// ===         LOGIKA BARU UNTUK PANEL ADMIN              ===
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('dashboard-main')) {
        checkUserRoleAndSetupAdminPanel();
    }
});

function decodeJwt(token) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
}

async function checkUserRoleAndSetupAdminPanel() {
    const token = localStorage.getItem('jwt_token');
    if (!token) return;

    const decodedToken = decodeJwt(token);
    
    if (decodedToken && decodedToken.role === 'admin') {
        const adminSection = document.getElementById('admin-section');
        const userEmailElement = document.getElementById('user-email');
        if (adminSection) {
            adminSection.classList.remove('hidden');
            if(userEmailElement) userEmailElement.innerHTML += ' (Admin)';
            fetchAndDisplayLinks(token);
        }
    }
}

async function fetchAndDisplayLinks(token) {
    const linkList = document.getElementById('link-list');
    const loadingMessage = document.getElementById('loading-links');

    try {
        const response = await fetch(`${API_BASE_URL}/api/links`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Gagal mengambil data link. Pastikan Anda adalah admin.');
        
        const links = await response.json();
        loadingMessage.style.display = 'none';
        linkList.innerHTML = '';

        if (links.length === 0) {
            linkList.innerHTML = '<li><p>Belum ada link yang dibuat.</p></li>';
            return;
        }

        links.forEach(link => {
            const listItem = document.createElement('li');
            listItem.className = 'mood-item';
            listItem.id = `link-${link.slug}`;
            listItem.innerHTML = `
                <div class="mood-item-header">
                    <span><strong>Slug:</strong> ${link.slug}</span>
                    <button class="button-pintu delete-link-btn" data-slug="${link.slug}" style="background-color: #ff4d4d; border-color: #ff4d4d; padding: 5px 10px; font-size: 0.9em;">Hapus</button>
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
        console.error(error);
    }
}

async function handleDeleteLink(event) {
    const slugToDelete = event.target.dataset.slug;
    const token = localStorage.getItem('jwt_token');

    if (!confirm(`Anda yakin ingin menghapus link dengan slug "${slugToDelete}"?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/links/${slugToDelete}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal menghapus link.');

        alert(data.message);
        const listItemToRemove = document.getElementById(`link-${slugToDelete}`);
        if (listItemToRemove) listItemToRemove.remove();

    } catch (error) {
        alert(`Error: ${error.message}`);
        console.error(error);
    }
}