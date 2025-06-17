// ===================================================================
// ==   FILE FINAL SCRIPT.JS (100% LENGKAP DAN UTUH)              ==
// ===================================================================
const API_BASE_URL = 'https://server-pribadi-hamdi-docker.onrender.com';

console.log(`Ekosistem Digital (Client Final) dimuat! Menghubungi API di: ${API_BASE_URL}`);

/* === FUNGSI GLOBAL === */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');

    // Cek status login umum untuk navigasi
    const loginLink = document.querySelector('a.login-button'); 
    if (token) {
        if(loginLink) {
            loginLink.textContent = 'Dasbor';
            loginLink.href = 'dashboard.html';
        }
    }

    // Pemicu logika berdasarkan halaman yang aktif
    if (document.body.contains(document.getElementById('dashboard-main'))) {
        setupDashboardPage(token);
    } else if (document.title.includes("Tools")) { 
        setupToolsPage(token);
    } else if (document.getElementById('login-form')) { 
        setupAuthPage();
    }
    
    // Setup elemen UI umum yang ada di semua halaman
    setupAboutModal();
    setupMobileMenu();
    setupAllPasswordToggles();
});

function decodeJwt(token) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
}

// ===================================
// === LOGIKA HALAMAN DASHBOARD    ===
// ===================================
function setupDashboardPage(token) {
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            window.location.href = 'index.html';
        });
    }
    populateUserInfo(token);
    checkUserRoleAndSetupAdminPanel(token);
}

function populateUserInfo(token) {
    const decodedToken = decodeJwt(token);
    if (decodedToken && decodedToken.email) {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = decodedToken.email;
        }
    }
}

async function checkUserRoleAndSetupAdminPanel(token) {
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
    if (!linkList || !loadingMessage) return;

    loadingMessage.textContent = 'Memuat semua tautan...';
    loadingMessage.style.display = 'block';

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


// ===================================
// === LOGIKA HALAMAN TOOLS        ===
// ===================================

function setupToolsPage(token) {
    const wrappers = [ 
        document.getElementById('shortener-wrapper'),
        document.getElementById('history-section'),
        document.getElementById('converter-wrapper'),
        document.getElementById('image-merger-wrapper'),
        document.getElementById('qr-generator-wrapper'),
        document.getElementById('image-compressor-wrapper'),
        document.getElementById('audio-cutter-wrapper')
    ];
    const loginPrompt = document.getElementById('login-prompt');
    const toolSelectionSection = document.querySelector('.tool-selection'); 

    wrappers.forEach(el => el && el.classList.add('hidden'));

    if (token) {
        if (loginPrompt) loginPrompt.classList.add('hidden');
        if (toolSelectionSection) toolSelectionSection.classList.remove('hidden');

        document.getElementById('show-shortener')?.addEventListener('click', () => showToolSection('shortener-wrapper', token));
        document.getElementById('show-converter')?.addEventListener('click', () => showToolSection('converter-wrapper', token));
        document.getElementById('show-image-merger')?.addEventListener('click', () => showToolSection('image-merger-wrapper', token));
        document.getElementById('show-qr-generator')?.addEventListener('click', () => showToolSection('qr-generator-wrapper', token));
        document.getElementById('show-image-compressor')?.addEventListener('click', () => showToolSection('image-compressor-wrapper', token));
        document.getElementById('show-audio-cutter')?.addEventListener('click', () => showToolSection('audio-cutter-wrapper', token));

        attachShortenerListener(token);
        attachConverterListener(token);
        attachImageMergerListener(token);
        attachQrCodeGeneratorListener(token);
        attachImageCompressorListener(token);
        attachAudioCutterListener(token);

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
                    if (outputFormatSelect.value === 'docx') {
                        outputFormatSelect.value = 'pdf'; 
                    }
                }
            } else {
                if (docxOption) {
                    docxOption.disabled = false;
                }
            }
        });
    }
}

