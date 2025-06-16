// ===================================================================
// ==   FILE FINAL SCRIPT.JS (V4 - Robust & Stable)               ==
// ===================================================================
const API_BASE_URL = 'https://server-pribadi-hamdi.onrender.com';

/* === FUNGSI GLOBAL YANG BERJALAN SAAT HALAMAN LOAD === */
document.addEventListener('DOMContentLoaded', () => {
    // --- Logika Umum untuk Semua Halaman ---
    handleAuthStatus();
    setupNavbar();
    setupHamburgerMenu();
    setupAboutModal();

    // --- Logika Spesifik per Halaman ---
    if (document.getElementById('shortener-form')) {
        setupUrlShortener();
    }
    if (document.querySelector('.auth-container')) {
        setupAuthForms();
    }
    if (document.body.classList.contains('dashboard-page')) {
        setupDashboard();
    }
});

/* === KUMPULAN FUNGSI SETUP === */

function handleAuthStatus() {
    const token = localStorage.getItem('jwt_token');
    const loginLink = document.querySelector('a.login-button');
    const logoutButton = document.getElementById('logout-button');

    if (token && loginLink) {
        loginLink.textContent = 'Dasbor';
        loginLink.href = 'dashboard.html';
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            window.location.href = 'index.html';
        });
    }

    // Redirect jika tidak ada token di halaman yang butuh login
    if (!token && document.body.classList.contains('dashboard-page')) {
        window.location.href = 'auth.html';
    }
}

function setupNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    };
    handleScroll(); // Cek saat load
    document.addEventListener('scroll', handleScroll);
}

function setupHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
}

function setupAboutModal() {
    const aboutButtons = document.querySelectorAll('#about-button');
    const modalOverlay = document.getElementById('about-modal');
    if (!modalOverlay) return;
    
    const modalCloseButton = modalOverlay.querySelector('.modal-close');
    const openModal = () => modalOverlay.classList.remove('hidden');
    const closeModal = () => modalOverlay.classList.add('hidden');
    
    aboutButtons.forEach(button => button.addEventListener('click', (e) => { e.preventDefault(); openModal(); }));
    
    if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (event) => { if (event.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal(); });
}

function setupUrlShortener() {
    const shortenerForm = document.getElementById('shortener-form');
    shortenerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const longUrlInput = document.getElementById('long-url');
        const resultBox = document.getElementById('result');
        resultBox.textContent = 'Memproses...';
        try {
            const response = await fetch(`${API_BASE_URL}/api/shorten`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ original_url: longUrlInput.value }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal');
            resultBox.textContent = `Link pendek: ${data.short_url}`;
            longUrlInput.value = '';
        } catch (error) {
            resultBox.textContent = `Error: ${error.message}`;
        }
    });
}

function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-form');
    const resetForm = document.getElementById('reset-form');

    // Toggle Login/Register
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    if (showRegisterLink && showLoginLink) {
        const loginSection = document.getElementById('login-section');
        const registerSection = document.getElementById('register-section');
        const authTitle = document.getElementById('auth-title');
        showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginSection.classList.add('hidden'); registerSection.classList.remove('hidden'); if (authTitle) authTitle.textContent = 'Registrasi'; });
        showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registerSection.classList.add('hidden'); loginSection.classList.remove('hidden'); if (authTitle) authTitle.textContent = 'Login'; });
    }

    // Form Handlers
    if (loginForm) handleLoginForm(loginForm);
    if (registerForm) handleRegisterForm(registerForm);
    if (forgotForm) handleForgotForm(forgotForm);
    if (resetForm) handleResetForm(resetForm);
}

function handleLoginForm(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.elements['login-email'].value;
        const password = form.elements['login-password'].value;
        const messageDiv = document.getElementById('auth-message');
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            localStorage.setItem('jwt_token', data.token);
            messageDiv.textContent = 'Login berhasil! Mengalihkan...';
            messageDiv.className = 'success';
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } catch (error) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'error';
        }
    });
}

