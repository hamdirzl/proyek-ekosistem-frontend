// ===================================================================
// ==   FILE FINAL SCRIPT.JS (DENGAN PERBAIKAN LOGIKA DASHBOARD)    ==
// ===================================================================
const API_BASE_URL = 'https://server-pribadi-hamdi.onrender.com';

console.log(`Ekosistem Digital (Client v11) dimuat! Menghubungi API di: ${API_BASE_URL}`);

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
    const resultBox = document.getElementById('result');
    shortenerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const originalUrl = longUrlInput.value;
        resultBox.textContent = 'Memproses...';
        try {
            const response = await fetch(`${API_BASE_URL}/api/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_url: originalUrl }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal mengambil data');
            resultBox.textContent = `Link pendek Anda: ${data.short_url}`;
            longUrlInput.value = '';
        } catch (error) {
            console.error('Terjadi Error:', error);
            resultBox.textContent = 'Gagal terhubung ke server: ' + error.message;
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
// ===         LOGIKA UNTUK HALAMAN DASHBOARD (DIPERBAIKI)       ===
// =================================================================
if (document.getElementById('dashboard-main')) {
    const userEmailEl = document.getElementById('user-email');
    const moodForm = document.getElementById('mood-form');
    const moodHistoryList = document.getElementById('mood-history');
    const loadingMessage = document.getElementById('loading-moods');
    const moodMessage = document.getElementById('mood-message');
    const token = localStorage.getItem('jwt_token');

    if (!token) {
        window.location.href = 'auth.html';
    }

    const fetchAndRenderMoods = async () => {
        if (!moodHistoryList) return;
        try {
            if(loadingMessage) loadingMessage.textContent = 'Memuat riwayat...';
            const response = await fetch(`${API_BASE_URL}/api/moods`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) {
                localStorage.removeItem('jwt_token');
                window.location.href = 'auth.html';
                return;
            }
            if (!response.ok) throw new Error('Gagal mengambil data mood.');
            const moods = await response.json();
            
            moodHistoryList.innerHTML = '';
            if (moods.length === 0) {
                if (loadingMessage) loadingMessage.style.display = 'none';
                moodHistoryList.innerHTML = '<li>Anda belum memiliki catatan mood.</li>';
            } else {
                 if (loadingMessage) loadingMessage.style.display = 'none';
                const moodEmojis = { 1: '😥', 2: '😕', 3: '😐', 4: '🙂', 5: '😁' };
                moods.forEach(mood => {
                    const listItem = document.createElement('li');
                    listItem.className = `mood-item`;
                    const moodDate = new Date(mood.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
                    listItem.innerHTML = `<div class="mood-item-header"><span>${moodEmojis[mood.mood_level]}</span><span class="mood-date">${moodDate}</span></div><p class="mood-notes">${mood.notes || '<em>Tidak ada catatan.</em>'}</p>`;
                    moodHistoryList.appendChild(listItem);
                });
            }
        } catch (error) {
            moodHistoryList.innerHTML = `<li style="color:red;">Error: ${error.message}</li>`;
        }
    };

    const fetchProfile = async () => {
        if (!userEmailEl) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Sesi tidak valid.');
            const data = await response.json();
            userEmailEl.textContent = data.user.email;
        } catch (error) {
            localStorage.removeItem('jwt_token');
            window.location.href = 'auth.html';
        }
    };

    if (moodForm) {
        moodForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const moodLevel = moodForm.elements['mood'].value;
            const notes = document.getElementById('mood-notes').value;
            if(!moodLevel) {
                if(moodMessage) {
                    moodMessage.textContent = 'Error: Silakan pilih mood Anda.';
                    moodMessage.className = 'error';
                }
                return;
            }
            if (moodMessage) {
                moodMessage.textContent = '';
                moodMessage.className = '';
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/moods`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ mood_level: parseInt(moodLevel), notes: notes })
                });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Gagal menyimpan mood.');
                }
                moodForm.reset();
                fetchAndRenderMoods();
            } catch (error) {
                if(moodMessage) {
                    moodMessage.textContent = `Error: ${error.message}`;
                    moodMessage.className = 'error';
                }
            }
        });
    }

    fetchProfile();
    fetchAndRenderMoods();
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

    const openModal = () => {
        if (modalOverlay) {
            modalOverlay.classList.remove('hidden');
        }
    };

    const closeModal = () => {
        if (modalOverlay) {
            modalOverlay.classList.add('hidden');
        }
    };

    aboutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!modalOverlay) {
                window.location.href = 'index.html#open-about';
            } else {
                e.preventDefault();
                openModal();
            }
        });
    });

    if (window.location.hash === '#open-about') {
        openModal();
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    
    if (modalOverlay) {
        modalCloseButton.addEventListener('click', closeModal);

        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                closeModal();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
                closeModal();
            }
        });
    }
});