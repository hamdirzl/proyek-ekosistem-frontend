// js/modules/public-pages.js
// Logika untuk halaman publik seperti Portofolio dan Jurnal.

import { API_BASE_URL } from '../config.js';

export function setupPortfolioPage() {
    const portfolioGrid = document.querySelector('.portfolio-grid');
    if (!portfolioGrid) return;

    async function fetchAndRenderPortfolio() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/portfolio`);
            if (!response.ok) throw new Error('Gagal memuat data portofolio.');

            const projects = await response.json();
            portfolioGrid.innerHTML = '';

            if (projects.length === 0) {
                portfolioGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted-color);">Belum ada proyek portofolio untuk ditampilkan.</p>';
                return;
            }

            projects.forEach(project => {
                const projectCard = document.createElement('a');
                projectCard.className = 'portfolio-card portfolio-link-card';
                projectCard.href = `project-detail.html?id=${project.id}`;
                projectCard.setAttribute('data-aos', 'fade-up');

                const projectImage = project.image_url || 'https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=500&q=80';

                const projectLinkButton = `<span class="button-pintu">Lihat Detail</span>`;

                projectCard.innerHTML = `
                    <img src="${projectImage}" alt="Gambar proyek ${project.title}">
                    <div class="card-content">
                        <h3>${project.title}</h3>
                        <p>${project.description.replace(/<[^>]+>/g, ' ').substring(0, 150)}...</p>
                        ${projectLinkButton}
                    </div>
                `;
                portfolioGrid.appendChild(projectCard);
            });

        } catch (error) {
            console.error('Error:', error);
            portfolioGrid.innerHTML = `<p style="text-align: center; color: var(--text-muted-color);">${error.message}</p>`;
        }
    }
    fetchAndRenderPortfolio();
}

export function setupProjectDetailPage() {
    const titleElement = document.getElementById('jurnal-title');
    const metaElement = document.getElementById('jurnal-meta');
    const imageElement = document.getElementById('jurnal-image');
    const contentElement = document.getElementById('jurnal-content');
    const linkElement = document.getElementById('project-link');
    const mainContent = document.getElementById('main-content');
    const loadingIndicator = document.getElementById('loading-indicator');

    async function fetchProjectDetails() {
        try {
            const params = new URLSearchParams(window.location.search);
            const projectId = params.get('id');

            if (!projectId) {
                throw new Error('ID Proyek tidak ditemukan di URL.');
            }

            const response = await fetch(`${API_BASE_URL}/api/portfolio/${projectId}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Proyek tidak ditemukan.');
            }

            const project = await response.json();

            document.title = `${project.title} - Detail Proyek`;
            titleElement.textContent = project.title;
            metaElement.textContent = `Dipublikasikan pada ${new Date(project.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;

            if (project.image_url) {
                imageElement.src = project.image_url;
                imageElement.alt = `Gambar utama untuk ${project.title}`;
                imageElement.style.display = 'block';
            } else {
                imageElement.style.display = 'none';
            }

            contentElement.innerHTML = project.description;

            if (project.project_link) {
                linkElement.href = project.project_link;
                linkElement.style.display = 'inline-block';
            } else {
                linkElement.style.display = 'none';
            }

            loadingIndicator.style.display = 'none';
            mainContent.style.display = 'block';

        } catch (error) {
            loadingIndicator.innerHTML = `<p style="color: #ff4d4d;">Error: ${error.message}</p>`;
        }
    }
    fetchProjectDetails();
}

export function setupJurnalPage() {
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

                const firstImageMatch = post.content.match(/<img[^>]+src="([^">]+)"/);
                const postImage = post.image_url || (firstImageMatch ? firstImageMatch[1] : 'https://images.unsplash.com/photo-1489549132488-d00b7d8818e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80');

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

export function setupJurnalDetailPage() {
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

            const firstImageMatch = post.content.match(/<img[^>]+src="([^">]+)"/);
            const mainImage = post.image_url || (firstImageMatch ? firstImageMatch[1] : null);

            if (mainImage) {
                imageElement.src = mainImage;
                imageElement.alt = `Gambar untuk ${post.title}`;
                imageElement.style.display = 'block';
            } else {
                imageElement.style.display = 'none';
            }

            contentElement.innerHTML = post.content;

            loadingIndicator.style.display = 'none';
            mainContent.style.display = 'block';

        } catch (error) {
            loadingIndicator.innerHTML = `<p style="color: #ff4d4d;">Error: ${error.message}</p>`;
        }
    }
    fetchJurnalDetails();
}