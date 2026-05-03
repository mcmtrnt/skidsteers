import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State
let allListings = [];

// Load listings from Firestore
async function loadListings() {
    const grid = document.getElementById('equipmentGrid');
    const pastGrid = document.getElementById('pastEquipmentGrid');
    const spinner = document.getElementById('loadingSpinner');
    const pastSpinner = document.getElementById('pastLoadingSpinner');
    const noListings = document.getElementById('noListings');
    const noPastListings = document.getElementById('noPastListings');

    try {
        const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        allListings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const available = allListings.filter(l => l.status !== 'sold');
        const sold = allListings.filter(l => l.status === 'sold');

        spinner.style.display = 'none';
        pastSpinner.style.display = 'none';

        if (available.length === 0) {
            noListings.style.display = 'block';
        } else {
            available.forEach(listing => {
                grid.appendChild(createCard(listing));
            });
        }

        if (sold.length === 0) {
            noPastListings.style.display = 'block';
        } else {
            sold.forEach(listing => {
                pastGrid.appendChild(createCard(listing));
            });
        }
    } catch (error) {
        console.error('Error loading listings:', error);
        spinner.style.display = 'none';
        pastSpinner.style.display = 'none';

        // If Firebase isn't configured, show a helpful message
        if (error.code === 'auth/invalid-api-key' || firebaseConfig.apiKey === 'YOUR_API_KEY') {
            noListings.style.display = 'block';
            noListings.textContent = 'Firebase not configured yet. See SETUP.md for instructions.';
        } else {
            noListings.style.display = 'block';
        }
    }
}

