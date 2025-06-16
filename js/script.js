// ===================================================================
// ==        FILE FINAL SCRIPT.JS (SIAP UNTUK DEPLOYMENT)         ==
// ===================================================================

// --- PERUBAHAN PENTING UNTUK DEPLOYMENT ---
const API_BASE_URL = 'https://server-pribadi-hamdi.onrender.com';

console.log(`Ekosistem Digital v3.0 (Live) dimuat! Menghubungi API di: ${API_BASE_URL}`);

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
            // PERBAIKAN KRUSIAL: Menggunakan API_BASE_URL di sini juga
            const response = await fetch(`${API_BASE_URL}/api/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_url: originalUrl }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal mengambil data');
            resultBox.textContent = `Link pendek Anda: ${data.short_url}`;
            resultBox.style.color = 'var(--secondary-color)';
            longUrlInput.value = '';
        } catch (error) {
            console.error('Terjadi Error:', error);
            resultBox.textContent = 'Gagal terhubung ke server: ' + error.message;
            resultBox.style.color = '#e74c3c';
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
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('hidden');
        registerSection.classList.remove('hidden');
        authMessage.textContent = '';
        authMessage.className = '';
    });
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
        authMessage.textContent = '';
        authMessage.className = '';
    });
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            authMessage.textContent = 'Registrasi berhasil! Silakan login.';
            authMessage.className = 'success';
            showLoginLink.click();
        } catch (error) {
            authMessage.textContent = `Error: ${error.message}`;
            authMessage.className = 'error';
        }
    });
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
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

// ==========================================================
// ===         LOGIKA UNTUK HALAMAN DASHBOARD             ===
// ==========================================================
if (document.getElementById('dashboard-main')) {
    const userEmailEl = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const moodForm = document.getElementById('mood-form');
    const moodHistoryList = document.getElementById('mood-history');
    const loadingMessage = document.getElementById('loading-moods');
    const moodMessage = document.getElementById('mood-message');
    const token = localStorage.getItem('jwt_token');
    if (!token) { window.location.href = 'auth.html'; }
    const fetchAndRenderMoods = async () => {
        try {
            loadingMessage.textContent = 'Memuat riwayat...';
            const response = await fetch(`${API_BASE_URL}/api/moods`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Gagal mengambil data mood.');
            const moods = await response.json();
            moodHistoryList.innerHTML = '';
            if (moods.length === 0) {
                moodHistoryList.innerHTML = '<p>Anda belum memiliki catatan mood.</p>';
            } else {
                const moodEmojis = { 1: '😥', 2: '😕', 3: '😐', 4: '🙂', 5: '😁' };
                moods.forEach(mood => {
                    const listItem = document.createElement('li');
                    listItem.className = `mood-item level-${mood.mood_level}`;
                    const moodDate = new Date(mood.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
                    listItem.innerHTML = `<div class="mood-item-header"><span>Mood: ${moodEmojis[mood.mood_level]}</span><span class="mood-date">${moodDate}</span></div><p class="mood-notes">${mood.notes || '<em>Tidak ada catatan.</em>'}</p>`;
                    moodHistoryList.appendChild(listItem);
                });
            }
        } catch (error) {
            moodHistoryList.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
        }
    };
    const fetchProfile = async () => {
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
    moodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const moodLevel = moodForm.elements['mood'].value;
        const notes = document.getElementById('mood-notes').value;
        moodMessage.textContent = '';
        moodMessage.className = '';
        try {
            const response = await fetch(`${API_BASE_URL}/api/moods`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ mood_level: parseInt(moodLevel), notes: notes })
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Gagal menyimpan mood.');
            }
            moodMessage.textContent = 'Mood berhasil disimpan!';
            moodMessage.className = 'success';
            moodForm.reset();
            fetchAndRenderMoods();
            setTimeout(() => { moodMessage.textContent = ''; }, 3000);
        } catch (error) {
            moodMessage.textContent = `Error: ${error.message}`;
            moodMessage.className = 'error';
        }
    });
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        window.location.href = 'auth.html';
    });
    fetchProfile();
    fetchAndRenderMoods();
}