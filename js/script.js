// ===================================================================
// ==   FILE FINAL SCRIPT.JS (dengan Lupa Password & Fix Dashboard) ==
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
        // Jika tidak ada token dan kita berada di halaman yang butuh login, redirect
        if (document.body.matches('[id*="dashboard-main"]')) {
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
    const userEmailSpan = document.getElementById('user-email');
    const moodForm = document.getElementById('mood-form');
    const moodHistoryList = document.getElementById('mood-history');
    const loadingMoods = document.getElementById('loading-moods');
    const moodMessage = document.getElementById('mood-message');

    const token = localStorage.getItem('jwt_token');

    // Fungsi untuk mengubah level mood menjadi emoji
    const getMoodEmoji = (level) => {
        const emojis = { 5: '😁', 4: '🙂', 3: '😐', 2: '😕', 1: '😥' };
        return emojis[level] || '🤔';
    };
    
    // Fungsi untuk menampilkan riwayat mood
    const displayMoodHistory = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/moods`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401 || response.status === 403) {
                 localStorage.removeItem('jwt_token');
                 window.location.href = 'auth.html';
                 return;
            }
            const moods = await response.json();
            loadingMoods.remove(); // Hapus tulisan "Memuat riwayat..."
            moodHistoryList.innerHTML = ''; // Kosongkan daftar

            if (moods.length === 0) {
                moodHistoryList.innerHTML = '<p>Belum ada riwayat mood yang tercatat.</p>';
            } else {
                moods.forEach(mood => {
                    const li = document.createElement('li');
                    li.className = 'mood-item';
                    const date = new Date(mood.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                    li.innerHTML = `
                        <div class="mood-item-header">
                            <span>${getMoodEmoji(mood.mood_level)}</span>
                            <span class="mood-date">${date}</span>
                        </div>
                        ${mood.notes ? `<p class="mood-notes">"${mood.notes}"</p>` : ''}
                    `;
                    moodHistoryList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Gagal mengambil riwayat mood:', error);
            loadingMoods.textContent = 'Gagal memuat riwayat.';
        }
    };
    
    // Fungsi untuk mendapatkan profil dan menampilkan email
    const fetchProfile = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                userEmailSpan.textContent = data.user.email;
            }
        } catch (error) {
            console.error('Gagal mengambil profil:', error);
        }
    };

    // Event listener untuk form submit mood
    moodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mood_level = moodForm.elements.mood.value;
        const notes = document.getElementById('mood-notes').value;
        try {
            const response = await fetch(`${API_BASE_URL}/api/moods`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ mood_level, notes })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            moodMessage.textContent = 'Mood berhasil disimpan!';
            moodMessage.className = 'success';
            moodForm.reset();
            displayMoodHistory(); // Refresh riwayat setelah submit
        } catch (error) {
            moodMessage.textContent = `Error: ${error.message}`;
            moodMessage.className = 'error';
        }
    });

    // Panggil fungsi saat halaman dimuat
    fetchProfile();
    displayMoodHistory();
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
        if (modalOverlay) modalOverlay.classList.remove('hidden');
    };

    const closeModal = () => {
        if (modalOverlay) modalOverlay.classList.add('hidden');
    };

    aboutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    });
    
    if (modalOverlay) {
        modalCloseButton.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) closeModal();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal();
        });
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
            const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
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

        if (!token) {
            messageDiv.textContent = 'Error: Token tidak ditemukan.';
            messageDiv.className = 'error';
            return;
        }

        if (password !== confirmPassword) {
            messageDiv.textContent = 'Error: Password dan konfirmasi password tidak cocok.';
            messageDiv.className = 'error';
            return;
        }

        messageDiv.textContent = 'Memproses...';
        messageDiv.className = '';
        submitButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan');

            messageDiv.textContent = `${data.message} Anda akan diarahkan ke halaman login...`;
            messageDiv.className = 'success';
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 3000);

        } catch (error) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'error';
            submitButton.disabled = false;
        }
    });
}

// ==========================================================
// ===         LOGIKA UNTUK HEADER TRANSPARAN             ===
// ==========================================================
document.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if(navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    }
});