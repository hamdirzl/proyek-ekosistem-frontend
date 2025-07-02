// js/modules/tools/media-converter.js

import { API_BASE_URL } from '../../config.js';
import { setupCustomFileInputs, setupCustomDropdowns } from '../../utils/ui.js';

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