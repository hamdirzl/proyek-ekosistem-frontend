// js/modules/dashboard.js
// Semua logika untuk halaman Dasbor, termasuk panel admin dan manajemen akun.

import { API_BASE_URL } from '../config.js';
import { decodeJwt, fetchWithAuth, forceLogout } from '../utils/auth.js';
import { handleImageSelectionForCropping, uploadCroppedImageForEditor } from '../utils/cropping.js';
import { setupAdminChatUI } from './chat.js';

function populateUserInfo(decodedToken) {
    if (decodedToken && decodedToken.email) {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) userEmailElement.textContent = decodedToken.email;
    }
}

async function populateUserDashboard() {
    const userDashboardSection = document.getElementById('user-dashboard-section');
    if (!userDashboardSection) return;

    const statsLinkCountEl = document.getElementById('stats-link-count');
    const statsLastLoginEl = document.getElementById('stats-last-login');

    try {
        const statsResponse = await fetchWithAuth(`${API_BASE_URL}/api/user/dashboard-stats`);
        if (!statsResponse.ok) throw new Error('Gagal memuat data statistik.');

        const stats = await statsResponse.json();

        statsLinkCountEl.textContent = stats.linkCount;
        if (stats.lastLogin) {
            statsLastLoginEl.innerHTML = `${stats.lastLogin.time}<br><small style="font-weight: 400; color: var(--text-muted-color);">${stats.lastLogin.ip}</small>`;
        } else {
            statsLastLoginEl.textContent = 'Belum ada data.';
        }
    } catch (error) {
        statsLinkCountEl.textContent = 'Error';
        statsLastLoginEl.textContent = 'Gagal memuat';
    }

    const historyList = document.getElementById('user-links-list');
    const loadingMessage = document.getElementById('loading-user-links');
    if (!historyList || !loadingMessage) return;

    loadingMessage.textContent = 'Memuat riwayat tautan...';
    try {
        const linksResponse = await fetchWithAuth(`${API_BASE_URL}/api/user/links`);
        if (!linksResponse.ok) throw new Error('Gagal memuat riwayat tautan.');

        const links = await linksResponse.json();

        historyList.innerHTML = '';
        if (links.length === 0) {
            loadingMessage.textContent = 'Anda belum pernah membuat tautan pendek.';
        } else {
            loadingMessage.style.display = 'none';
            links.slice(0, 5).forEach(link => renderUserLinkItem(link, historyList));
        }
    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
    }
}

function setupAdminPanels() {
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) userEmailElement.innerHTML += ' <span style="color: var(--accent-color); font-size: 0.9em;">(Admin)</span>';

    document.getElementById('admin-portfolio-tab')?.classList.remove('hidden');
    document.getElementById('admin-jurnal-tab')?.classList.remove('hidden');
    document.getElementById('admin-links-tab')?.classList.remove('hidden');
    document.getElementById('admin-users-tab')?.classList.remove('hidden');

    setupAdminPortfolioPanel();
    setupAdminJurnalPanel();

    const adminSection = document.getElementById('admin-section');
    if (adminSection) {
        const linkSearchInput = document.getElementById('link-search-input');
        let linkSearchTimeout;
        linkSearchInput.addEventListener('input', (e) => {
            clearTimeout(linkSearchTimeout);
            linkSearchTimeout = setTimeout(() => {
                fetchAndDisplayLinks(e.target.value);
            }, 300);
        });
        fetchAndDisplayLinks();
    }
    const adminUsersSection = document.getElementById('admin-users-section');
    if (adminUsersSection) {
        const userSearchInput = document.getElementById('user-search-input');
        let userSearchTimeout;
        userSearchInput.addEventListener('input', (e) => {
            clearTimeout(userSearchTimeout);
            userSearchTimeout = setTimeout(() => {
                fetchAndDisplayUsers(e.target.value);
            }, 300);
        });
        fetchAndDisplayUsers();
    }
}

