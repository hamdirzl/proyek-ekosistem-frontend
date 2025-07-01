// js/modules/tools.js
// Mengelola semua logika untuk halaman 'Tools' dan setiap tool individu.

import { API_BASE_URL } from '../config.js';
import { fetchWithAuth } from '../utils/auth.js';
import { loadScript, setupCustomFileInputs, setupCustomDropdowns } from '../utils/ui.js';

// --- URL Shortener ---
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
            const response = await fetch(`${API_BASE_URL}/api/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_url: longUrlInput.value, custom_slug: customSlugInput.value }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal mengambil data');

            resultBox.style.display = 'flex';
            copyButton.style.display = 'flex';
            resultText.textContent = data.short_url;
            longUrlInput.value = '';
            customSlugInput.value = '';

            if (localStorage.getItem('jwt_refresh_token')) {
                fetchUserLinkHistory();
            }

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

function renderUserLinkItem(link, container) {
    const shortUrl = `https://link.hamdirzl.my.id/${link.slug}`;
    const listItem = document.createElement('li');
    listItem.className = 'mood-item';
    listItem.id = `user-link-${link.slug}`;
    const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

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

    listItem.querySelector('.delete-user-link-btn').addEventListener('click', (e) => handleDeleteUserLink(e));
}

async function handleDeleteUserLink(event) {
    const button = event.currentTarget;
    const slugToDelete = button.dataset.slug;
    if (!confirm(`Anda yakin ingin menghapus tautan ${slugToDelete} dari riwayat Anda?`)) return;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/user/links/${slugToDelete}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal menghapus tautan dari riwayat.');

        alert(data.message);
        const listItemToRemove = document.getElementById(`user-link-${slugToDelete}`);
        if (listItemToRemove) listItemToRemove.remove();

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

export function setupUrlShortenerPage() {
    attachShortenerListener();
    if (localStorage.getItem('jwt_refresh_token')) {
        const historySection = document.getElementById('history-section');
        if (historySection) {
            historySection.classList.remove('hidden');
            fetchUserLinkHistory();
        }
    }
}

// --- Media Converter ---
function attachConverterListener() {
    const form = document.getElementById('converter-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const submitButton = form.querySelector('button');
        const messageDiv = document.getElementById('converter-message');
        const progressWrapper = document.getElementById('converter-progress-wrapper');
        const progressBarContainer = document.getElementById('converter-progress-wrapper').querySelector('.progress-bar');
        const progressText = progressWrapper.querySelector('.progress-bar-text');

        messageDiv.textContent = '';
        messageDiv.className = '';
        progressWrapper.classList.remove('hidden');
        submitButton.disabled = true;

        progressBarContainer.classList.add('indeterminate');
        progressText.textContent = 'Uploading file, please wait...';

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/api/convert`, true);
        xhr.responseType = 'blob';

        xhr.onload = function () {
            progressBarContainer.classList.remove('indeterminate');

            if (this.status === 200) {
                progressText.textContent = 'Konversi berhasil! File sedang diunduh.';
                const contentDisposition = xhr.getResponseHeader('content-disposition');
                let fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'converted-file';

                const blob = this.response;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none'; a.href = url; a.download = fileName;
                document.body.appendChild(a); a.click();
                window.URL.revokeObjectURL(url); a.remove();

                form.reset();
                document.getElementById('file-count-label').textContent = '';
                setupCustomDropdowns(); // Reset dropdown visual

            } else {
                try {
                    const reader = new FileReader();
                    reader.onload = function() {
                       const errorResult = JSON.parse(this.result);
                       messageDiv.textContent = `Error: ${errorResult.error || 'Gagal memproses file.'}`;
                       messageDiv.className = 'error';
                    }
                    reader.readAsText(this.response);
                } catch (e) {
                     messageDiv.textContent = `Error: Terjadi kesalahan pada server (Status: ${this.status}).`;
                     messageDiv.className = 'error';
                }
            }

            setTimeout(() => progressWrapper.classList.add('hidden'), 3000);
            submitButton.disabled = false;
        };

        xhr.onerror = function () {
            progressBarContainer.classList.remove('indeterminate');
            messageDiv.textContent = 'Error: Terjadi kesalahan jaringan.';
            messageDiv.className = 'error';
            progressWrapper.classList.add('hidden');
            submitButton.disabled = false;
        };

        xhr.send(formData);
    });
}

export function setupMediaConverterPage() {
    attachConverterListener();
    setupCustomFileInputs();
    setupCustomDropdowns();

    const fileInput = document.getElementById('file-input');
    const outputFormatSelect = document.getElementById('output-format');

    const conversionOptions = {
        'default': [
            { value: 'pdf', text: 'PDF' },
            { value: 'docx', text: 'DOCX (Word Document)' },
        ],
        'pdf': [
            { value: 'docx', text: 'DOCX (Word - Kualitas Terbaik)' },
            { value: 'txt', text: 'TXT (Teks Polos)' },
            { value: 'jpg', text: 'JPG (Setiap halaman jadi gambar)' }
        ],
        'docx': [{ value: 'pdf', text: 'PDF' }, { value: 'txt', text: 'TXT' }],
        'pptx': [{ value: 'pdf', text: 'PDF' }],
        'jpg': [{ value: 'png', text: 'PNG' }, { value: 'pdf', text: 'PDF' }],
        'png': [{ value: 'jpg', text: 'JPG' }, { value: 'pdf', text: 'PDF' }]
    };

    if (fileInput && outputFormatSelect) {
        fileInput.addEventListener('change', () => {
            if (!fileInput.files || fileInput.files.length === 0) return;
            const fileName = fileInput.files[0].name.toLowerCase();
            const extension = fileName.split('.').pop();
            const options = conversionOptions[extension] || conversionOptions['default'];

            outputFormatSelect.innerHTML = '';
            options.forEach(opt => {
                const optionElement = document.createElement('option');
                optionElement.value = opt.value;
                optionElement.textContent = opt.text;
                outputFormatSelect.appendChild(optionElement);
            });

            // Re-initialize custom dropdown setelah opsi diubah
            setupCustomDropdowns();
        });
    }
}

// --- QR Code Generator ---
export function attachQrCodeGeneratorListener() {
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
                headers: { 'Content-Type': 'application/json' },
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

// --- Image Compressor ---
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
            const response = await fetch(`${API_BASE_URL}/api/compress-image`, {
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

export function setupImageCompressorPage() {
    attachImageCompressorListener();
    setupCustomFileInputs();
    setupCustomDropdowns();
}

// --- Images to PDF ---
export function attachImagesToPdfListener() {
    const form = document.getElementById('images-to-pdf-form');
    if (!form) return;

    const previewsContainer = document.getElementById('image-previews-container');
    const prevBtn = document.getElementById('prev-preview-btn');
    const nextBtn = document.getElementById('next-preview-btn');
    const sliderContainer = document.querySelector('.preview-slider-container');
    const fabButton = document.getElementById('toggle-pdf-options-btn');

    const imageInput = document.getElementById('images-to-pdf-input');
    const fileCountLabel = document.getElementById('file-count-label');
    const messageDiv = document.getElementById('images-to-pdf-message');
    const progressWrapper = document.getElementById('images-to-pdf-progress-wrapper');
    const submitButton = form.querySelector('button[type="submit"]');
    const pageSizeSelect = document.getElementById('page-size');

    let selectedFiles = [];
    let currentSlideIndex = 0;

    if (fabButton) {
        fabButton.classList.add('hidden');
    }

    const updateAllPreviewsLayout = () => {
        const orientation = form.querySelector('input[name="orientation"]:checked').value;
        const marginChoice = form.querySelector('input[name="margin"]:checked').value;
        document.querySelectorAll('.preview-page').forEach(page => {
            page.classList.remove('portrait', 'landscape', 'margin-small', 'margin-big');
            page.classList.add(orientation);
            if (marginChoice === 'small') page.classList.add('margin-small');
            else if (marginChoice === 'big') page.classList.add('margin-big');
        });
    };

    form.querySelectorAll('input[name="orientation"], input[name="margin"]').forEach(radio => radio.addEventListener('change', updateAllPreviewsLayout));
    if (pageSizeSelect) pageSizeSelect.addEventListener('change', updateAllPreviewsLayout);

    const updateNavButtons = () => {
        if (!prevBtn || !nextBtn) return;
        if (selectedFiles.length <= 2 || window.innerWidth <= 768) {
            prevBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
            return;
        }

        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
        prevBtn.disabled = currentSlideIndex === 0;
        nextBtn.disabled = currentSlideIndex >= selectedFiles.length - 2;
    };

    const goToSlide = (index) => {
        if (!previewsContainer.firstChild || !sliderContainer) return;

        const firstCard = previewsContainer.querySelector('.image-preview-card');
        if (!firstCard) return;

        const gapStyle = window.getComputedStyle(previewsContainer).getPropertyValue('gap');
        const gap = parseFloat(gapStyle) || 24;
        const slideWidth = firstCard.offsetWidth + gap;

        sliderContainer.scrollLeft = index * slideWidth;
        currentSlideIndex = index;
        updateNavButtons();
    };

    const updatePreviews = () => {
        previewsContainer.innerHTML = '';

        if (fileCountLabel) {
            if (selectedFiles.length > 0) {
                fileCountLabel.textContent = `${selectedFiles.length} gambar telah dipilih.`;
            } else {
                fileCountLabel.textContent = '';
            }
        }

        if (fabButton) {
            if (selectedFiles.length > 0) {
                fabButton.classList.remove('hidden');
            } else {
                fabButton.classList.add('hidden');
            }
        }

        if (selectedFiles.length === 0) {
            goToSlide(0);
            return;
        }

        const currentOrientation = form.querySelector('input[name="orientation"]:checked').value;
        const currentMargin = form.querySelector('input[name="margin"]:checked').value;
        let pageClasses = `preview-page ${currentOrientation}`;
        if (currentMargin === 'small') pageClasses += ' margin-small';
        else if (currentMargin === 'big') pageClasses += ' margin-big';

        let loadedImages = 0;
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewCard = document.createElement('div');
                previewCard.className = 'image-preview-card';
                previewCard.innerHTML = `
                    <div class="${pageClasses}">
                        <img src="${e.target.result}" alt="${file.name}">
                    </div>
                    <button type="button" class="remove-btn" data-index="${index}" title="Hapus gambar">&times;</button>
                `;
                previewsContainer.appendChild(previewCard);
                previewCard.querySelector('.remove-btn').addEventListener('click', (event) => {
                    const idxToRemove = parseInt(event.target.dataset.index, 10);
                    selectedFiles.splice(idxToRemove, 1);
                    updatePreviews();
                });

                loadedImages++;
                if (loadedImages === selectedFiles.length) {
                    goToSlide(0);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    imageInput.addEventListener('change', () => {
        selectedFiles.push(...Array.from(imageInput.files));
        imageInput.value = '';
        updatePreviews();
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (currentSlideIndex < selectedFiles.length - 2) {
            goToSlide(currentSlideIndex + 1);
        }
    });

    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (currentSlideIndex > 0) {
            goToSlide(currentSlideIndex - 1);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        form.classList.remove('options-active');

        if (selectedFiles.length === 0) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Silakan pilih setidaknya satu gambar.';
            return;
        }
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('images', file));
        formData.append('pageSize', pageSizeSelect.value);
        formData.append('orientation', form.querySelector('input[name="orientation"]:checked').value);
        formData.append('marginChoice', form.querySelector('input[name="margin"]:checked').value);
        submitButton.disabled = true;
        messageDiv.textContent = '';
        messageDiv.className = '';
        progressWrapper.classList.remove('hidden');
        const progressBarContainer = progressWrapper.querySelector('.progress-bar');
        const progressText = progressWrapper.querySelector('.progress-bar-text');
        progressBarContainer.classList.add('indeterminate');
        progressText.textContent = 'Mengonversi gambar ke PDF, harap tunggu...';
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/api/images-to-pdf`, true);
        xhr.responseType = 'blob';
        xhr.onload = function() {
            progressBarContainer.classList.remove('indeterminate');
            if (this.status === 200) {
                messageDiv.className = 'success';
                progressText.textContent = 'Konversi berhasil! Mengunduh file...';
                const header = this.getResponseHeader('Content-Disposition');
                let filename = 'converted.pdf';
                if(header) {
                    const parts = header.split(';');
                    parts.forEach(part => {
                        if (part.trim().startsWith('filename=')) {
                            filename = part.split('=')[1].replace(/"/g, '');
                        }
                    });
                }
                const url = window.URL.createObjectURL(this.response);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                selectedFiles = [];
                updatePreviews();
                form.reset();
                updateAllPreviewsLayout();
            } else {
                messageDiv.className = 'error';
                messageDiv.textContent = 'Error: Gagal membuat PDF.';
            }
            setTimeout(() => {
                progressWrapper.classList.add('hidden');
                messageDiv.textContent = '';
            }, 4000);
            submitButton.disabled = false;
        };
        xhr.onerror = function() {
            progressBarContainer.classList.remove('indeterminate');
            messageDiv.className = 'error';
            messageDiv.textContent = 'Error: Terjadi kesalahan jaringan.';
            progressWrapper.classList.add('hidden');
            submitButton.disabled = false;
        };
        xhr.send(formData);
    });

    const optionsPanel = form.querySelector('.pdf-tool-options');
    const backButton = document.getElementById('back-to-previews-btn');
    const overlay = form.querySelector('.pdf-options-overlay');

    const openOptions = () => form.classList.add('options-active');
    const closeOptions = () => form.classList.remove('options-active');

    if (fabButton) fabButton.addEventListener('click', openOptions);
    if (backButton) backButton.addEventListener('click', closeOptions);
    if (overlay) overlay.addEventListener('click', closeOptions);
}