function showToolSection(sectionIdToShow, token) {
    const allToolSections = [
        document.getElementById('shortener-wrapper'),
        document.getElementById('converter-wrapper'),
        document.getElementById('image-merger-wrapper'),
        document.getElementById('qr-generator-wrapper'),
        document.getElementById('image-compressor-wrapper'),
        document.getElementById('audio-cutter-wrapper')
    ];
    const historySection = document.getElementById('history-section'); 

    allToolSections.forEach(section => {
        if (section && section.id === sectionIdToShow) {
            section.classList.remove('hidden');
        } else {
            section?.classList.add('hidden');
        }
    });

    if (historySection) {
        if (sectionIdToShow === 'shortener-wrapper') {
            historySection.classList.remove('hidden');
            fetchUserLinkHistory(token); 
        } else {
            historySection.classList.add('hidden');
        }
    }

    const targetSection = document.getElementById(sectionIdToShow);
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function attachShortenerListener(token) {
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
            const response = await fetch(`${API_BASE_URL}/api/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ original_url: longUrlInput.value, custom_slug: customSlugInput.value }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal mengambil data');
            
            resultBox.style.display = 'flex';
            copyButton.style.display = 'flex';
            resultText.textContent = data.short_url;
            longUrlInput.value = '';
            customSlugInput.value = '';

            fetchUserLinkHistory(token); 

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

function attachConverterListener(token) {
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
            const response = await fetch(`${API_BASE_URL}/api/convert`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
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

function attachImageMergerListener(token) {
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
            const response = await fetch(`${API_BASE_URL}/api/convert/images-to-pdf`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
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

// === FUNGSI QR CODE GENERATOR CLIENT-SIDE LOGIC ===
function attachQrCodeGeneratorListener(token) {
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
            const response = await fetch(`${API_BASE_URL}/api/generate-qr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    text: qrText.value,
                    level: qrErrorLevel.value,
                    colorDark: qrColorDark.value,
                    colorLight: qrColorLight.value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate QR Code.');
            }

            qrCodeMessage.textContent = data.message;
            qrCodeMessage.className = 'success';
            qrCodeImage.src = data.qrCodeImage;
            qrCodeImage.style.display = 'block';
            downloadQrButton.style.display = 'block';

        } catch (error) {
            qrCodeMessage.textContent = `Error: ${error.message}`;
            qrCodeMessage.className = 'error';
            qrCodeImage.style.display = 'none';
            downloadQrButton.style.display = 'none';
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

// === FUNGSI IMAGE COMPRESSOR CLIENT-SIDE LOGIC ===
function attachImageCompressorListener(token) {
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

    // Update quality value display
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
            const response = await fetch(`${API_BASE_URL}/api/compress-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
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

            // Display original and compressed sizes
            originalSizeSpan.textContent = `${(originalSize / 1024).toFixed(2)} KB`;
            compressedSizeSpan.textContent = `${(compressedSize / 1024).toFixed(2)} KB`;

            // Display compressed image preview
            const imageUrl = URL.createObjectURL(compressedBlob);
            compressedImagePreview.src = imageUrl;
            compressedImagePreview.style.display = 'block';

            // Enable download button
            downloadButton.onclick = () => {
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = outputFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(imageUrl);
            };
            downloadButton.style.display = 'block';

            messageDiv.textContent = 'Image compressed successfully!';
            messageDiv.className = 'success';

        } catch (error) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'error';
            compressedImagePreview.style.display = 'none';
            downloadButton.style.display = 'none';
        }
    });
}

// === FUNGSI AUDIO CUTTER CLIENT-SIDE LOGIC (dengan WaveSurfer.js) ===
function attachAudioCutterListener(token) {
    const form = document.getElementById('audio-cutter-form');
    if (!form) return;

    const audioInput = document.getElementById('audio-input');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const audioFileInfo = document.getElementById('audio-file-info');
    const waveformContainer = document.getElementById('waveform');
    const playPauseButton = document.getElementById('waveform-play-pause-button');
    const stopButton = document.getElementById('waveform-stop-button');
    const cutAudioSubmitButton = form.querySelector('button[type="submit"]'); // Tombol "Cut Audio"
    const messageDiv = document.getElementById('audio-cutter-message');
    const cutAudioPreview = document.getElementById('cut-audio-preview');
    const downloadButton = document.getElementById('download-cut-audio-button');

    let wavesurfer = null;
    let currentRegion = null; // Untuk menyimpan region yang sedang dipilih

    // Inisialisasi WaveSurfer.js saat audio cutter section pertama kali ditampilkan
    // atau ketika ada file baru yang dipilih
    const initializeWaveSurfer = () => {
        if (wavesurfer) {
            wavesurfer.destroy(); // Hancurkan instance lama jika ada
        }
        wavesurfer = WaveSurfer.create({
            container: waveformContainer,
            waveColor: 'rgba(0, 245, 160, 0.5)', // Warna gelombang utama (accent-color transparan)
            progressColor: 'var(--accent-color)', // Warna progres (accent-color penuh)
            cursorColor: 'var(--text-muted-color)', // Warna kursor
            barWidth: 2,
            barRadius: 2,
            barGap: 1,
            height: 120,
            backend: 'WebAudio', // Menggunakan Web Audio API
            responsive: true,
            plugins: [
                WaveSurfer.Regions.create({
                    regionsMinLength: 0.1, // Minimal panjang region
                    regions: [
                        // Contoh region awal (opsional)
                        // {
                        //     start: 0,
                        //     end: 10,
                        //     loop: false,
                        //     color: 'rgba(255, 0, 0, 0.1)',
                        //     drag: true,
                        //     resize: true,
                        // }
                    ],
                    dragSelection: { // Memungkinkan pemilihan dengan drag
                        slop: 5,
                        opacity: 0.2,
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                })
            ]
        });

        // Event listener untuk WaveSurfer
        wavesurfer.on('ready', () => {
            const duration = wavesurfer.getDuration();
            audioFileInfo.textContent = `File: "${audioInput.files[0].name}" | Duration: ${formatTime(duration)}`;
            endTimeInput.value = duration.toFixed(1); // Set end time to full duration by default
            startTimeInput.value = 0; // Set start time to 0 by default

            // Buat region default mencakup seluruh audio
            if (wavesurfer.regions.list && Object.keys(wavesurfer.regions.list).length === 0) {
                currentRegion = wavesurfer.regions.add({
                    start: 0,
                    end: duration,
                    loop: false,
                    color: 'rgba(0, 255, 0, 0.1)', // Warna region default
                    drag: true,
                    resize: true,
                    id: 'default-region'
                });
            }
            cutAudioSubmitButton.disabled = false; // Aktifkan tombol cut setelah audio siap
        });

        wavesurfer.on('error', (err) => {
            messageDiv.textContent = `WaveSurfer Error: ${err.message}`;
            messageDiv.className = 'error';
            console.error('WaveSurfer error:', err);
            cutAudioSubmitButton.disabled = true; // Nonaktifkan jika ada error
        });

        // Event listener untuk regions (saat region dibuat, diubah, atau diklik)
        wavesurfer.on('region-updated', (region) => {
            currentRegion = region;
            startTimeInput.value = region.start.toFixed(1);
            endTimeInput.value = region.end.toFixed(1);
        });

        // Region created on drag selection
        wavesurfer.on('region-created', (region) => {
            // Hapus region sebelumnya jika ada untuk memastikan hanya ada satu yang aktif
            Object.values(wavesurfer.regions.list).forEach(r => {
                if (r.id !== region.id) {
                    wavesurfer.regions.remove(r.id);
                }
            });
            currentRegion = region;
            startTimeInput.value = region.start.toFixed(1);
            endTimeInput.value = region.end.toFixed(1);
        });

        // Saat region diklik, putar segmen tersebut
        wavesurfer.on('region-click', (region, mouseEvent) => {
            mouseEvent.stopPropagation(); // Mencegah klik pada region memicu klik pada WaveSurfer itu sendiri
            region.play();
            messageDiv.textContent = `Playing selected region...`;
            messageDiv.className = '';
        });

        wavesurfer.on('region-out', (region) => {
            // Jika pemutaran region selesai, atau kursor keluar dari region yang diputar, stop
            if (region.isPlaying()) {
                wavesurfer.stop();
            }
        });

        // Synchronize manual input with region
        const updateRegionFromInputs = () => {
            if (currentRegion) {
                const newStart = parseFloat(startTimeInput.value);
                const newEnd = parseFloat(endTimeInput.value);

                if (!isNaN(newStart) && !isNaN(newEnd) && newStart < newEnd && newEnd <= wavesurfer.getDuration()) {
                    currentRegion.update({ start: newStart, end: newEnd });
                }
            }
        };

        startTimeInput.addEventListener('change', updateRegionFromInputs);
        endTimeInput.addEventListener('change', updateRegionFromInputs);
    };


    // Helper to format seconds into MM:SS
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Fungsi untuk memuat file audio ke WaveSurfer.js
    audioInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            audioFileInfo.textContent = '';
            // Hancurkan wavesurfer jika tidak ada file
            if (wavesurfer) {
                wavesurfer.destroy();
                wavesurfer = null;
            }
            cutAudioSubmitButton.disabled = true;
            cutAudioPreview.pause();
            cutAudioPreview.src = '';
            cutAudioPreview.style.display = 'none';
            downloadButton.style.display = 'none';
            return;
        }

        audioFileInfo.textContent = `Loading "${file.name}"...`;
        cutAudioSubmitButton.disabled = true; // Disable cut button while loading

        initializeWaveSurfer(); // Inisialisasi ulang WaveSurfer.js
        wavesurfer.loadBlob(file); // Muat file dari Blob
    });

    // Kontrol pemutaran WaveSurfer.js
    playPauseButton.addEventListener('click', () => {
        if (wavesurfer) {
            wavesurfer.playPause();
        }
    });

    stopButton.addEventListener('click', () => {
        if (wavesurfer) {
            wavesurfer.stop();
        }
    });

    // Handler form submit untuk memotong audio (tetap sama, mengambil dari input fields)
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageDiv.textContent = 'Cutting audio, please wait...';
        messageDiv.className = '';
        cutAudioPreview.style.display = 'none';
        downloadButton.style.display = 'none';
        
        // Stop any playing audio before cutting
        if (wavesurfer) {
            wavesurfer.stop();
        }

        const file = audioInput.files[0];
        if (!file) {
            messageDiv.textContent = 'Please select an audio file.';
            messageDiv.className = 'error';
            return;
        }

        const startTime = parseFloat(startTimeInput.value);
        const endTime = parseFloat(endTimeInput.value);

        if (isNaN(startTime) || isNaN(endTime) || startTime < 0 || endTime <= startTime || endTime > wavesurfer.getDuration()) { // Gunakan wavesurfer.getDuration()
            messageDiv.textContent = 'Invalid start/end time. Please ensure End Time is greater than Start Time and within total duration.';
            messageDiv.className = 'error';
            return;
        }

        const formData = new FormData();
        formData.append('audio', file);
        formData.append('startTime', startTime);
        formData.append('endTime', endTime);

        try {
            const response = await fetch(`${API_BASE_URL}/api/cut-audio`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || 'Failed to cut audio.');
            }

            const audioBlob = await response.blob();
            const fileName = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || `cut_audio.${file.name.split('.').pop() || 'mp3'}`;

            const audioUrl = URL.createObjectURL(audioBlob);
            cutAudioPreview.src = audioUrl;
            cutAudioPreview.style.display = 'block';
            
            downloadButton.onclick = () => {
                const link = document.createElement('a');
                link.href = audioUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(audioUrl);
            };
            downloadButton.style.display = 'block';

            messageDiv.textContent = 'Audio cut successfully! Preview available.';
            messageDiv.className = 'success';

        } catch (error) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'error';
            cutAudioPreview.style.display = 'none';
            downloadButton.style.display = 'none';
            console.error("Audio Cutter Frontend Error:", error);
        }
    });
}


async function fetchUserLinkHistory(token) {
    const historyList = document.getElementById('link-history-list');
    const loadingMessage = document.getElementById('loading-history');
    if (!historyList || !loadingMessage) return;

    loadingMessage.textContent = 'Memuat riwayat...';
    loadingMessage.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE_URL}/api/user/links`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Gagal mengambil riwayat.');
        const links = await response.json();
        historyList.innerHTML = ''; 
        if (links.length === 0) {
            loadingMessage.textContent = 'Anda belum memiliki riwayat tautan.';
            loadingMessage.style.display = 'block';
        } else {
            loadingMessage.style.display = 'none';
            links.forEach(link => renderUserLinkItem(link, historyList, token)); 
        }
    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
        loadingMessage.style.display = 'block';
    }
}

// Tambahkan definisi ikon SVG
const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

// Fungsi baru untuk merender item tautan pengguna dengan tombol hapus
function renderUserLinkItem(link, container, token) {
    const shortUrl = `https://link.hamdirzl.my.id/${link.slug}`;
    const listItem = document.createElement('li');
    listItem.className = 'mood-item';
    listItem.id = `user-link-${link.slug}`; 

    listItem.innerHTML = `
        <div class="mood-item-header">
            <strong>${shortUrl}</strong>
            <div class="mood-item-actions">
                <button class="mood-icon-button copy-history-btn" data-url="${shortUrl}" aria-label="Salin tautan">${copyIconSvg}</button>
                <button class="mood-icon-button delete-user-link-btn delete-button" data-slug="${link.slug}" aria-label="Hapus tautan">${trashIconSvg}</button>
            </div>
        </div>
        <p class="mood-notes">URL Asli: <a href="${link.original_url}" target="_blank">${link.original_url}</a></p>
        <small class="mood-date">Dibuat pada: ${new Date(link.created_at).toLocaleString('id-ID')}</small>
    `;
    container.appendChild(listItem);

    listItem.querySelector('.copy-history-btn').addEventListener('click', (e) => {
        navigator.clipboard.writeText(e.currentTarget.dataset.url).then(() => {
            const originalSvg = e.currentTarget.innerHTML;
            e.currentTarget.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f5a0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check"><polyline points="20 6 9 17 4 12"></polyline></svg>`; 
            setTimeout(() => { e.currentTarget.innerHTML = originalSvg; }, 2000);
        });
    });

    listItem.querySelector('.delete-user-link-btn').addEventListener('click', (e) => handleDeleteUserLink(e, token));
}

// ==========================================================
// === FUNGSI BARU: HAPUS TAUTAN PENGGUNA                 ===
// ==========================================================
async function handleDeleteUserLink(event, token) {
    const slugToDelete = event.currentTarget.dataset.slug;
    
    if (!confirm(`Anda yakin ingin menghapus tautan ${slugToDelete} dari riwayat Anda?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/user/links/${slugToDelete}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Gagal menghapus tautan dari riwayat.');
        }

        alert(data.message);
        // Hapus item dari DOM setelah berhasil dihapus dari server
        const listItemToRemove = document.getElementById(`user-link-${slugToDelete}`);
        if (listItemToRemove) {
            listItemToRemove.remove();
        }
        
        // Periksa apakah daftar kosong setelah penghapusan terakhir
        const historyList = document.getElementById('link-history-list');
        const loadingMessage = document.getElementById('loading-history');
        if (historyList && historyList.children.length === 0) {
            loadingMessage.textContent = 'Anda belum memiliki riwayat tautan.';
            loadingMessage.style.display = 'block';
        }

    } catch (error) {
        alert(`Error: ${error.message}`);
        console.error('Error deleting user link:', error);
    }
}


// ==========================================================
// ===         LOGIKA UNTUK HALAMAN AUTENTIKASI           ===
// ==========================================================
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
            if(authTitle) authTitle.textContent = 'Registrasi';
            authMessage.textContent = ''; authMessage.className = '';
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            if(authTitle) authTitle.textContent = 'Login';
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

// ==========================================================
// ===         LOGIKA UNTUK LUPA & RESET PASSWORD         ===
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


// ==========================================================
// ===         LOGIKA UNTUK ELEMEN UI UMUM                ===
// ==========================================================
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    let navCloseButton = document.getElementById('nav-close-button');
    if (!navCloseButton) {
        navCloseButton = document.createElement('button');
        navCloseButton.id = 'nav-close-button';
        navCloseButton.classList.add('nav-close-button');
        navCloseButton.setAttribute('aria-label', 'Tutup menu');
        navCloseButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        navLinks.prepend(navCloseButton);
    }

    const toggleMenu = () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.classList.toggle('menu-open'); 
        document.documentElement.classList.toggle('menu-open'); 
    };

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', toggleMenu);
    }

    if (navCloseButton) {
        navCloseButton.addEventListener('click', toggleMenu);
    }

    if (navLinks) {
        navLinks.addEventListener('click', (event) => {
            if (event.target === navLinks) {
                toggleMenu();
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

    aboutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    });
    
    if (modalCloseButton) {
        modalCloseButton.addEventListener('click', closeModal);
    }
    
modalOverlay.addEventListener('click', (event) => { 
        if (event.target === modalOverlay) closeModal(); 
    });
    
    document.addEventListener('keydown', (event) => { 
        if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal(); 
    });
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