function setupAdminPortfolioPanel() {
    const form = document.getElementById('portfolio-form');
    if (!form) return;

    let portfolioQuill;

    const formTitle = document.getElementById('portfolio-form-title');
    const hiddenId = document.getElementById('portfolio-id');
    const titleInput = document.getElementById('portfolio-title');
    const messageDiv = document.getElementById('portfolio-message');
    const clearButton = document.getElementById('clear-portfolio-form');
    const editorDiv = document.getElementById('quill-portfolio-editor');

    const toolbarOptions = [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'image', 'video'],
        ['clean']
    ];

    if (editorDiv) {
        portfolioQuill = new Quill(editorDiv, {
            modules: { toolbar: toolbarOptions },
            theme: 'snow',
            placeholder: 'Jelaskan detail proyek Anda di sini...'
        });
        editorDiv.__quill = portfolioQuill;
    }

    if (portfolioQuill) {
        portfolioQuill.getModule('toolbar').addHandler('image', () => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();

            input.onchange = () => {
                const file = input.files[0];
                if (file) {
                    handleImageSelectionForCropping(file, (blob) => {
                        uploadCroppedImageForEditor(
                            blob,
                            (location) => {
                                const range = portfolioQuill.getSelection(true);
                                portfolioQuill.insertEmbed(range.index, 'image', location);
                            },
                            (errorText) => {
                                console.error(errorText);
                                alert(`Gagal mengunggah gambar: ${errorText}`);
                            }
                        );
                    }, 16 / 9);
                }
            };
        });
    }

    function resetPortfolioForm() {
        form.reset();
        hiddenId.value = '';
        formTitle.textContent = 'Tambah Proyek Baru';
        messageDiv.textContent = '';
        messageDiv.className = '';
        if (portfolioQuill) {
            portfolioQuill.setText('');
        }
    }

    clearButton.addEventListener('click', resetPortfolioForm);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = hiddenId.value;
        const title = titleInput.value;
        const description = portfolioQuill.root.innerHTML;

        if (!title || portfolioQuill.getLength() <= 1) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Error: Judul dan deskripsi tidak boleh kosong.';
            return;
        }

        messageDiv.className = '';
        messageDiv.textContent = "Menyimpan proyek...";

        const url = id ? `${API_BASE_URL}/api/admin/portfolio/${id}` : `${API_BASE_URL}/api/admin/portfolio`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetchWithAuth(url, {
                method,
                body: JSON.stringify({ title, description })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Terjadi kesalahan.');

            messageDiv.className = 'success';
            messageDiv.textContent = id ? 'Proyek berhasil diperbarui!' : 'Proyek berhasil ditambahkan!';

            resetPortfolioForm();
            fetchAndDisplayPortfolioAdmin();
        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = `Error: ${error.message}`;
        }
    });

    fetchAndDisplayPortfolioAdmin();
}

