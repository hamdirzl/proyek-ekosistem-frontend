// js/modules/auth-pages.js
// Mengelola logika untuk halaman autentikasi (Login, Register, Callback, Lupa/Reset Password).

import { API_BASE_URL } from '../config.js';

export function setupAuthPage() {
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
    const forgotForm = document.getElementById('forgot-form');
    const resetForm = document.getElementById('reset-form');

    const startGoogleAuth = () => {
        window.location.href = `${API_BASE_URL}/api/auth/google`;
    };

    if (googleLoginBtn) googleLoginBtn.addEventListener('click', startGoogleAuth);
    if (googleRegisterBtn) googleRegisterBtn.addEventListener('click', startGoogleAuth);

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
                setTimeout(() => { 
                    const indexPath = window.location.href.includes('github.io') ? '/hrportof/' : '/';
                    window.location.href = indexPath; 
                }, 1000);
            } catch (error) {
                authMessage.textContent = `Error: ${error.message}`;
                authMessage.className = 'error';
            }
        });
    }

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
}

export function setupAuthCallbackPage() {
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