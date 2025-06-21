// VERSI FINAL DENGAN RICH TEXT EDITOR & CROPPING
const API_BASE_URL = 'https://server-pribadi-hamdi-docker.onrender.com';

console.log(`Ekosistem Digital (Client Final) dimuat! Menghubungi API di: ${API_BASE_URL}`);

// --- Variabel Global untuk Fitur Cropping & Editor ---
let cropper = null;
let imageToCropElement = null;
let cropModal = null;
let confirmCropBtn = null;
let cancelCropBtn = null;
let currentCropCallback = null;
let croppedPortfolioBlob = null; // Khusus untuk menyimpan blob portofolio

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

    // Biarkan browser mengatur Content-Type untuk FormData
    if (options.body instanceof FormData) {
        delete options.headers['Content-Type'];
    } else if (!options.headers['Content-Type'] && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }

    let response = await fetch(url, options);

    if (response.status === 401 || response.status === 403) {
        console.log("Access Token kedaluwarsa atau tidak valid, mencoba refresh...");
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
            console.error("Error saat proses refresh token:", error);
            forceLogout();
        }
    }

    return response;
}

/* === FUNGSI GLOBAL === */
document.addEventListener('DOMContentLoaded', async () => {
    // Logika autentikasi navbar
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
                    window.location.href = 'index.html';
                }
            });
        }

    } else {
        if (navDasbor) navDasbor.style.display = 'none';
        if (navLogin) navLogin.style.display = 'list-item';
        if (navLogout) navLogout.style.display = 'none';
    }
    
    if (refreshToken && !sessionStorage.getItem('jwt_access_token')) {
        console.log("Sesi baru, mencoba mendapatkan access token...");
        try {
            const refreshResponse = await fetch(`${API_BASE_URL}/api/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: refreshToken })
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                sessionStorage.setItem('jwt_access_token', data.accessToken);
                console.log("Access token berhasil didapatkan untuk sesi ini.");
                // Setelah mendapatkan token, panggil setup untuk halaman dashboard jika diperlukan
                if (document.body.contains(document.getElementById('dashboard-main'))) {
                    setupDashboardPage();
                }
            } else {
                forceLogout();
            }
        } catch (error) {
            console.error("Gagal mendapatkan access token saat load:", error);
            forceLogout();
        }
    }

    // Panggil fungsi setup berdasarkan halaman
    if (document.body.contains(document.getElementById('dashboard-main'))) {
        setupDashboardPage();
        setupCropModal(); // Setup modal crop
    } else if (document.title.includes("Portofolio - HAMDI RIZAL")) {
        setupPortfolioPage();
    } else if (document.title.includes("Detail Proyek")) {
        setupProjectDetailPage();
    } else if (document.title.includes("Detail Jurnal")) {
        setupJurnalDetailPage();
    } else if (document.title.includes("Jurnal - HAMDI RIZAL")) {
        setupJurnalPage();
    } else if (document.title.includes("Tools")) {
        setupToolsPage();
    } else if (document.getElementById('login-form')) {
        setupAuthPage();
    }

    setupAboutModal();
    setupMobileMenu();
    setupAllPasswordToggles();
    setupChatBubble();
    setupAccountManagement();
    setupDashboardTabs();
});


function decodeJwt(token) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
}

// ===================================
// FUNGSI-FUNGSI UNTUK CROPPING GAMBAR
// ===================================
function setupCropModal() {
    cropModal = document.getElementById('crop-modal');
    imageToCropElement = document.getElementById('image-to-crop');
    confirmCropBtn = document.getElementById('confirm-crop-btn');
    cancelCropBtn = document.getElementById('cancel-crop-btn');

    if (!cropModal) return;

    cancelCropBtn.addEventListener('click', () => {
        cropModal.classList.add('hidden');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    });

    confirmCropBtn.addEventListener('click', () => {
        if (cropper && currentCropCallback) {
            // Dapatkan canvas yang sudah dipotong
            cropper.getCroppedCanvas({
                width: 1280, // Resolusi target
                imageSmoothingQuality: 'high',
            }).toBlob(blob => {
                // Panggil callback dengan data blob
                currentCropCallback(blob);
                // Tutup modal dan hancurkan instance cropper
                cropModal.classList.add('hidden');
                cropper.destroy();
                cropper = null;
            }, 'image/jpeg', 0.9); // Simpan sebagai JPEG kualitas 90%
        }
    });
}

function showCropModal(imageSrc, callback, aspectRatio = 16 / 9) {
    if (!cropModal || !imageToCropElement) return;

    currentCropCallback = callback;
    imageToCropElement.src = imageSrc;
    cropModal.classList.remove('hidden');

    if (cropper) {
        cropper.destroy();
    }

    // Inisialisasi Cropper.js
    cropper = new Cropper(imageToCropElement, {
        aspectRatio: aspectRatio,
        viewMode: 1, // Batasi area crop di dalam canvas
        background: false,
        autoCropArea: 0.9,
        responsive: true,
        checkOrientation: false,
    });
}

// Fungsi helper untuk menangani pemilihan file & memicu modal crop
function handleImageSelectionForCropping(file, callback, aspectRatio) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            showCropModal(e.target.result, callback, aspectRatio);
        };
        reader.readAsDataURL(file);
    }
}

// Fungsi untuk mengunggah gambar yang sudah di-crop (khusus untuk editor jurnal)
async function uploadCroppedImageForEditor(blob, successCallback, failureCallback) {
    const formData = new FormData();
    formData.append('file', blob, 'cropped-image.jpg');

    try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/jurnal/upload-image`, {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengunggah gambar');
        
        // Panggil callback TinyMCE dengan URL gambar yang dikembalikan server
        successCallback(data.location);

    } catch (error) {
        console.error(error);
        failureCallback(`Gagal unggah: ${error.message}`);
    }
}

// ===================================
// === LOGIKA HALAMAN DASHBOARD    ===
// ===================================
function setupDashboardPage() {
    const refreshToken = localStorage.getItem('jwt_refresh_token');
    if (!refreshToken) {
        window.location.href = 'auth.html';
        return;
    }
    
    // Pastikan token ada sebelum lanjut
    const accessToken = sessionStorage.getItem('jwt_access_token');
    if (!accessToken) {
        console.log("Menunggu access token dari proses refresh...");
        return; 
    }

    const decodedToken = decodeJwt(accessToken);
    populateUserInfo(decodedToken);
    populateUserDashboard(); 
    
    if (decodedToken && decodedToken.role === 'admin') {
        setupAdminPanels();
    }
}

// ==========================================================
// ===         LOGIKA UNTUK PANEL ADMIN                   ===
// ==========================================================
function setupAdminPanels() {
    // Menampilkan tab & info admin
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) userEmailElement.innerHTML += ' <span style="color: var(--accent-color); font-size: 0.9em;">(Admin)</span>';

    document.getElementById('admin-portfolio-tab')?.classList.remove('hidden');
    document.getElementById('admin-jurnal-tab')?.classList.remove('hidden');
    document.getElementById('admin-links-tab')?.classList.remove('hidden');
    document.getElementById('admin-users-tab')?.classList.remove('hidden');
    
    // Setup setiap panel admin
    setupAdminPortfolioPanel();
    setupAdminJurnalPanel();
    // ... (fungsi setup untuk panel link dan user tetap sama)
}

// === LOGIKA MANAJEMEN PORTOFOLIO ADMIN (DENGAN CROP) ===
function setupAdminPortfolioPanel() {
    const form = document.getElementById('portfolio-form');
    if (!form) return;

    const formTitle = document.getElementById('portfolio-form-title');
    const hiddenId = document.getElementById('portfolio-id');
    const titleInput = document.getElementById('portfolio-title');
    const descriptionInput = document.getElementById('portfolio-description');
    const linkInput = document.getElementById('portfolio-link');
    const imageTrigger = document.getElementById('portfolio-image-trigger');
    const imageInput = document.getElementById('portfolio-image');
    const fileNameLabel = document.getElementById('portfolio-file-name');
    const messageDiv = document.getElementById('portfolio-message');
    const clearButton = document.getElementById('clear-portfolio-form');
    const currentImageInfo = document.getElementById('current-image-info');

    function resetPortfolioForm() {
        form.reset();
        hiddenId.value = '';
        formTitle.textContent = 'Tambah Proyek Baru';
        messageDiv.textContent = '';
        messageDiv.className = '';
        fileNameLabel.textContent = 'Tidak ada file dipilih';
        currentImageInfo.textContent = '';
        croppedPortfolioBlob = null; // Reset blob yang disimpan
    }

    clearButton.addEventListener('click', resetPortfolioForm);

    imageTrigger.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const callback = (blob) => {
                croppedPortfolioBlob = blob; // Simpan blob yang sudah dicrop
                fileNameLabel.textContent = `Gambar siap diunggah (${(blob.size / 1024).toFixed(1)} KB)`;
                fileNameLabel.style.color = 'var(--accent-color)';
            };
            handleImageSelectionForCropping(file, callback, 16 / 9);
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = hiddenId.value;
        // Saat membuat proyek baru, gambar wajib ada.
        if (!id && !croppedPortfolioBlob) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Error: Gambar utama proyek wajib diisi.';
            return;
        }

        const formData = new FormData();
        formData.append('title', titleInput.value);
        formData.append('description', descriptionInput.value);
        formData.append('project_link', linkInput.value);
        
        // Hanya tambahkan gambar ke FormData jika ada blob baru
        if (croppedPortfolioBlob) {
            formData.append('image', croppedPortfolioBlob, 'portfolio-image.jpg');
        }
        
        const url = id ? `${API_BASE_URL}/api/admin/portfolio/${id}` : `${API_BASE_URL}/api/admin/portfolio`;
        const method = id ? 'PUT' : 'POST';

        messageDiv.className = '';
        messageDiv.textContent = "Menyimpan proyek...";

        try {
            const response = await fetchWithAuth(url, { method, body: formData });
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Terjadi kesalahan.');

            messageDiv.className = 'success';
            messageDiv.textContent = id ? 'Proyek berhasil diperbarui!' : 'Proyek berhasil ditambahkan!';
            
            resetPortfolioForm();
            fetchAndDisplayPortfolioAdmin();

        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = `Error: ${error.message}`;
        }
    });

    fetchAndDisplayPortfolioAdmin();
}