async function fetchAndDisplayPortfolioAdmin() {
    const listContainer = document.getElementById('portfolio-list-admin');
    const loadingMessage = document.getElementById('loading-portfolio-admin');
    if (!listContainer || !loadingMessage) return;

    loadingMessage.style.display = 'block';
    listContainer.innerHTML = '';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/portfolio`);
        const projects = await response.json();
        if (!response.ok) throw new Error(projects.error || 'Gagal memuat proyek.');

        loadingMessage.style.display = 'none';

        if (projects.length === 0) {
            listContainer.innerHTML = '<li><p>Belum ada proyek ditambahkan.</p></li>';
            return;
        }

        projects.forEach(project => renderAdminPortfolioItem(project, listContainer));
    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
    }
}

function renderAdminPortfolioItem(project, container) {
    const listItem = document.createElement('li');
    listItem.className = 'mood-item';
    listItem.id = `portfolio-item-${project.id}`;
    const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

    const strippedDescription = project.description.replace(/<[^>]+>/g, ' ');

    listItem.innerHTML = `
        <div class="mood-item-header">
            <span><strong>${project.title}</strong></span>
            <div class="mood-item-actions">
                <button class="mood-icon-button edit-portfolio-btn" data-id="${project.id}" aria-label="Edit Proyek">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button class="mood-icon-button delete-portfolio-btn delete-button" data-id="${project.id}" aria-label="Hapus Proyek">
                    ${trashIconSvg}
                </button>
            </div>
        </div>
        <p class="mood-notes">${strippedDescription.substring(0, 100)}...</p>
        <small class="mood-date">Dibuat: ${new Date(project.created_at).toLocaleString('id-ID')}</small>
    `;
    container.appendChild(listItem);

    listItem.querySelector('.edit-portfolio-btn').addEventListener('click', async () => {
        document.getElementById('portfolio-form-title').textContent = 'Edit Proyek';
        document.getElementById('portfolio-id').value = project.id;
        document.getElementById('portfolio-title').value = project.title;

        const editorDiv = document.getElementById('quill-portfolio-editor');
        if (editorDiv && editorDiv.__quill) {
            editorDiv.__quill.root.innerHTML = project.description;
        }

        document.getElementById('portfolio-form').scrollIntoView({ behavior: 'smooth' });
    });

    listItem.querySelector('.delete-portfolio-btn').addEventListener('click', async () => {
        if (!confirm(`Yakin ingin menghapus proyek "${project.title}"?`)) return;

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/portfolio/${project.id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            alert('Proyek berhasil dihapus.');
            fetchAndDisplayPortfolioAdmin();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });
}

function setupAdminJurnalPanel() {
    const form = document.getElementById('jurnal-form');
    if (!form) return;

    let quill;

    const formTitle = document.getElementById('jurnal-form-title');
    const hiddenId = document.getElementById('jurnal-id');
    const titleInput = document.getElementById('jurnal-title');
    const messageDiv = document.getElementById('jurnal-message');
    const clearButton = document.getElementById('clear-jurnal-form');
    const editorDiv = document.getElementById('quill-editor');

    const toolbarOptions = [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'image', 'video'],
        ['clean']
    ];

    if (editorDiv) {
        quill = new Quill(editorDiv, {
            modules: {
                toolbar: toolbarOptions
            },
            theme: 'snow',
            placeholder: 'Tuliskan pemikiran Anda di sini...'
        });
        editorDiv.__quill = quill;
    }


    if (quill) {
        quill.getModule('toolbar').addHandler('image', () => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();

            input.onchange = () => {
                const file = input.files[0];
                if (file) {
                    handleImageSelectionForCropping(file, (blob) => {
                        uploadCroppedImageForEditor(
                            blob,
                            (location) => {
                                const range = quill.getSelection(true);
                                quill.insertEmbed(range.index, 'image', location);
                            },
                            (errorText) => {
                                console.error(errorText);
                                alert(`Gagal mengunggah gambar: ${errorText}`);
                            }
                        );
                    }, 16 / 9);
                }
            };
        });
    }

    function resetJurnalForm() {
        form.reset();
        hiddenId.value = '';
        formTitle.textContent = 'Tambah Postingan Baru';
        messageDiv.textContent = '';
        messageDiv.className = '';
        if (quill) {
            quill.setText('');
        }
    }

    clearButton.addEventListener('click', resetJurnalForm);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = hiddenId.value;
        const title = titleInput.value;
        const content = quill.root.innerHTML;

        if (!title || quill.getLength() <= 1) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Error: Judul dan konten tidak boleh kosong.';
            return;
        }

        messageDiv.className = '';
        messageDiv.textContent = "Menyimpan postingan...";

        const url = id ? `${API_BASE_URL}/api/admin/jurnal/${id}` : `${API_BASE_URL}/api/admin/jurnal`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetchWithAuth(url, {
                method,
                body: JSON.stringify({ title, content })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Terjadi kesalahan.');

            messageDiv.className = 'success';
            messageDiv.textContent = id ? 'Postingan berhasil diperbarui!' : 'Postingan berhasil ditambahkan!';

            resetJurnalForm();
            fetchAndDisplayJurnalAdmin();
        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = `Error: ${error.message}`;
        }
    });

    fetchAndDisplayJurnalAdmin();
}

async function fetchAndDisplayJurnalAdmin() {
    const listContainer = document.getElementById('jurnal-list-admin');
    const loadingMessage = document.getElementById('loading-jurnal-admin');
    if (!listContainer || !loadingMessage) return;

    loadingMessage.style.display = 'block';
    listContainer.innerHTML = '';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/jurnal`);
        const posts = await response.json();
        if (!response.ok) throw new Error(posts.error || 'Gagal memuat postingan.');

        loadingMessage.style.display = 'none';

        if (posts.length === 0) {
            listContainer.innerHTML = '<li><p>Belum ada postingan jurnal ditambahkan.</p></li>';
            return;
        }

        posts.forEach(post => renderAdminJurnalItem(post, listContainer));
    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
    }
}

