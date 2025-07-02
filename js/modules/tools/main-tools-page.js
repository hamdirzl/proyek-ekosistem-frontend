// js/modules/tools/main-tools-page.js

import { API_BASE_URL } from '../../config.js';

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