document.addEventListener("DOMContentLoaded", () => {
    // === КОНФИГУРАЦИЯ ===
    const grid = document.getElementById('product-grid');
    const JSON_URL = 'products.json';
    const TELEGRAM_LINK = 'https://t.me/GrdejtvxcaTtwvHdievroehgUcVuViT';
    
    // Элементы
    const searchInput = document.getElementById('search-input');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // Элементы Сортировки
    const dropdown = document.getElementById('sort-dropdown');
    const dropdownTrigger = dropdown.querySelector('.dropdown-trigger');
    const dropdownItems = dropdown.querySelectorAll('.dropdown-item');
    const currSortText = dropdown.querySelector('.curr-sort-text');
    const currSortIcon = dropdown.querySelector('.curr-sort-icon');

    let allProducts = [];
    let currentCategory = 'all';
    let searchQuery = '';
    let currentSort = 'newest'; // newest, oldest, price-asc, price-desc, discount

    // Модальное окно
    const modal = document.getElementById('product-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    // Иконка для кнопки заказа
    const telegramIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21.94,2.06a2,2,0,0,0-2.16-.27L1.56,9.68a2,2,0,0,0,.1,3.74l5.36,1.68a2,2,0,0,0,2.11-.54l8.13-8.13a.5.5,0,0,1,.71.71L9.84,15.27a2,2,0,0,0-.54,2.11L11,22.75a2,2,0,0,0,3.74.1l7.82-18.22A2,2,0,0,0,21.94,2.06Z"/></svg>`;

    // --- ЛАЙТБОКС (ZOOM) ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightboxBtn = document.querySelector('.close-lightbox');

    window.openLightbox = (src) => {
        if(lightboxImg && lightbox) {
            lightboxImg.src = src;
            lightbox.classList.add('active');
        }
    };
    
    const closeLightbox = () => lightbox.classList.remove('active');
    if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
    if (lightbox) lightbox.addEventListener('click', (e) => { 
        if (e.target !== lightboxImg && e.target !== closeLightboxBtn) closeLightbox(); 
    });


    // === 1. СОЗДАНИЕ КАРТОЧКИ (CARD) ===
    function createCard(product) {
        const card = document.createElement('article');
        card.className = 'product-card';
        
        // --- ЛОГИКА СТАТУСА ---
        const statusText = product.available ? 'В наличии' : 'Только под заказ';
        const statusClass = product.available ? 'status-in' : 'status-order';
        
        const mainImage = product.images?.[0] || '';
        const productData = encodeURIComponent(JSON.stringify(product));

        // --- ЛОГИКА ЦЕНЫ СО СКИДКОЙ ---
        let priceHTML = '';
        const glowClass = product.Discount && product.OldPrice ? 'gold-glow' : '';

        if (product.Discount && product.OldPrice) {
            priceHTML = `
                <div class="price-container">
                    <p class="card-price ${glowClass}">${product.price}</p>
                    <p class="card-old-price">${product.OldPrice}</p>
                </div>
            `;
        } else {
            priceHTML = `<div class="price-container"><p class="card-price">${product.price}</p></div>`;
        }

        // --- ЛОГИКА ВАРИАЦИЙ (ТЕГИ) ---
        let visualOptionsHTML = '';
        if (product.has_variations && product.variations && product.variations.length > 0) {
            const maxShow = 3; 
            let badges = '';
            product.variations.forEach((v, index) => {
                if (index < maxShow) badges += `<span class="var-badge">${v.name}</span>`;
            });
            if (product.variations.length > maxShow) {
                badges += `<span class="var-badge-more">+${product.variations.length - maxShow}</span>`;
            }
            visualOptionsHTML = `<div class="card-variations-row">${badges}</div>`;
        } else {
            visualOptionsHTML = `
                <div class="card-variations-row">
                    <span class="var-badge">Default</span>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${mainImage}" alt="${product.name}" class="card-image" loading="lazy">
            </div>
            <div class="card-info">
                <h2 class="card-title">${product.name}</h2>
                ${visualOptionsHTML}
                ${priceHTML}
                <p class="card-status ${statusClass}">${statusText}</p>
            </div>
            <div class="btn-container">
                <button class="btn-qc-card" onclick="openModal('${productData}')">Quality Check</button>
                <a href="${TELEGRAM_LINK}" target="_blank" class="btn-write-card">
                    ${telegramIcon} <span>Заказать</span>
                </a>
            </div>
        `;
        return card;
    }

    // === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ЦЕНЫ ===
    function parsePrice(priceStr) {
        if (!priceStr) return 0;
        return parseFloat(priceStr.replace(/[^\d.]/g, ''));
    }

    // === RENDER ===
    function renderProducts() {
        grid.innerHTML = ''; 
        
        // 1. Фильтрация
        let filtered = allProducts.filter(product => {
            const matchCategory = (currentCategory === 'all') || (product.category === currentCategory);
            const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCategory && matchSearch;
        });

        // 2. Сортировка
        filtered.sort((a, b) => {
            // Newest (Сначала новые)
            if (currentSort === 'newest') {
                return allProducts.indexOf(a) - allProducts.indexOf(b);
            }
            // Oldest (Сначала старые) - НОВОЕ
            if (currentSort === 'oldest') {
                return allProducts.indexOf(b) - allProducts.indexOf(a);
            }
            if (currentSort === 'price-asc') {
                return parsePrice(a.price) - parsePrice(b.price);
            }
            if (currentSort === 'price-desc') {
                return parsePrice(b.price) - parsePrice(a.price);
            }
            if (currentSort === 'discount') {
                const discountA = a.Discount ? 1 : 0;
                const discountB = b.Discount ? 1 : 0;
                if (discountB === discountA) return allProducts.indexOf(a) - allProducts.indexOf(b);
                return discountB - discountA;
            }
            return 0;
        });

        if (filtered.length === 0) {
            grid.innerHTML = '<p style="color:#666; grid-column: 1/-1; text-align:center; padding: 40px;">Товары не найдены.</p>';
            return;
        }

        filtered.forEach((p, i) => {
            const card = createCard(p);
            card.style.animation = 'none';
            card.offsetHeight; 
            card.style.animation = `revealCard 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards ${i * 0.05}s`;
            grid.appendChild(card);
        });
    }

    // === 2. ОТКРЫТИЕ МОДАЛЬНОГО ОКНА (MODAL) ===
    window.openModal = (productDataEncoded) => {
        const product = JSON.parse(decodeURIComponent(productDataEncoded));
        
        // Галерея QC
        const galleryImages = product.gallery || []; 
        let galleryGridHTML = '';
        if (galleryImages.length > 0) {
            galleryImages.forEach(imgSrc => {
                galleryGridHTML += `
                    <div class="gallery-grid-item">
                        <img src="${imgSrc}" class="modal-gallery-img" onclick="openLightbox('${imgSrc}')">
                    </div>`;
            });
        } else {
             galleryGridHTML = '<div style="color:#444; text-align:center; padding: 20px;">Фото QC отсутствуют</div>';
        }

        // --- ЛОГИКА ВАРИАЦИЙ ---
        let variationsHTML = '';
        let btns = '';
        
        if (product.has_variations && product.variations && product.variations.length > 0) {
            product.variations.forEach(v => {
                btns += `<button class="modal-var-btn" onclick="openLightbox('${v.image}')">${v.name}</button>`;
            });
        } else {
            const defaultImage = product.gallery?.[0] || product.images?.[0] || '';
            const onClickAction = defaultImage ? `onclick="openLightbox('${defaultImage}')"` : '';
            btns += `<button class="modal-var-btn default-btn" ${onClickAction}>Default</button>`;
        }

        variationsHTML = `
            <div class="modal-info-row" style="display:block;">
                <span class="modal-info-label" style="display:block; margin-bottom:8px;">Вариации</span>
                <div class="variation-buttons-container">${btns}</div>
            </div>
        `;

        // Цены
        let modalPriceContent = '';
        const glowClass = product.Discount && product.OldPrice ? 'gold-glow' : ''; 

        if (product.Discount && product.OldPrice) {
            modalPriceContent = `
                <div class="modal-price-values">
                    <span class="modal-price-value ${glowClass}">${product.price}</span>
                    <span class="modal-old-price">${product.OldPrice}</span>
                </div>
            `;
        } else {
            modalPriceContent = `<span class="modal-price-value">${product.price}</span>`;
        }

        const sizesStr = (product.sizes && product.sizes.length > 0) ? product.sizes.join(', ') : 'One Size';
        const statusText = product.available ? 'В наличии' : 'Только под заказ';
        const statusClass = product.available ? 'status-in' : 'status-order';

        const modalLeft = modalContent.querySelector('.modal-body-left');
        const modalRight = modalContent.querySelector('.modal-body-right');

        modalLeft.innerHTML = `
            <div class="modal-section-gallery">
                <span class="gallery-label">Quality Check</span>
                <div class="gallery-grid">${galleryGridHTML}</div>
            </div>
        `;

        modalRight.innerHTML = `
            <button class="close-modal-x" onclick="closeModalFunc()">✕</button>
            <div class="details-title">DETAILS</div>
            <h2 class="modal-product-title">${product.name}</h2>
            <div class="modal-info-row">
                <span class="modal-info-label">Размер</span>
                <span class="modal-info-value">${sizesStr}</span>
            </div>
            ${variationsHTML}
            <div class="modal-info-row" style="margin-top: 15px;">
                <span class="modal-info-label">Статус</span>
                <span class="modal-info-value ${statusClass}">${statusText}</span>
            </div>
            <div class="modal-price-block">
                 <span class="modal-price-label">Стоимость</span>
                 ${modalPriceContent}
            </div>
            <a href="${TELEGRAM_LINK}" target="_blank" class="btn-order-modal">Заказать</a>
        `;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeModalFunc = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) closeModalFunc();
    });

    // === ОБРАБОТЧИКИ СОБЫТИЙ (ФИЛЬТРЫ И ПОИСК) ===
    if(searchInput) searchInput.addEventListener('input', (e) => { searchQuery = e.target.value.trim(); renderProducts(); });
    
    filterBtns.forEach(btn => btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.getAttribute('data-filter');
        renderProducts();
    }));

    // === ОБРАБОТЧИКИ СОБЫТИЙ (СОРТИРОВКА) ===
    dropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    window.addEventListener('click', () => {
        dropdown.classList.remove('open');
    });

    dropdownItems.forEach(item => {
        item.addEventListener('click', () => {
            dropdownItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const text = item.querySelector('span').innerText;
            const iconHTML = item.querySelector('svg').outerHTML;
            
            currSortText.innerText = text;
            currSortIcon.innerHTML = iconHTML;

            currentSort = item.getAttribute('data-sort');
            renderProducts();
        });
    });

    // === ЗАГРУЗКА ДАННЫХ ===
    async function loadProducts() {
        try {
            const response = await fetch(JSON_URL);
            allProducts = await response.json();
            // Переворачиваем, чтобы новые были в начале массива (index 0)
            allProducts.reverse(); 
            renderProducts(); 
        } catch (e) { 
            console.error("Ошибка загрузки продуктов:", e); 
            grid.innerHTML = '<p style="color:#FF3B30; grid-column: 1/-1; text-align:center; padding: 40px;">Ошибка: Не удалось загрузить products.json</p>';
        }
    }
    loadProducts();
});