function renderAdminJurnalItem(post, container) {
    const listItem = document.createElement('li');
    listItem.className = 'mood-item';
    listItem.id = `jurnal-item-${post.id}`;
    const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    const strippedContent = post.content.replace(/<[^>]+>/g, ' ');

    listItem.innerHTML = `
        <div class="mood-item-header">
            <span><strong>${post.title}</strong></span>
            <div class="mood-item-actions">
                <button class="mood-icon-button edit-jurnal-btn" data-id="${post.id}" aria-label="Edit Postingan">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button class="mood-icon-button delete-jurnal-btn delete-button" data-id="${post.id}" aria-label="Hapus Postingan">
                    ${trashIconSvg}
                </button>
            </div>
        </div>
        <p class="mood-notes">${strippedContent.substring(0, 100)}...</p>
        <small class="mood-date">Dibuat: ${new Date(post.created_at).toLocaleString('id-ID')}</small>
    `;
    container.appendChild(listItem);

    listItem.querySelector('.edit-jurnal-btn').addEventListener('click', async () => {
        document.getElementById('jurnal-form-title').textContent = 'Edit Postingan';
        document.getElementById('jurnal-id').value = post.id;
        document.getElementById('jurnal-title').value = post.title;

        const editorDiv = document.getElementById('quill-editor');
        if (editorDiv && editorDiv.__quill) {
            editorDiv.__quill.root.innerHTML = post.content;
        }

        document.getElementById('jurnal-form').scrollIntoView({ behavior: 'smooth' });
    });

    listItem.querySelector('.delete-jurnal-btn').addEventListener('click', async () => {
        if (!confirm(`Yakin ingin menghapus postingan "${post.title}"?`)) return;

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/jurnal/${post.id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            alert('Postingan berhasil dihapus.');
            fetchAndDisplayJurnalAdmin();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });
}

async function fetchAndDisplayLinks(searchQuery = '') {
    const linkList = document.getElementById('link-list');
    const loadingMessage = document.getElementById('loading-links');
    if (!linkList || !loadingMessage) return;

    const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

    loadingMessage.textContent = 'Memuat semua tautan...';
    loadingMessage.style.display = 'block';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/links?search=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) throw new Error('Gagal mengambil data link. Pastikan Anda adalah admin.');

        const links = await response.json();
        loadingMessage.style.display = 'none';
        linkList.innerHTML = '';

        if (links.length === 0) {
            linkList.innerHTML = '<li><p>Tidak ada link yang cocok ditemukan.</p></li>';
            return;
        }

        links.forEach(link => {
            const listItem = document.createElement('li');
            listItem.className = 'mood-item';
            listItem.id = `link-${link.slug}`;
            listItem.innerHTML = `
                <div class="mood-item-header">
                    <span><strong>Slug:</strong> ${link.slug}</span>
                    <div class="mood-item-actions">
                         <button class="mood-icon-button delete-link-btn delete-button" data-slug="${link.slug}" aria-label="Hapus Tautan">${trashIconSvg}</button>
                    </div>
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
    }
}

async function handleDeleteLink(event) {
    const button = event.currentTarget;
    const slugToDelete = button.dataset.slug;
    if (!confirm(`Anda yakin ingin menghapus link dengan slug "${slugToDelete}"?`)) return;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/links/${slugToDelete}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal menghapus link.');

        alert(data.message);
        const listItemToRemove = document.getElementById(`link-${slugToDelete}`);
        if (listItemToRemove) listItemToRemove.remove();

    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function fetchAndDisplayUsers(searchQuery = '') {
    const userList = document.getElementById('user-list');
    const loadingMessage = document.getElementById('loading-users');
    if (!userList || !loadingMessage) return;

    loadingMessage.textContent = 'Memuat daftar pengguna...';
    loadingMessage.style.display = 'block';
    userList.innerHTML = '';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/users?search=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch users.');
        }

        const users = await response.json();
        loadingMessage.style.display = 'none';

        if (users.length === 0) {
            userList.innerHTML = '<li><p>Tidak ada pengguna yang cocok ditemukan.</p></li>';
            return;
        }

        const repeatIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-repeat"><polyline points="17 1 21 5 17 9"></polyline><path d="M21 15v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12"></path></svg>`;
        const trashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

        users.forEach(user => {
            const listItem = document.createElement('li');
            listItem.className = 'mood-item';
            listItem.id = `user-${user.id}`;
            listItem.innerHTML = `
                <div class="mood-item-header">
                    <span><strong>Email:</strong> ${user.email}</span>
                    <span><strong>Role:</strong> <span id="role-${user.id}">${user.role}</span></span>
                    <div class="mood-item-actions">
                        <button class="mood-icon-button toggle-user-role-btn" data-user-id="${user.id}" data-current-role="${user.role}" aria-label="Ubah Peran">${repeatIconSvg}</button>
                        <button class="mood-icon-button delete-user-btn delete-button" data-user-id="${user.id}" aria-label="Hapus Pengguna">${trashIconSvg}</button>
                    </div>
                </div>
                <small class="mood-date">Bergabung pada: ${new Date(user.created_at).toLocaleString('id-ID')}</small>
            `;
            userList.appendChild(listItem);
        });

        document.querySelectorAll('.toggle-user-role-btn').forEach(button => button.addEventListener('click', toggleUserRole));
        document.querySelectorAll('.delete-user-btn').forEach(button => button.addEventListener('click', deleteUser));

    } catch (error) {
        loadingMessage.textContent = `Error: ${error.message}`;
    }
}

async function toggleUserRole(event) {
    const button = event.currentTarget;
    const userId = button.dataset.userId;
    const currentRole = button.dataset.currentRole;
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Anda yakin ingin mengubah peran pengguna ini menjadi ${newRole}?`)) return;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal memperbarui peran.');

        alert(data.message);
        const roleSpan = document.getElementById(`role-${userId}`);
        if (roleSpan) {
            roleSpan.textContent = newRole;
            button.dataset.currentRole = newRole;
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function deleteUser(event) {
    const button = event.currentTarget;
    const userId = button.dataset.userId;
    if (!confirm(`Anda yakin ingin menghapus pengguna ini secara permanen? Tindakan ini tidak bisa dibatalkan.`)) return;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/users/${userId}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal menghapus pengguna.');

        alert(data.message);
        const listItemToRemove = document.getElementById(`user-${userId}`);
        if (listItemToRemove) listItemToRemove.remove();

    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

function setupAccountManagement() {
    const form = document.getElementById('change-password-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;
        const messageDiv = document.getElementById('change-password-message');
        const submitButton = form.querySelector('button');

        messageDiv.className = '';
        messageDiv.textContent = '';

        if (newPassword !== confirmNewPassword) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Error: Password baru dan konfirmasi tidak cocok.';
            return;
        }

        submitButton.disabled = true;
        messageDiv.textContent = 'Memproses...';

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/user/change-password`, {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            messageDiv.className = 'success';
            messageDiv.textContent = data.message;
            form.reset();

        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = `Error: ${error.message}`;
        } finally {
            submitButton.disabled = false;
        }
    });
}

