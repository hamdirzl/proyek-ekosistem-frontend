// js/modules/tools/images-to-pdf.js

import { API_BASE_URL } from '../../config.js';

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