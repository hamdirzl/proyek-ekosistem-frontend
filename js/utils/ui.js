// js/utils/ui.js
// Berisi fungsi-fungsi untuk menginisialisasi komponen UI umum.

export function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const menuOverlay = document.getElementById('menu-overlay');

    const toggleMenu = () => {
        if (hamburger) hamburger.classList.toggle('active');
        if (navLinks) navLinks.classList.toggle('active');
        if (menuOverlay) menuOverlay.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        document.documentElement.classList.toggle('menu-open');
    };

    if (hamburger) hamburger.addEventListener('click', toggleMenu);
    if (menuOverlay) menuOverlay.addEventListener('click', toggleMenu);
}

export function setupAllPasswordToggles() {
    const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    const setupPasswordToggle = (toggleId, passwordId) => {
        const toggleElement = document.getElementById(toggleId);
        const passwordElement = document.getElementById(passwordId);
        if (toggleElement && passwordElement) {
            toggleElement.addEventListener('click', () => {
                const isPassword = passwordElement.type === 'password';
                passwordElement.type = isPassword ? 'text' : 'password';
                toggleElement.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
            });
        }
    };

    setupPasswordToggle('toggle-login-password', 'login-password');
    setupPasswordToggle('toggle-register-password', 'register-password');
    setupPasswordToggle('toggle-reset-password', 'reset-password');
    setupPasswordToggle('toggle-confirm-password', 'confirm-password');
    setupPasswordToggle('toggle-current-password', 'current-password');
    setupPasswordToggle('toggle-new-password', 'new-password');
    setupPasswordToggle('toggle-confirm-new-password', 'confirm-new-password');
}

export function setupCustomFileInputs() {
    // Media Converter
    const converterInput = document.getElementById('file-input');
    const converterLabel = document.getElementById('file-count-label');
    if (converterInput && converterLabel) {
        converterInput.addEventListener('change', () => {
            if (converterInput.files.length > 0) {
                converterLabel.textContent = `${converterInput.files[0].name} dipilih.`;
            } else {
                converterLabel.textContent = '';
            }
        });
    }

    // Image Compressor
    const compressorInput = document.getElementById('image-compress-input');
    const compressorLabel = document.getElementById('compress-file-count-label');
    if (compressorInput && compressorLabel) {
        compressorInput.addEventListener('change', () => {
            if (compressorInput.files.length > 0) {
                compressorLabel.textContent = `${compressorInput.files[0].name} dipilih.`;
            } else {
                compressorLabel.textContent = '';
            }
        });
    }
}

export function setupCustomDropdowns() {
    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        const select = wrapper.querySelector('select');
        if (!select) return;

        wrapper.querySelector('.select-trigger')?.remove();
        wrapper.querySelector('.select-options')?.remove();

        const trigger = document.createElement('div');
        trigger.className = 'select-trigger';

        const optionsList = document.createElement('ul');
        optionsList.className = 'select-options';

        [...select.options].forEach(option => {
            const listItem = document.createElement('li');
            listItem.textContent = option.textContent;
            listItem.dataset.value = option.value;
            if (option.selected) {
                trigger.textContent = option.textContent;
                listItem.classList.add('selected');
            }
            optionsList.appendChild(listItem);

            listItem.addEventListener('click', (e) => {
                e.stopPropagation();
                optionsList.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                listItem.classList.add('selected');

                trigger.textContent = listItem.textContent;
                select.value = listItem.dataset.value;
                wrapper.classList.remove('active');

                select.dispatchEvent(new Event('change'));
            });
        });

        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsList);

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper.active').forEach(openWrapper => {
                if (openWrapper !== wrapper) {
                    openWrapper.classList.remove('active');
                }
            });
            wrapper.classList.toggle('active');
        });
    });

    window.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper.active').forEach(wrapper => {
            wrapper.classList.remove('active');
        });
    });
}

export function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(script);
        script.onerror = () => reject(new Error(`Gagal memuat skrip: ${src}`));
        document.head.appendChild(script);
    });
}