// === LOGIKA MANAJEMEN JURNAL ADMIN (DENGAN EDITOR & CROP) ===
function setupAdminJurnalPanel() {
    const form = document.getElementById('jurnal-form');
    if (!form) return;

    // Inisialisasi TinyMCE
    tinymce.init({
        selector: '#jurnal-content-editor',
        plugins: 'image link lists media wordcount code',
        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | link image media | code',
        height: 500,
        skin: 'oxide-dark',
        content_css: 'dark',
        
        // Konfigurasi penting untuk unggah gambar
        image_title: true,
        automatic_uploads: true,
        file_picker_types: 'image',
        
        // Callback ini akan berjalan saat tombol "Sisipkan/Edit Gambar" ditekan
        file_picker_callback: (cb, value, meta) => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            
            input.onchange = () => {
                const file = input.files[0];
                // Definisikan callback yang akan dijalankan setelah cropping selesai
                const cropCallback = (blob) => {
                    // Unggah blob yang sudah di-crop ke server
                    uploadCroppedImageForEditor(
                        blob, 
                        (location) => cb(location, { title: file.name }), // On success
                        (errorText) => tinymce.activeEditor.notificationManager.open({ text: errorText, type: 'error' }) // On failure
                    );
                };
                
                // Panggil fungsi cropping
                handleImageSelectionForCropping(file, cropCallback, 16 / 9);
            };
            
            input.click();
        },
    });

    const formTitle = document.getElementById('jurnal-form-title');
    const hiddenId = document.getElementById('jurnal-id');
    const titleInput = document.getElementById('jurnal-title');
    const messageDiv = document.getElementById('jurnal-message');
    const clearButton = document.getElementById('clear-jurnal-form');

    function resetJurnalForm() {
        form.reset();
        hiddenId.value = '';
        formTitle.textContent = 'Tambah Postingan Baru';
        messageDiv.textContent = '';
        messageDiv.className = '';
        if(tinymce.get('jurnal-content-editor')) {
            tinymce.get('jurnal-content-editor').setContent('');
        }
    }

    clearButton.addEventListener('click', resetJurnalForm);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = hiddenId.value;
        const title = titleInput.value;
        const content = tinymce.get('jurnal-content-editor').getContent();
        
        if (!title || !content) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Error: Judul dan konten tidak boleh kosong.';
            return;
        }
        
        messageDiv.className = '';
        messageDiv.textContent = "Menyimpan postingan...";

        const url = id ? `${API_BASE_URL}/api/admin/jurnal/${id}` : `${API_BASE_URL}/api/admin/jurnal`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetchWithAuth(url, { 
                method, 
                body: JSON.stringify({ title, content })
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Terjadi kesalahan.');

            messageDiv.className = 'success';
            messageDiv.textContent = id ? 'Postingan berhasil diperbarui!' : 'Postingan berhasil ditambahkan!';
            
            resetJurnalForm();
            fetchAndDisplayJurnalAdmin();

        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = `Error: ${error.message}`;
        }
    });

    fetchAndDisplayJurnalAdmin();
}


