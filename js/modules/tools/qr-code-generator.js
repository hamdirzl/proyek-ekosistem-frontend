// js/modules/tools/qr-code-generator.js

import { API_BASE_URL } from '../../config.js';

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