// Create an equipment card element
function createCard(listing) {
    const card = document.createElement('div');
    card.className = 'equipment-card';
    card.setAttribute('data-category', listing.category || 'equipment');

    const images = listing.images || [];
    const firstImage = images[0] || 'images/logo.png';

    let carouselHTML = '';
    if (images.length > 0) {
        const imagesHTML = images.map((url, i) =>
            `<img src="${url}" alt="${listing.title} view ${i + 1}" class="${i === 0 ? 'active' : ''}" loading="lazy">`
        ).join('');

        const dotsHTML = images.length > 1 ? images.map((_, i) =>
            `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
        ).join('') : '';

        carouselHTML = `
            <div class="card-carousel" data-current="0">
                ${listing.status === 'sold' ? '<span class="card-status sold">Sold</span>' : '<span class="card-status available">Available</span>'}
                ${imagesHTML}
                ${images.length > 1 ? `
                    <button class="carousel-btn prev">&#8249;</button>
                    <button class="carousel-btn next">&#8250;</button>
                    <div class="image-counter">1 / ${images.length}</div>
                    <div class="image-dots">${dotsHTML}</div>
                ` : ''}
            </div>
        `;
    } else {
        carouselHTML = `
            <div class="card-carousel">
                ${listing.status === 'sold' ? '<span class="card-status sold">Sold</span>' : '<span class="card-status available">Available</span>'}
                <img src="images/logo.png" alt="${listing.title}" class="active" style="object-fit:contain;padding:20px;background:#f5f5f5;">
            </div>
        `;
    }

    const specs = listing.specs || [];
    const specsHTML = specs.length > 0
        ? `<ul class="card-specs">${specs.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>`
        : '';

    card.innerHTML = `
        ${carouselHTML}
        <div class="card-details">
            <div class="card-title">${escapeHTML(listing.title)}</div>
            <div class="card-price">${escapeHTML(listing.price || 'Contact for Price')}</div>
            <div class="card-location">${escapeHTML(listing.location || 'Utah')}</div>
            ${listing.description ? `<p style="font-size:14px;color:#666;margin-bottom:12px;">${escapeHTML(listing.description)}</p>` : ''}
            ${specsHTML}
            <div class="card-footer">
                <span class="card-contact">${escapeHTML(listing.contactName || 'Shane')}: ${escapeHTML(listing.contactPhone || '(801) 935-1133')}</span>
                <button class="card-view-btn">View Details</button>
            </div>
        </div>
    `;

    // Carousel navigation
    if (images.length > 1) {
        const carousel = card.querySelector('.card-carousel');
        const prevBtn = card.querySelector('.carousel-btn.prev');
        const nextBtn = card.querySelector('.carousel-btn.next');

        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateCarousel(carousel, -1);
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateCarousel(carousel, 1);
        });

        card.querySelectorAll('.dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                goToSlide(carousel, parseInt(dot.dataset.index));
            });
        });
    }

    // Open modal on card click
    card.querySelector('.card-view-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(listing);
    });

    card.addEventListener('click', () => openModal(listing));

    return card;
}

function navigateCarousel(carousel, direction) {
    const images = carousel.querySelectorAll('img');
    const dots = carousel.querySelectorAll('.dot');
    const counter = carousel.querySelector('.image-counter');
    let current = parseInt(carousel.dataset.current) || 0;

    images[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');

    current = (current + direction + images.length) % images.length;

    images[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
    if (counter) counter.textContent = `${current + 1} / ${images.length}`;
    carousel.dataset.current = current;
}

function goToSlide(carousel, index) {
    const images = carousel.querySelectorAll('img');
    const dots = carousel.querySelectorAll('.dot');
    const counter = carousel.querySelector('.image-counter');

    images.forEach(img => img.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    images[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
    if (counter) counter.textContent = `${index + 1} / ${images.length}`;
    carousel.dataset.current = index;
}

// Modal
let modalImageIndex = 0;
let modalImages = [];

function openModal(listing) {
    const modal = document.getElementById('equipmentModal');
    const imagesContainer = document.getElementById('modalImages');
    const detailsContainer = document.getElementById('modalDetails');
    const counter = document.getElementById('modalCounter');

    modalImages = listing.images || [];
    modalImageIndex = 0;

    imagesContainer.innerHTML = modalImages.length > 0
        ? modalImages.map((url, i) => `<img src="${url}" alt="${listing.title}" class="${i === 0 ? 'active' : ''}">`).join('')
        : '<img src="images/logo.png" alt="No image" class="active" style="object-fit:contain;padding:20px;background:#f5f5f5;">';

    counter.textContent = modalImages.length > 0 ? `1 / ${modalImages.length}` : '';

    const specs = listing.specs || [];
    const specsHTML = specs.length > 0
        ? `<ul class="modal-specs">${specs.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>`
        : '';

    detailsContainer.innerHTML = `
        <h2>${escapeHTML(listing.title)}</h2>
        <div class="modal-price">${escapeHTML(listing.price || 'Contact for Price')}</div>
        <div class="modal-location">${escapeHTML(listing.location || 'Utah')}</div>
        ${listing.description ? `<p class="modal-desc">${escapeHTML(listing.description)}</p>` : ''}
        ${specsHTML}
        <div class="modal-contact">
            <a href="tel:${(listing.contactPhone || '8019351133').replace(/\D/g, '')}">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z"/></svg>
                Call ${escapeHTML(listing.contactName || 'Shane')}: ${escapeHTML(listing.contactPhone || '(801) 935-1133')}
            </a>
        </div>
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('equipmentModal').classList.remove('open');
    document.body.style.overflow = '';
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load listings
    loadListings();

    // Mobile nav toggle
    document.getElementById('navToggle').addEventListener('click', () => {
        document.getElementById('navMenu').classList.toggle('open');
    });

    // Close mobile nav on link click
    document.querySelectorAll('.navbar-nav a').forEach(link => {
        link.addEventListener('click', () => {
            document.getElementById('navMenu').classList.remove('open');
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // FAQ accordion
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const answer = btn.nextElementSibling;
            const isOpen = answer.classList.contains('open');

            // Close all
            document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));
            document.querySelectorAll('.faq-question').forEach(b => b.setAttribute('aria-expanded', 'false'));

            if (!isOpen) {
                answer.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            document.querySelectorAll('#equipmentGrid .equipment-card').forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // Modal controls
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('equipmentModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    document.getElementById('modalPrev').addEventListener('click', () => {
        if (modalImages.length <= 1) return;
        const container = document.getElementById('modalImages');
        const imgs = container.querySelectorAll('img');
        imgs[modalImageIndex].classList.remove('active');
        modalImageIndex = (modalImageIndex - 1 + modalImages.length) % modalImages.length;
        imgs[modalImageIndex].classList.add('active');
        document.getElementById('modalCounter').textContent = `${modalImageIndex + 1} / ${modalImages.length}`;
    });

    document.getElementById('modalNext').addEventListener('click', () => {
        if (modalImages.length <= 1) return;
        const container = document.getElementById('modalImages');
        const imgs = container.querySelectorAll('img');
        imgs[modalImageIndex].classList.remove('active');
        modalImageIndex = (modalImageIndex + 1) % modalImages.length;
        imgs[modalImageIndex].classList.add('active');
        document.getElementById('modalCounter').textContent = `${modalImageIndex + 1} / ${modalImages.length}`;
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Contact form (EmailJS)
    document.getElementById('contactForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const form = this;
        if (!form.checkValidity()) return;

        const data = {
            service_id: 'service_9va8vvg',
            template_id: 'template_iqf8zub',
            user_id: '8ede1-J_4MRQi7-up',
            template_params: {
                name: document.getElementById('name').value,
                customer_message: document.getElementById('customer_message').value,
                phone: document.getElementById('phone').value,
                email: ''
            }
        };

        $.ajax('https://api.emailjs.com/api/v1.0/email/send', {
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json'
        }).then(function () {
            document.getElementById('name').value = '';
            document.getElementById('phone').value = '';
            document.getElementById('customer_message').value = '';
            const banner = document.getElementById('submitBanner');
            banner.style.display = 'block';
            setTimeout(() => { banner.style.display = 'none'; }, 3000);
        }, function () {
            document.getElementById('name').value = '';
            document.getElementById('phone').value = '';
            document.getElementById('customer_message').value = '';
        });
    });

    // Active nav highlighting on scroll
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY + 150;
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            const link = document.querySelector(`.navbar-nav a[href="#${id}"]`);
            if (link) {
                if (scrollY >= top && scrollY < top + height) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });
    });
});