function handleRegisterForm(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.elements['register-email'].value;
        const password = form.elements['register-password'].value;
        const messageDiv = document.getElementById('auth-message');
        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            messageDiv.textContent = 'Registrasi berhasil! Silakan login.';
            messageDiv.className = 'success';
            document.getElementById('show-login').click();
        } catch (error) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'error';
        }
    });
}

function handleForgotForm(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.elements['forgot-email'].value;
        const messageDiv = document.getElementById('auth-message');
        const submitButton = form.querySelector('button');
        messageDiv.textContent = 'Memproses...';
        messageDiv.className = '';
        submitButton.disabled = true;
        try {
            const response = await fetch(`${API_BASE_URL}/api/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan');
            messageDiv.textContent = data.message;
            messageDiv.className = 'success';
            form.reset();
        } catch (error) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'error';
        } finally {
            submitButton.disabled = false;
        }
    });
}

function handleResetForm(form) {
     form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageDiv = document.getElementById('auth-message');
        const submitButton = form.querySelector('button');
        const token = new URLSearchParams(window.location.search).get('token');
        const password = form.elements['reset-password'].value;
        const confirmPassword = form.elements['confirm-password'].value;

        if (!token) { messageDiv.textContent = 'Error: Token tidak ditemukan.'; messageDiv.className = 'error'; return; }
        if (password !== confirmPassword) { messageDiv.textContent = 'Error: Password tidak cocok.'; messageDiv.className = 'error'; return; }

        messageDiv.textContent = 'Memproses...';
        messageDiv.className = '';
        submitButton.disabled = true;
        try {
            const response = await fetch(`${API_BASE_URL}/api/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan');
            messageDiv.textContent = `${data.message} Anda akan diarahkan...`;
            messageDiv.className = 'success';
            setTimeout(() => window.location.href = 'auth.html', 3000);
        } catch (error) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'error';
            submitButton.disabled = false;
        }
    });
}