// ===================================
// === LOGIKA HALAMAN JURNAL       ===
// ===================================
function setupJurnalPage() {
    const jurnalGrid = document.querySelector('.jurnal-grid');
    if (!jurnalGrid) return;

    async function fetchAndRenderJurnal() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/jurnal`);
            if (!response.ok) throw new Error('Gagal memuat data jurnal.');

            const posts = await response.json();
            jurnalGrid.innerHTML = '';

            if (posts.length === 0) {
                jurnalGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted-color);">Belum ada tulisan untuk ditampilkan.</p>';
                return;
            }

            posts.forEach(post => {
                const postCard = document.createElement('article');
                postCard.className = 'jurnal-card';
                postCard.setAttribute('data-aos', 'fade-up');
                
                // Ambil gambar pertama dari konten, atau gunakan gambar default
                const firstImageMatch = post.content.match(/<img[^>]+src="([^">]+)"/);
                const postImage = post.image_url || (firstImageMatch ? firstImageMatch[1] : 'https://images.unsplash.com/photo-1489549132488-d00b7d8818e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80');
                
                // Hapus tag HTML dari konten untuk membuat pratinjau teks
                const strippedContent = post.content.replace(/<[^>]+>/g, ' ');
                const excerpt = strippedContent.substring(0, 150).trim() + (strippedContent.length > 150 ? '...' : '');

                postCard.innerHTML = `
                    <a href="jurnal-detail.html?id=${post.id}" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; height: 100%;">
                        <img src="${postImage}" alt="Gambar untuk ${post.title}">
                        <div class="jurnal-content">
                            <h3>${post.title}</h3>
                            <p class="post-meta">Dipublikasikan pada ${new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p>${excerpt}</p>
                            <span class="button-pintu" style="margin-top: auto;">Baca Selengkapnya</span>
                        </div>
                    </a>
                `;
                jurnalGrid.appendChild(postCard);
            });

        } catch (error) {
            console.error('Error:', error);
            jurnalGrid.innerHTML = `<p style="text-align: center; color: var(--text-muted-color);">${error.message}</p>`;
        }
    }
    fetchAndRenderJurnal();
}

// ==========================================
// === LOGIKA HALAMAN DETAIL JURNAL       ===
// ==========================================
function setupJurnalDetailPage() {
    const titleElement = document.getElementById('jurnal-title');
    const metaElement = document.getElementById('jurnal-meta');
    const imageElement = document.getElementById('jurnal-image');
    const contentElement = document.getElementById('jurnal-content');
    const mainContent = document.getElementById('main-content');
    const loadingIndicator = document.getElementById('loading-indicator');

    async function fetchJurnalDetails() {
        try {
            const params = new URLSearchParams(window.location.search);
            const postId = params.get('id');

            if (!postId) throw new Error('ID Postingan tidak ditemukan di URL.');

            const response = await fetch(`${API_BASE_URL}/api/jurnal/${postId}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Postingan tidak ditemukan.');
            }

            const post = await response.json();

            document.title = `${post.title} - Detail Jurnal`;
            titleElement.textContent = post.title;
            metaElement.textContent = `Dipublikasikan pada ${new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
            
            // Gambar utama diambil dari gambar pertama di konten, atau gambar utama post
            const firstImageMatch = post.content.match(/<img[^>]+src="([^">]+)"/);
            const mainImage = post.image_url || (firstImageMatch ? firstImageMatch[1] : null);
            
            if (mainImage) {
                imageElement.src = mainImage;
                imageElement.alt = `Gambar untuk ${post.title}`;
                imageElement.style.display = 'block';
            } else {
                imageElement.style.display = 'none';
            }

            // [PENTING] Render konten sebagai HTML
            contentElement.innerHTML = post.content;

            loadingIndicator.style.display = 'none';
            mainContent.style.display = 'block';

        } catch (error) {
            console.error(error);
            loadingIndicator.innerHTML = `<p style="color: #ff4d4d;">Error: ${error.message}</p>`;
        }
    }
    fetchJurnalDetails();
}


// Di bawah ini adalah sisa fungsi-fungsi yang tidak berubah.
// (Salin dan tempel sisa fungsi dari file asli Anda ke sini,
// mulai dari `setupAdminJurnalPanel`, `fetchAndDisplayJurnalAdmin`,
// `renderAdminJurnalItem`, dan semua fungsi lainnya hingga akhir file.)
// ==========================================================

// (Sisa fungsi-fungsi yang tidak berubah seperti `setupToolsPage`, `setupAuthPage`, `setupAboutModal`, dll. tetap di sini)
// ...
// ... Sisa file script.js Anda ...

async function fetchAndDisplayJurnalAdmin() {
    const listContainer = document.getElementById('jurnal-list-admin');
    const loadingMessage = document.getElementById('loading-jurnal-admin');
    if (!listContainer || !loadingMessage) return;

    loadingMessage.style.display = 'block';
    listContainer.innerHTML = '';
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/jurnal`);
        const posts = await response.json();
        if (!response.ok) throw new Error(posts.error || 'Gagal memuat postingan.');
        
        loadingMessage.style.display = 'none';

        if (posts.length === 0) {
            listContainer.innerHTML = '<li><p>Belum ada postingan jurnal ditambahkan.</p></li>';
            return;
        }

        posts.forEach(post => renderAdminJurnalItem(post, listContainer));
    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
    }
}

