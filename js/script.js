// ===================================================================
// ==        FILE FINAL SCRIPT.JS (DENGAN PERSISTENSI LOGIN)      ==
// ===================================================================
const API_BASE_URL = 'https://server-pribadi-hamdi.onrender.com';

console.log(`Ekosistem Digital (Client v10) dimuat! Menghubungi API di: ${API_BASE_URL}`);

/* === FUNGSI GLOBAL UNTUK CEK STATUS LOGIN === */
// Skrip ini berjalan di setiap halaman saat dimuat
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    const loginButtons = document.querySelectorAll('a.login-button'); // Tombol login di menu utama
    const logoutButton = document.getElementById('logout-button'); // Tombol logout di dasbor

    if (token) {
        // Jika token ada (pengguna sudah login)
        
        // Ubah semua tombol "Login" menjadi "Dasbor" di halaman publik
        loginButtons.forEach(button => {
            button.textContent = 'Dasbor';
            button.href = 'dashboard.html';
        });

    } else {
        // Jika token tidak ada (pengguna belum login), tidak perlu melakukan apa-apa.
        // Tombol akan menampilkan "Login" sesuai HTML default.
    }
});


// ===================================
// === FUNGSI UNTUK URL SHORTENER ===
// ===================================
const shortenerForm = document.getElementById('shortener-form');
if (shortenerForm) {
    // ... (kode ini tetap sama)
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
    // ... (kode ini tetap sama)
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
            if (showLoginLink) showLoginLink.click();
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
    // ... (kode ini tetap sama)
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            window.location.href = 'auth.html';
        });
    }

    const token = localStorage.getItem('jwt_token');
    if (!token) {
        window.location.href = 'auth.html';
    } else {
        // Jika token ada, jalankan fungsi untuk ambil data dasbor
        // (Misal: fetchProfile, fetchAndRenderMoods)
    }
}

// ==========================================================
// ===         LOGIKA UNTUK MENU DROPDOWN MOBILE          ===
// ==========================================================
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
    // ... (kode ini tetap sama)
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });
}