function setupDashboard() {
    const userEmailSpan = document.getElementById('user-email');
    const moodForm = document.getElementById('mood-form');
    const moodHistoryList = document.getElementById('mood-history-list');
    const moodMessage = document.getElementById('mood-message');
    const token = localStorage.getItem('jwt_token');

    const getMoodIconSVG = (level) => {
        const icons = {
            '5': `<svg class="mood-icon" viewBox="0 0 24 24"><path d="M12 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm0-18c-4.411 0-8 3.589-8 8s3.589 8 8 8 8-3.589 8-8-3.589-8-8-8z"/><path d="M9.5 15c.828 0 1.5-.672 1.5-1.5S10.328 12 9.5 12s-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm5 0c.828 0 1.5-.672 1.5-1.5S15.328 12 14.5 12s-1.5.672-1.5 1.5.672 1.5 1.5 1.5z"/><path d="M12 18.5c2.271 0 4.219-1.328 5.293-3.268l-1.809-.884C14.732 15.82 13.468 16.5 12 16.5s-2.732-.68-3.484-2.152l-1.809.884C7.781 17.172 9.729 18.5 12 18.5z" fill="currentColor"/></svg>`,
            '4': `<svg class="mood-icon" viewBox="0 0 24 24"><path d="M12 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm0-18c-4.411 0-8 3.589-8 8s3.589 8 8 8 8-3.589 8-8-3.589-8-8-8z"/><path d="M9.5 15c.828 0 1.5-.672 1.5-1.5S10.328 12 9.5 12s-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm5 0c.828 0 1.5-.672 1.5-1.5S15.328 12 14.5 12s-1.5.672-1.5 1.5.672 1.5 1.5 1.5z"/><path d="M8 17h8v2H8z" fill="currentColor"/></svg>`,
            '3': `<svg class="mood-icon" viewBox="0 0 24 24"><path d="M12 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm0-18c-4.411 0-8 3.589-8 8s3.589 8 8 8 8-3.589 8-8-3.589-8-8-8z"/><path d="M15.5 12c.828 0 1.5.672 1.5 1.5S16.328 15 15.5 15s-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm-7 0c.828 0 1.5.672 1.5 1.5S9.328 15 8.5 15s-1.5-.672-1.5-1.5S7.672 12 8.5 12z"/><path d="M16 17H8v2h8z" transform="rotate(180 12 18)" fill="currentColor"/></svg>`,
            '2': `<svg class="mood-icon" viewBox="0 0 24 24"><path d="M12 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm0-18c-4.411 0-8 3.589-8 8s3.589 8 8 8 8-3.589 8-8-3.589-8-8-8z"/><path d="M12 18.5c-2.271 0-4.219-1.328-5.293-3.268l1.809-.884C9.268 15.82 10.532 16.5 12 16.5s2.732-.68 3.484-2.152l1.809.884C16.219 17.172 14.271 18.5 12 18.5z" transform="rotate(180 12 15.67)" fill="currentColor"/><path d="M9.5 12c.828 0 1.5.672 1.5 1.5S10.328 15 9.5 15s-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm5 0c.828 0 1.5.672 1.5 1.5S15.328 15 14.5 15s-1.5-.672-1.5-1.5.672-1.5 1.5-1.5z"/></svg>`,
            '1': `<svg class="mood-icon" viewBox="0 0 24 24"><path d="M12 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm0-18c-4.411 0-8 3.589-8 8s3.589 8 8 8 8-3.589 8-8-3.589-8-8-8z"/><path d="M14.5 15c-.828 0-1.5-.672-1.5-1.5S13.672 12 14.5 12s1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm-5 0c-.828 0-1.5-.672-1.5-1.5S8.672 12 9.5 12s1.5.672 1.5 1.5-.672 1.5-1.5 1.5z"/><path d="M12 16.5c2.271 0 4.219-1.328 5.293-3.268l-1.809-.884C14.732 13.82 13.468 14.5 12 14.5s-2.732-.68-3.484-2.152l-1.809.884C7.781 15.172 9.729 16.5 12 16.5z" fill="currentColor"/></svg>`
        };
        return icons[level] || '';
    };

    const displayMoodHistory = async () => {
        moodHistoryList.innerHTML = `<li class="history-mood-status">Memuat riwayat...</li>`;
        try {
            const response = await fetch(`${API_BASE_URL}/api/moods`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Server merespon dengan status: ${response.status}`);
            
            const moods = await response.json();
            moodHistoryList.innerHTML = ''; // Kosongkan list
            if (moods.length === 0) {
                moodHistoryList.innerHTML = `<li class="history-mood-status">Belum ada riwayat mood.</li>`;
            } else {
                moods.forEach(mood => {
                    const li = document.createElement('li');
                    li.className = 'history-mood-item';
                    const date = new Date(mood.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                    li.innerHTML = `${getMoodIconSVG(mood.mood_level)}<div class="history-mood-item-content"><div class="mood-date">${date}</div>${mood.notes ? `<div class="mood-notes">"${mood.notes}"</div>` : ''}</div>`;
                    moodHistoryList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Gagal menampilkan riwayat mood:', error);
            moodHistoryList.innerHTML = `<li class="history-mood-status">Gagal memuat riwayat.</li>`;
        }
    };
    
    const fetchProfile = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (response.ok) userEmailSpan.textContent = data.user.email;
        } catch (error) { console.error('Gagal mengambil profil:', error); }
    };

    moodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mood_level = moodForm.elements.mood.value;
        const notes = document.getElementById('mood-notes').value;
        moodMessage.textContent = '';
        moodMessage.className = '';
        try {
            const response = await fetch(`${API_BASE_URL}/api/moods`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ mood_level, notes }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            moodMessage.textContent = 'Mood berhasil disimpan!';
            moodMessage.className = 'success';
            setTimeout(() => moodMessage.textContent = '', 3000);
            moodForm.reset();
            displayMoodHistory();
        } catch (error) {
            moodMessage.textContent = `Error: ${error.message}`;
            moodMessage.className = 'error';
        }
    });

    fetchProfile();
    displayMoodHistory();
}