// --- Split PDF ---
export async function setupSplitPdfPage() {
    const form = document.getElementById('pdf-split-form');
    if (!form) return;

    const fileInput = document.getElementById('pdf-split-input');
    const fileInfo = document.getElementById('pdf-file-info');
    const previewContainer = document.getElementById('pdf-preview-container');
    const hiddenRangesInput = document.getElementById('pdf-ranges');
    const messageDiv = document.getElementById('split-pdf-message');
    const submitButton = form.querySelector('button[type="submit"]');
    const addRangeBtn = document.getElementById('add-range-btn');
    const rangeInputsWrapper = document.getElementById('range-inputs-wrapper');

    let totalPages = 0;

    // ----- UI SETUP -----
    submitButton.disabled = true;
    fileInput.disabled = true;
    if (addRangeBtn) {
        addRangeBtn.style.display = 'none';
    }
    previewContainer.innerHTML = '<p>Mempersiapkan alat PDF, mohon tunggu...</p>';

    try {
        await loadScript('../js/lib/pdf.min.js');
        
        if (window.pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `../js/lib/pdf.worker.min.js`;
        } else {
            throw new Error("Objek pdfjsLib tidak ditemukan. Pastikan file pdf.min.js sudah tersimpan di js/lib/");
        }

        previewContainer.innerHTML = '<p>Silakan pilih file PDF untuk memulai.</p>';
        fileInput.disabled = false;

    } catch (error) {
        console.error("Gagal memuat komponen PDF.js:", error);
        previewContainer.innerHTML = `<p style="color:red;">Gagal memuat komponen PDF. Pastikan file sudah disimpan dengan benar. Error: ${error.message}</p>`;
        return;
    }

    const updateFinalRangeString = () => {
        const ranges = [];
        const rangeGroups = rangeInputsWrapper.querySelectorAll('.range-group');
        rangeGroups.forEach(group => {
            const from = group.querySelector('.range-from').value;
            const to = group.querySelector('.range-to').value;
            if (from && to && parseInt(from) <= parseInt(to)) {
                ranges.push(from === to ? from : `${from}-${to}`);
            } else if (from && !to) {
                ranges.push(from);
            }
        });
        hiddenRangesInput.value = ranges.join(', ');
        submitButton.disabled = ranges.length === 0;
    };

    const addRangeRow = (fromVal = '', toVal = '') => {
        const rangeCount = rangeInputsWrapper.children.length + 1;
        const newRangeGroup = document.createElement('div');
        newRangeGroup.className = 'range-group';
        newRangeGroup.innerHTML = `
            <span class="range-label">Range ${rangeCount}</span>
            <div class="range-input-wrapper">
                <input type="number" class="range-from" placeholder="Dari" min="1" max="${totalPages}" value="${fromVal}">
                <span>-</span>
                <input type="number" class="range-to" placeholder="Ke" min="1" max="${totalPages}" value="${toVal || fromVal}">
            </div>
            <button type="button" class="remove-range-btn" title="Hapus rentang">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        `;
        rangeInputsWrapper.appendChild(newRangeGroup);
        
        newRangeGroup.querySelector('.remove-range-btn').addEventListener('click', () => {
            newRangeGroup.remove();
            rangeInputsWrapper.querySelectorAll('.range-group').forEach((group, index) => {
                group.querySelector('.range-label').textContent = `Range ${index + 1}`;
            });
            updateFinalRangeString();
        });
        newRangeGroup.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', updateFinalRangeString);
        });
        updateFinalRangeString();
    };
    
    async function renderPDF(file) {
        previewContainer.innerHTML = '<p>Memuat pratinjau...</p>';
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const loadingTask = pdfjsLib.getDocument({ data: event.target.result });
                const pdfDoc = await loadingTask.promise;
                totalPages = pdfDoc.numPages;
                fileInfo.textContent = `${file.name} (${totalPages} halaman)`;
                previewContainer.innerHTML = '';
                if(addRangeBtn) addRangeBtn.style.display = 'inline-flex';
                
                for (let i = 1; i <= totalPages; i++) {
                    const page = await pdfDoc.getPage(i);
                    const viewport = page.getViewport({ scale: 0.5 });
                    
                    const previewCard = document.createElement('div');
                    previewCard.className = 'pdf-page-preview';
                    previewCard.dataset.page = i;

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    const pageNumberLabel = document.createElement('span');
                    pageNumberLabel.className = 'page-number';
                    pageNumberLabel.textContent = `Halaman ${i}`;

                    previewCard.appendChild(canvas);
                    previewCard.appendChild(pageNumberLabel);
                    previewContainer.appendChild(previewCard);

                    await page.render({ canvasContext: context, viewport: viewport }).promise;

                    previewCard.addEventListener('click', () => {
                        addRangeRow(i, i);
                    });
                }
                if(rangeInputsWrapper.children.length === 0){
                    addRangeRow(1, totalPages);
                }
            } catch (error) {
                console.error('Error saat merender PDF:', error);
                previewContainer.innerHTML = `<p style="color:red;">Gagal memuat pratinjau. File PDF mungkin rusak atau dilindungi password.</p>`;
                fileInfo.textContent = 'Gagal memuat file.';
                if(addRangeBtn) addRangeBtn.style.display = 'none';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    if(addRangeBtn) {
        addRangeBtn.addEventListener('click', () => addRangeRow());
    }

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file && file.type === 'application/pdf') {
            rangeInputsWrapper.innerHTML = ''; 
            messageDiv.textContent = '';
            messageDiv.className = '';
            renderPDF(file);
            updateFinalRangeString();
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        updateFinalRangeString(); 
        
        if (!fileInput.files[0]) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Silakan pilih file PDF terlebih dahulu.';
            return;
        }
        if (!hiddenRangesInput.value.trim()) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Silakan tentukan setidaknya satu rentang halaman yang valid.';
            return;
        }

        const formData = new FormData(form);
        formData.delete('range-from'); 
        formData.delete('range-to');

        messageDiv.className = '';
        messageDiv.textContent = 'Memproses pemisahan PDF...';
        submitButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/api/split-pdf`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Terjadi kesalahan di server.');
            }

            const blob = await response.blob();
            const header = response.headers.get('Content-Disposition');
            const filename = header ? header.split('filename=')[1].replace(/"/g, '') : 'split.zip';
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            messageDiv.className = 'success';
            messageDiv.textContent = 'PDF berhasil dipisah dan diunduh!';

        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = `Error: ${error.message}`;
        } finally {
            submitButton.disabled = false;
        }
    });
}

// --- Tools Main Page ---
export async function setupToolsPage() {
    const container = document.getElementById('top-tools-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/tools/stats`);
        if (!response.ok) {
            throw new Error('Gagal memuat data statistik dari server.');
        }

        const topTools = await response.json();
        container.innerHTML = ''; // Kosongkan pesan "Memuat..."

        if (topTools.length === 0) {
            container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: var(--text-muted-color);">Belum ada data penggunaan tool. Coba gunakan beberapa tool terlebih dahulu.</p>';
            return;
        }

        topTools.forEach(tool => {
            const toolLink = document.createElement('a');
            toolLink.href = tool.href;
            toolLink.className = 'tool-pill';
            
            toolLink.innerHTML = `
                <span class="tool-pill-name">${tool.name}</span>
                <span class="tool-pill-count">${tool.count.toLocaleString('id-ID')}</span>
            `;
            
            container.appendChild(toolLink);
        });

    } catch (error) {
        console.error('Error fetching top tools:', error);
        container.innerHTML = `<p style="text-align: center; grid-column: 1 / -1; color: var(--text-muted-color);">${error.message}</p>`;
    }
}