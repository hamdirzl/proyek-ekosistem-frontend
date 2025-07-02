// js/modules/tools/split-pdf.js

import { API_BASE_URL } from '../../config.js';
import { loadScript } from '../../utils/ui.js';

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