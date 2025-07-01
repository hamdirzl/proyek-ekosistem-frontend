// js/main.js
// Titik masuk utama aplikasi. Mengimpor modul dan menjalankan fungsi setup berdasarkan halaman yang aktif.

// Import Konfigurasi & Utilitas
import { API_BASE_URL } from './config.js';
import { fetchWithAuth, forceLogout } from './utils/auth.js';
import { setupMobileMenu, setupAllPasswordToggles } from './utils/ui.js';
import { setupCropModal } from './utils/cropping.js';

// Import Modul Fitur
import { setupChatBubble } from './modules/chat.js';
import { setupDashboardPage } from './modules/dashboard.js';
import { setupAuthPage, setupAuthCallbackPage } from './modules/auth-pages.js';
import { setupPortfolioPage, setupProjectDetailPage, setupJurnalPage, setupJurnalDetailPage } from './modules/public-pages.js';
import {
    setupToolsPage,
    setupUrlShortenerPage,
    setupMediaConverterPage,
    attachQrCodeGeneratorListener,
    setupImageCompressorPage,
    attachImagesToPdfListener,
    setupSplitPdfPage
} from './modules/tools.js';


document.addEventListener('DOMContentLoaded', async () => {
    // --- Logika Otentikasi & Navbar (Berjalan di semua halaman) ---
    const navDasbor = document.getElementById('nav-dasbor');
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');
    const logoutButtonNav = document.getElementById('logout-button-nav');
    const refreshToken = localStorage.getItem('jwt_refresh_token');

    if (refreshToken) {
        if (navDasbor) navDasbor.style.display = 'list-item';
        if (navLogin) navLogin.style.display = 'none';
        if (navLogout) navLogout.style.display = 'list-item';

        if (logoutButtonNav) {
            logoutButtonNav.addEventListener('click', async () => {
                try {
                    await fetchWithAuth(`${API_BASE_URL}/api/logout`, { method: 'POST' });
                } catch (e) {
                    console.error("Gagal logout di server, tapi tetap lanjut logout di client.", e);
                } finally {
                    forceLogout();
                    const indexPath = window.location.href.includes('github.io') ? '/hrportof/' : '/';
                    window.location.href = indexPath;
                }
            });
        }
    } else {
        if (navDasbor) navDasbor.style.display = 'none';
        if (navLogin) navLogin.style.display = 'list-item';
        if (navLogout) navLogout.style.display = 'none';
    }

    // Coba refresh access token jika ada refresh token tapi tidak ada access token
    if (refreshToken && !sessionStorage.getItem('jwt_access_token')) {
        try {
            const refreshResponse = await fetch(`${API_BASE_URL}/api/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: refreshToken })
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                sessionStorage.setItem('jwt_access_token', data.accessToken);
                // Jika setelah refresh kita ada di halaman dashboard, panggil setup-nya
                if (document.body.contains(document.getElementById('dashboard-main'))) {
                    await setupDashboardPage();
                }
            } else {
                forceLogout();
            }
        } catch (error) {
            forceLogout();
        }
    }

    // --- Router Pemuatan Halaman Spesifik ---
    const pageTitle = document.title;
    
    if (document.body.contains(document.getElementById('dashboard-main'))) {
        await setupDashboardPage();
        setupCropModal(); // Modal cropping hanya diperlukan di dasbor
    } else if (pageTitle.includes("Portofolio - HAMDI RIZAL")) {
        setupPortfolioPage();
    } else if (pageTitle.includes("Detail Proyek")) {
        setupProjectDetailPage();
    } else if (pageTitle.includes("Detail Jurnal")) {
        setupJurnalDetailPage();
    } else if (pageTitle.includes("Jurnal - HAMDI RIZAL")) {
        setupJurnalPage();
    } else if (document.body.id === 'tools-page') {
        setupToolsPage();
    } else if (pageTitle.includes("URL Shortener")) {
        setupUrlShortenerPage();
    } else if (pageTitle.includes("Media Converter")) {
        setupMediaConverterPage();
    } else if (pageTitle.includes("QR Code Generator")) {
        attachQrCodeGeneratorListener();
    } else if (pageTitle.includes("Image Compressor")) {
        setupImageCompressorPage();
    } else if (pageTitle.includes("Images to PDF")) {
        attachImagesToPdfListener();
    } else if (pageTitle.includes("Split PDF")) {
        setupSplitPdfPage();
    } else if (document.getElementById('login-form')) {
        setupAuthPage();
    } else if (pageTitle.includes("Logging In...")) {
        setupAuthCallbackPage();
    }

    // --- Setup Global (Berjalan di hampir semua halaman) ---
    setupMobileMenu();
    setupAllPasswordToggles();
    setupChatBubble(); // Chat bubble tidak akan muncul di dashboard karena ada pengecekan di dalam fungsinya
});