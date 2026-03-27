/* =====================================================================
   indexjs.js — Index page specific scripts for PYQ Portal
   ===================================================================== */

/* ── Popup data ── */
const popupData = {
    help: {
        icon:   '🎓',
        iconBg: 'rgba(59,130,246,0.1)',
        title:  'Need Help?',
        desc:   'Having trouble finding papers or using the portal? Drop us an email and we\'ll get back to you as soon as possible.',
        mail:   'mailto:pyqportalhelp@gmail.com?subject=Help Request - PYQ Portal',
        label:  'pyqportalhelp@gmail.com'
    },
    contact: {
        icon:   '✉️',
        iconBg: 'rgba(139,92,246,0.1)',
        title:  'Get in Touch',
        desc:   'Have a suggestion, found an issue, or want to contribute papers? We\'d love to hear from you.',
        mail:   'mailto:pyqportalhelp@gmail.com?subject=Contact - PYQ Portal',
        label:  'pyqportalhelp@gmail.com'
    }
};

function openPopup(type) {
    const d = popupData[type];
    const icon = document.getElementById('popupIcon');
    icon.textContent = d.icon;
    icon.style.background = d.iconBg;
    document.getElementById('popupTitle').textContent     = d.title;
    document.getElementById('popupDesc').textContent      = d.desc;
    document.getElementById('popupMailBtn').href          = d.mail;
    document.getElementById('popupMailLabel').textContent = d.label;
    document.getElementById('popupOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePopup() {
    document.getElementById('popupOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

/* Close on Escape key */
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePopup();
});

/* ── Scroll reveal ── */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal, .reveal-left').forEach(el => revealObserver.observe(el));

/* ── Animated number counter for paper count ── */
function animateCount(el, target, duration = 1500) {
    if (target === 0) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
        start = Math.min(start + step, target);
        el.textContent = Math.floor(start) + '+';
        if (start >= target) clearInterval(timer);
    }, 16);
}

/* Trigger counter when stats section enters view */
const statsEl      = document.querySelector('.hero-stats');
const paperCountEl = document.getElementById('statPapers');

if (statsEl && paperCountEl) {
    /* paperCount is injected inline in index.html as a data attribute */
    const paperCount = parseInt(statsEl.dataset.count || '0', 10);
    if (paperCount > 0) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    animateCount(paperCountEl, paperCount);
                    statsObserver.disconnect();
                }
            });
        }, { threshold: 0.5 });
        statsObserver.observe(statsEl);
    }
}
// Carousel dot indicators
document.querySelectorAll('[data-carousel]').forEach(function(track) {
    var dotsContainer = track.closest('.tips-sem-block').querySelector('[data-dots]');
    var cards = track.querySelectorAll('.tips-card');
    if (!dotsContainer || cards.length === 0) return;

    // Build dots
    cards.forEach(function(_, i) {
        var dot = document.createElement('div');
        dot.className = 'tips-dot-item' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', function() {
            cards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
        dotsContainer.appendChild(dot);
    });

    var dots = dotsContainer.querySelectorAll('.tips-dot-item');

    // Update active dot on scroll
    track.addEventListener('scroll', function() {
        var center = track.scrollLeft + track.offsetWidth / 2;
        var closest = 0;
        var minDist = Infinity;
        cards.forEach(function(card, i) {
            var cardCenter = card.offsetLeft + card.offsetWidth / 2;
            var dist = Math.abs(center - cardCenter);
            if (dist < minDist) { minDist = dist; closest = i; }
        });
        dots.forEach(function(d, i) {
            d.classList.toggle('active', i === closest);
        });
    }, { passive: true });
});