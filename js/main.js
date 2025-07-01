// js/main.js
import { API_BASE_URL } from './config.js';
import { setupAuthEventListeners } from './modules/auth-pages.js';
import { setupPublicPageEventListeners } from './modules/public-pages.js';
import { setupDashboard } from './modules/dashboard.js';
import { setupToolHandlers } from './modules/tools.js';
import { setupChatBubble } from './modules/chat.js';
import { checkLoginStatus, logout } from './utils/auth.js';
import { showModal } from './utils/ui.js';

// Fungsi untuk menginisialisasi navigasi dan event listener umum
const initializeApp = () => {
    const hamburger = document.getElementById('hamburger');
    const mobileNavLinks = document.getElementById('mobile-nav-links');

    if (hamburger && mobileNavLinks) {
        hamburger.addEventListener('click', () => {
            mobileNavLinks.classList.toggle('active');
            hamburger.classList.toggle('is-active');
        });
    }
    updateNavUI();
    setupChatBubble();
};

// Fungsi untuk memperbarui UI navigasi berdasarkan status login
const updateNavUI = () => {
    const isLoggedIn = checkLoginStatus();
    const navLinks = document.getElementById('nav-links');
    const mobileNavLinks = document.getElementById('mobile-nav-links');

    if (isLoggedIn) {
        if (navLinks) {
            navLinks.innerHTML = `
                <li><a href="/index.html">Beranda</a></li>
                <li><a href="/portfolio.html">Portfolio</a></li>
                <li><a href="/jurnal.html">Jurnal</a></li>
                <li><a href="/tools.html">Tools</a></li>
                <li><a href="/dashboard.html" class="btn btn-primary">Dasbor</a></li>
                <li><a href="#" id="logout-link" class="btn btn-outline-primary">Logout</a></li>
            `;
            // Listener untuk logout di navigasi desktop
            document.getElementById('logout-link')?.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
        if (mobileNavLinks) {
            mobileNavLinks.innerHTML = `
                <li><a href="/index.html">Beranda</a></li>
                <li><a href="/portfolio.html">Portfolio</a></li>
                <li><a href="/jurnal.html">Jurnal</a></li>
                <li><a href="/tools.html">Tools</a></li>
                <li><a href="/dashboard.html">Dasbor</a></li>
                <li><a href="#" id="mobile-logout-link" class="btn btn-primary btn-pill">Logout</a></li>
            `;
            // Listener untuk logout di navigasi mobile
            document.getElementById('mobile-logout-link')?.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
    } else {
        if (navLinks) {
            navLinks.innerHTML = `
                <li><a href="/index.html">Beranda</a></li>
                <li><a href="/portfolio.html">Portfolio</a></li>
                <li><a href="/jurnal.html">Jurnal</a></li>
                <li><a href="/tools.html">Tools</a></li>
                <li><a href="auth.html" class="btn btn-primary">Login</a></li>
            `;
        }
        if (mobileNavLinks) {
            // !!! [PERBAIKAN] Menambahkan kelas ke tombol Login di menu mobile !!!
            mobileNavLinks.innerHTML = `
                <li><a href="/index.html">Beranda</a></li>
                <li><a href="/portfolio.html">Portfolio</a></li>
                <li><a href="/jurnal.html">Jurnal</a></li>
                <li><a href="/tools.html">Tools</a></li>
                <li><a href="auth.html" class="btn btn-primary btn-pill">Login</a></li>
            `;
        }
    }
};


// Router sederhana berbasis path
const router = () => {
    const path = window.location.pathname;
    
    // Inisialisasi komponen yang ada di semua halaman
    initializeApp();

    // Routing untuk halaman spesifik
    if (path.endsWith('/') || path.endsWith('/index.html')) {
        setupPublicPageEventListeners();
    } else if (path.includes('auth.html') || path.includes('forgot-password.html') || path.includes('reset-password.html') || path.includes('auth-callback.html')) {
        setupAuthEventListeners();
    } else if (path.includes('dashboard.html')) {
        setupDashboard();
    } else if (path.includes('/tools/')) {
        setupToolHandlers(path);
    } else if (path.includes('portfolio.html') || path.includes('jurnal.html') || path.includes('project-detail.html') || path.includes('jurnal-detail.html')) {
        setupPublicPageEventListeners();
    }
};

// Eksekusi ketika DOM sudah siap
document.addEventListener('DOMContentLoaded', router);