function renderAdminJurnalItem(post, container) {
    const listItem = document.createElement('li');
    listItem.className = 'mood-item';
    listItem.id = `jurnal-item-${post.id}`;
    const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    const strippedContent = post.content.replace(/<[^>]+>/g, ''); 

    listItem.innerHTML = `
        <div class="mood-item-header">
            <span><strong>${post.title}</strong></span>
            <div class="mood-item-actions">
                <button class="mood-icon-button edit-jurnal-btn" data-id="${post.id}" aria-label="Edit Postingan">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button class="mood-icon-button delete-jurnal-btn delete-button" data-id="${post.id}" aria-label="Hapus Postingan">
                    ${trashIconSvg}
                </button>
            </div>
        </div>
        <p class="mood-notes">${strippedContent.substring(0, 100)}...</p>
        <small class="mood-date">Dibuat: ${new Date(post.created_at).toLocaleString('id-ID')}</small>
    `;
    container.appendChild(listItem);

    listItem.querySelector('.edit-jurnal-btn').addEventListener('click', async () => {
        document.getElementById('jurnal-form-title').textContent = 'Edit Postingan';
        document.getElementById('jurnal-id').value = post.id;
        document.getElementById('jurnal-title').value = post.title;
        tinymce.get('jurnal-content-editor').setContent(post.content);
        document.getElementById('jurnal-form').scrollIntoView({ behavior: 'smooth' });
    });

    listItem.querySelector('.delete-jurnal-btn').addEventListener('click', async () => {
        if (!confirm(`Yakin ingin menghapus postingan "${post.title}"?`)) return;
        
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/jurnal/${post.id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            alert('Postingan berhasil dihapus.');
            fetchAndDisplayJurnalAdmin();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });
}

// (Salin sisa fungsi lainnya ke sini)
function setupToolsPage() {
    const wrappers = [
        document.getElementById('shortener-wrapper'), document.getElementById('history-section'),
        document.getElementById('converter-wrapper'), document.getElementById('image-merger-wrapper'),
        document.getElementById('qr-generator-wrapper'), document.getElementById('image-compressor-wrapper')
    ];
    const loginPrompt = document.getElementById('login-prompt');
    const toolSelectionSection = document.querySelector('.tool-selection');

    wrappers.forEach(el => el && el.classList.add('hidden'));

    if (localStorage.getItem('jwt_refresh_token')) {
        if (loginPrompt) loginPrompt.classList.add('hidden');
        if (toolSelectionSection) toolSelectionSection.classList.remove('hidden');

        document.getElementById('show-shortener')?.addEventListener('click', () => showToolSection('shortener-wrapper'));
        document.getElementById('show-converter')?.addEventListener('click', () => showToolSection('converter-wrapper'));
        document.getElementById('show-image-merger')?.addEventListener('click', () => showToolSection('image-merger-wrapper'));
        document.getElementById('show-qr-generator')?.addEventListener('click', () => showToolSection('qr-generator-wrapper'));
        document.getElementById('show-image-compressor')?.addEventListener('click', () => showToolSection('image-compressor-wrapper'));

        attachShortenerListener();
        attachConverterListener();
        attachImageMergerListener();
        attachQrCodeGeneratorListener();
        attachImageCompressorListener();

    } else {
        if (loginPrompt) loginPrompt.classList.remove('hidden');
        if (toolSelectionSection) toolSelectionSection.classList.add('hidden');
    }

    const fileInput = document.getElementById('file-input');
    const outputFormatSelect = document.getElementById('output-format');

    if (fileInput && outputFormatSelect) {
        fileInput.addEventListener('change', () => {
            if (!fileInput.files || fileInput.files.length === 0) return;
            const fileName = fileInput.files[0].name.toLowerCase();
            const docxOption = outputFormatSelect.querySelector('option[value="docx"]');
            if (fileName.endsWith('.pdf')) {
                if (docxOption) {
                    docxOption.disabled = true;
                    if (outputFormatSelect.value === 'docx') outputFormatSelect.value = 'pdf';
                }
            } else {
                if (docxOption) docxOption.disabled = false;
            }
        });
    }
}
function showToolSection(sectionIdToShow) {
    const allToolSections = [
        document.getElementById('shortener-wrapper'), document.getElementById('converter-wrapper'),
        document.getElementById('image-merger-wrapper'), document.getElementById('qr-generator-wrapper'),
        document.getElementById('image-compressor-wrapper')
    ];
    const historySection = document.getElementById('history-section');

    allToolSections.forEach(section => {
        if (section && section.id === sectionIdToShow) section.classList.remove('hidden');
        else section?.classList.add('hidden');
    });

    if (historySection) {
        if (sectionIdToShow === 'shortener-wrapper') {
            historySection.classList.remove('hidden');
            fetchUserLinkHistory();
        } else {
            historySection.classList.add('hidden');
        }
    }

    const targetSection = document.getElementById(sectionIdToShow);
    if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function attachShortenerListener() {
    const form = document.getElementById('shortener-form');
    if (!form) return;

    const longUrlInput = document.getElementById('long-url');
    const customSlugInput = document.getElementById('custom-slug');
    const resultBox = document.getElementById('result');
    const resultText = document.getElementById('short-url-text');
    const copyButton = document.getElementById('copy-button');
    const copyIcon = document.getElementById('copy-icon');
    const checkIcon = document.getElementById('check-icon');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        resultBox.style.display = 'block';
        resultText.textContent = 'Memproses...';
        copyButton.style.display = 'none';

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/shorten`, {
                method: 'POST',
                body: JSON.stringify({ original_url: longUrlInput.value, custom_slug: customSlugInput.value }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal mengambil data');

            resultBox.style.display = 'flex';
            copyButton.style.display = 'flex';
            resultText.textContent = data.short_url;
            longUrlInput.value = '';
            customSlugInput.value = '';
            fetchUserLinkHistory();

        } catch (error) {
            resultText.textContent = 'Gagal: ' + error.message;
            copyButton.style.display = 'none';
        }
    });

    if (copyButton) {
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(resultText.textContent).then(() => {
                copyIcon.style.display = 'none'; checkIcon.style.display = 'block';
                setTimeout(() => { copyIcon.style.display = 'block'; checkIcon.style.display = 'none'; }, 2000);
            });
        });
    }
}
function attachConverterListener() {
    const form = document.getElementById('converter-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const submitButton = form.querySelector('button');
        const messageDiv = document.getElementById('converter-message');
        messageDiv.textContent = 'Mengunggah dan mengonversi file, harap tunggu...';
        messageDiv.className = '';
        submitButton.disabled = true;

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/convert`, {
                method: 'POST', body: formData
            });

            if (!response.ok) {
                let errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || 'Gagal memproses file.');
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
            let fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'converted-file';

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none'; a.href = url; a.download = fileName;
            document.body.appendChild(a); a.click();
            window.URL.revokeObjectURL(url); a.remove();

            messageDiv.textContent = 'Konversi berhasil! File sedang diunduh.';
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
function attachImageMergerListener() {
    const form = document.getElementById('image-merger-form');
    if (!form) return;

    const messageDiv = document.getElementById('image-merger-message');
    const fileInput = document.getElementById('image-files-input');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (fileInput.files.length === 0) {
            messageDiv.textContent = 'Error: Silakan pilih setidaknya satu gambar.';
            messageDiv.className = 'error';
            return;
        }

        const formData = new FormData(form);
        const submitButton = form.querySelector('button');
        messageDiv.textContent = 'Mengunggah dan menggabungkan gambar...';
        messageDiv.className = '';
        submitButton.disabled = true;

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/convert/images-to-pdf`, {
                method: 'POST', body: formData
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Gagal memproses file.');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none'; a.href = url; a.download = 'hasil-gabungan.pdf';
            document.body.appendChild(a); a.click();
            window.URL.revokeObjectURL(url); a.remove();

            messageDiv.textContent = 'Berhasil! PDF Anda sedang diunduh.';
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
function attachQrCodeGeneratorListener() {
    const form = document.getElementById('qr-generator-form');
    if (!form) return;

    const qrText = document.getElementById('qr-text');
    const qrErrorLevel = document.getElementById('qr-error-level');
    const qrColorDark = document.getElementById('qr-color-dark');
    const qrColorLight = document.getElementById('qr-color-light');
    const qrCodeMessage = document.getElementById('qr-code-message');
    const qrCodeImage = document.getElementById('qr-code-image');
    const downloadQrButton = document.getElementById('download-qr-button');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        qrCodeMessage.textContent = 'Generating QR Code...';
        qrCodeMessage.className = '';
        qrCodeImage.style.display = 'none';
        downloadQrButton.style.display = 'none';

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/generate-qr`, {
                method: 'POST',
                body: JSON.stringify({
                    text: qrText.value,
                    level: qrErrorLevel.value,
                    colorDark: qrColorDark.value,
                    colorLight: qrColorLight.value
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to generate QR Code.');

            qrCodeMessage.textContent = data.message;
            qrCodeMessage.className = 'success';
            qrCodeImage.src = data.qrCodeImage;
            qrCodeImage.style.display = 'block';
            downloadQrButton.style.display = 'block';

        } catch (error) {
            qrCodeMessage.textContent = `Error: ${error.message}`;
            qrCodeMessage.className = 'error';
        }
    });

    downloadQrButton.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = qrCodeImage.src;
        link.download = `qrcode_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}
function attachImageCompressorListener() {
    const form = document.getElementById('image-compressor-form');
    if (!form) return;

    const imageInput = document.getElementById('image-compress-input');
    const qualityInput = document.getElementById('compress-quality');
    const qualityValueSpan = document.getElementById('compress-quality-value');
    const formatSelect = document.getElementById('compress-format');
    const messageDiv = document.getElementById('image-compressor-message');
    const compressedImagePreview = document.getElementById('compressed-image-preview');
    const originalSizeSpan = document.getElementById('original-image-size');
    const compressedSizeSpan = document.getElementById('compressed-image-size');
    const downloadButton = document.getElementById('download-compressed-button');

    qualityInput.addEventListener('input', () => {
        qualityValueSpan.textContent = `${qualityInput.value}%`;
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageDiv.textContent = 'Compressing image, please wait...';
        messageDiv.className = '';
        compressedImagePreview.style.display = 'none';
        downloadButton.style.display = 'none';
        originalSizeSpan.textContent = 'N/A';
        compressedSizeSpan.textContent = 'N/A';

        const file = imageInput.files[0];
        if (!file) {
            messageDiv.textContent = 'Please select an image file.';
            messageDiv.className = 'error';
            return;
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('quality', qualityInput.value);
        formData.append('format', formatSelect.value);

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/compress-image`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || 'Failed to compress image.');
            }

            const compressedBlob = await response.blob();
            const originalSize = response.headers.get('X-Original-Size');
            const compressedSize = response.headers.get('X-Compressed-Size');
            const outputFileName = `compressed-image.${formatSelect.value}`;

            originalSizeSpan.textContent = `${(originalSize / 1024).toFixed(2)} KB`;
            compressedSizeSpan.textContent = `${(compressedSize / 1024).toFixed(2)} KB`;

            const imageUrl = URL.createObjectURL(compressedBlob);
            compressedImagePreview.src = imageUrl;
            compressedImagePreview.style.display = 'block';

            downloadButton.onclick = () => {
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = outputFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
            downloadButton.style.display = 'block';
            messageDiv.textContent = 'Image compressed successfully!';
            messageDiv.className = 'success';

        } catch (error) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'error';
        }
    });
}
async function fetchUserLinkHistory() {
    const historyList = document.getElementById('link-history-list');
    const loadingMessage = document.getElementById('loading-history');
    if (!historyList || !loadingMessage) return;

    loadingMessage.textContent = 'Memuat riwayat...';
    loadingMessage.style.display = 'block';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/user/links`);
        if (!response.ok) throw new Error('Gagal mengambil riwayat.');
        const links = await response.json();
        historyList.innerHTML = '';
        if (links.length === 0) {
            loadingMessage.textContent = 'Anda belum memiliki riwayat tautan.';
            loadingMessage.style.display = 'block';
        } else {
            loadingMessage.style.display = 'none';
            links.forEach(link => renderUserLinkItem(link, historyList));
        }
    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
        loadingMessage.style.display = 'block';
    }
}
function setupAuthPage() {
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
            if (authTitle) authTitle.textContent = 'Registrasi';
            authMessage.textContent = ''; authMessage.className = '';
        });
    }
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            if (authTitle) authTitle.textContent = 'Login';
            authMessage.textContent = ''; authMessage.className = '';
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
                setTimeout(() => { window.location.href = 'index.html'; }, 1000);
            } catch (error) {
                authMessage.textContent = `Error: ${error.message}`;
                authMessage.className = 'error';
            }
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
    aboutButtons.forEach(button => button.addEventListener('click', e => { e.preventDefault(); openModal(); }));
    if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (event) => { if (event.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal(); });
}
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const menuOverlay = document.getElementById('menu-overlay');

    const toggleMenu = () => {
        if(hamburger) hamburger.classList.toggle('active');
        if(navLinks) navLinks.classList.toggle('active');
        if(menuOverlay) menuOverlay.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        document.documentElement.classList.toggle('menu-open');
    };

    if (hamburger) hamburger.addEventListener('click', toggleMenu);
    if (menuOverlay) menuOverlay.addEventListener('click', toggleMenu);
}
function setupAllPasswordToggles() {
    const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    const setupPasswordToggle = (toggleId, passwordId) => {
        const toggleElement = document.getElementById(toggleId);
        const passwordElement = document.getElementById(passwordId);
        if (toggleElement && passwordElement) {
            toggleElement.addEventListener('click', () => {
                const isPassword = passwordElement.type === 'password';
                passwordElement.type = isPassword ? 'text' : 'password';
                toggleElement.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
            });
        }
    };
    setupPasswordToggle('toggle-login-password', 'login-password');
    setupPasswordToggle('toggle-register-password', 'register-password');
    setupPasswordToggle('toggle-reset-password', 'reset-password');
    setupPasswordToggle('toggle-confirm-password', 'confirm-password');
}
function setupChatBubble() {
    const chatBubble = document.getElementById('chat-bubble');
    const openChatButton = document.getElementById('open-chat-button');
    const closeChatButton = document.getElementById('close-chat');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputText = document.getElementById('chat-input-text');
    const sendChatButton = document.getElementById('send-chat-button');

    if (!chatBubble || !openChatButton) return;

    openChatButton.addEventListener('click', () => {
        chatBubble.classList.remove('hidden');
        openChatButton.classList.add('hidden');
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    if (closeChatButton) {
        closeChatButton.addEventListener('click', () => {
            chatBubble.classList.add('hidden');
            openChatButton.classList.remove('hidden');
        });
    }
    
    if (sendChatButton) sendChatButton.addEventListener('click', sendMessage);
    if (chatInputText) chatInputText.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    async function sendMessage() {
        const userMessage = chatInputText.value.trim();
        if (userMessage === '') return;

        appendMessage(userMessage, 'user-message');
        chatInputText.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
        appendMessage('Mengetik...', 'ai-message', 'typing-indicator');

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/chat-with-ai`, {
                method: 'POST',
                body: JSON.stringify({ message: userMessage })
            });

            if (!response.ok) {
                 const error = await response.json().catch(() => ({error: "Gagal terhubung ke AI."}));
                 if (response.status === 401 || response.status === 403) {
                     throw new Error("Anda harus login untuk menggunakan fitur chat.");
                 }
                throw new Error(error.error);
            }

            const data = await response.json();
            removeTypingIndicator();
            appendMessage(data.reply || "Maaf, saya tidak mengerti.", 'ai-message');
        } catch (error) {
            console.error('Error sending message to AI:', error);
            removeTypingIndicator();
            appendMessage(`Error: ${error.message}`, 'ai-message');
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function appendMessage(text, ...types) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', ...types);
        messageElement.textContent = text;
        chatMessages.appendChild(messageElement);
    }

    function removeTypingIndicator() {
        const typingIndicator = chatMessages.querySelector('.typing-indicator');
        if (typingIndicator) typingIndicator.remove();
    }
}
function setupAccountManagement() {
    const form = document.getElementById('change-password-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;
        const messageDiv = document.getElementById('change-password-message');
        const submitButton = form.querySelector('button');

        messageDiv.className = '';
        messageDiv.textContent = '';

        if (newPassword !== confirmNewPassword) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Error: Password baru dan konfirmasi tidak cocok.';
            return;
        }

        submitButton.disabled = true;
        messageDiv.textContent = 'Memproses...';

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/user/change-password`, {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            messageDiv.className = 'success';
            messageDiv.textContent = data.message;
            form.reset();

        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = `Error: ${error.message}`;
        } finally {
            submitButton.disabled = false;
        }
    });
}
function setupDashboardTabs() {
    const dashboardNav = document.querySelector('.dashboard-nav');
    if (!dashboardNav) return;

    const tabButtons = dashboardNav.querySelectorAll('.dashboard-tab-button');
    const contentPanels = document.querySelectorAll('.dashboard-panel');

    dashboardNav.addEventListener('click', (e) => {
        const clickedButton = e.target.closest('.dashboard-tab-button');
        if (!clickedButton) return;

        tabButtons.forEach(button => button.classList.remove('active'));
        contentPanels.forEach(panel => panel.classList.remove('active'));

        clickedButton.classList.add('active');

        const targetPanelId = clickedButton.dataset.target;
        const targetPanel = document.getElementById(targetPanelId);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    });
}