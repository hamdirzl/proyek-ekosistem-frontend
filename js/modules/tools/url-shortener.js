// js/modules/tools/url-shortener.js

import { API_BASE_URL } from '../../config.js';
import { fetchWithAuth } from '../../utils/auth.js';

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