function setupDashboardTabs() {
    const dashboardNav = document.querySelector('.dashboard-nav');
    if (!dashboardNav) return;

    const tabButtons = dashboardNav.querySelectorAll('.dashboard-tab-button');
    const contentPanels = document.querySelectorAll('.dashboard-panel');

    dashboardNav.addEventListener('click', (e) => {
        const clickedButton = e.target.closest('.dashboard-tab-button');
        if (!clickedButton) return;

        tabButtons.forEach(button => button.classList.remove('active'));
        contentPanels.forEach(panel => panel.classList.remove('active'));

        clickedButton.classList.add('active');

        const targetPanelId = clickedButton.dataset.target;
        const targetPanel = document.getElementById(targetPanelId);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    });
}

export async function setupDashboardPage() {
    const refreshToken = localStorage.getItem('jwt_refresh_token');
    const authPath = window.location.href.includes('github.io') ? '/hrportof/auth.html' : '/auth.html';
    if (!refreshToken) {
        window.location.href = authPath;
        return;
    }

    const accessToken = sessionStorage.getItem('jwt_access_token');
    if (!accessToken) {
        // The main logic in main.js will handle refreshing the token
        return;
    }

    const decodedToken = decodeJwt(accessToken);
    populateUserInfo(decodedToken);
    populateUserDashboard(); // Always populate user dashboard data

    if (decodedToken && decodedToken.role === 'admin') {
        setupAdminPanels();
        await setupAdminChatUI(); // Setup chat for admin
    }

    // Setup functionalities specific to dashboard page
    setupDashboardTabs();
    setupAccountManagement();
}

// Helper untuk riwayat tautan di dasbor
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

        // Check if list is now empty
        const historyList = document.getElementById('user-links-list');
        const loadingMessage = document.getElementById('loading-user-links');
        if (historyList && historyList.children.length === 0) {
            loadingMessage.textContent = 'Anda belum memiliki riwayat tautan.';
            loadingMessage.style.display = 'block';
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
        console.error('Error deleting user link:', error);
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