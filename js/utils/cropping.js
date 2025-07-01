// js/utils/cropping.js
// Mengelola semua logika untuk modal cropping gambar.

import { API_BASE_URL } from '../config.js';
import { fetchWithAuth } from './auth.js';

let cropper = null;
let imageToCropElement = null;
let cropModal = null;
let confirmCropBtn = null;
let cancelCropBtn = null;
let currentCropCallback = null;

export function setupCropModal() {
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
            cropper.getCroppedCanvas({
                width: 1280,
                imageSmoothingQuality: 'high',
            }).toBlob(blob => {
                currentCropCallback(blob);
                cropModal.classList.add('hidden');
                cropper.destroy();
                cropper = null;
            }, 'image/jpeg', 0.9);
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

    cropper = new Cropper(imageToCropElement, {
        aspectRatio: NaN,
        viewMode: 1,
        background: false,
        autoCropArea: 0.9,
        responsive: true,
        checkOrientation: false,
    });
}

export function handleImageSelectionForCropping(file, callback, aspectRatio) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            showCropModal(e.target.result, callback, aspectRatio);
        };
        reader.readAsDataURL(file);
    }
}

export async function uploadCroppedImageForEditor(blob, successCallback, failureCallback) {
    const formData = new FormData();
    formData.append('file', blob, 'cropped-image.jpg');

    try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/jurnal/upload-image`, {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengunggah gambar');

        successCallback(data.location);

    } catch (error) {
        failureCallback(`Gagal unggah: ${error.message}`);
    }
}