/* =====================================================================
   viewjs.js — Browse Papers page specific scripts for PYQ Portal
   ===================================================================== */

/* ── Popup ── */
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

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePopup();
});

/* ── Filter toggle ── */
function toggleFilters() {
    const wrapper = document.getElementById('filtersCardWrapper');
    const btn     = document.getElementById('filterToggleBtn');
    const isOpen  = wrapper.classList.contains('visible');
    wrapper.classList.toggle('visible', !isOpen);
    btn.classList.toggle('open', !isOpen);
}

/* ── Active filter badge ── */
function updateFilterBadge() {
    const values = [
        document.getElementById('subjectFilter').value,
        document.getElementById('yearFilter').value,
        document.getElementById('semesterFilter').value,
        document.getElementById('searchInput').value.trim()
    ];
    const count = values.filter(Boolean).length;
    const badge = document.getElementById('activeFilterBadge');
    if (count > 0) {
        badge.style.display = 'inline';
        badge.textContent   = `${count} filter${count > 1 ? 's' : ''} active`;
    } else {
        badge.style.display = 'none';
    }
}

['subjectFilter', 'yearFilter', 'semesterFilter', 'searchInput'].forEach(id => {
    document.getElementById(id).addEventListener('change', updateFilterBadge);
    document.getElementById(id).addEventListener('input',  updateFilterBadge);
});

document.getElementById('resetFilters').addEventListener('click', () => {
    setTimeout(updateFilterBadge, 50);
});

/* ── Staggered card entrance animation ── */
function animateCards() {
    const cards = document.querySelectorAll('#papersGrid .paper-card, #papersGrid > *');
    cards.forEach((card, i) => {
        card.classList.add('paper-card-anim');
        card.style.transitionDelay = `${i * 60}ms`;
        /* small rAF delay so transition triggers after class is applied */
        requestAnimationFrame(() => {
            requestAnimationFrame(() => card.classList.add('card-visible'));
        });
    });
}

/* ── Search / filter: re-animate cards after filtering ── */
function reAnimateCards() {
    const cards = document.querySelectorAll('#papersGrid .paper-card, #papersGrid > *');
    cards.forEach(card => {
        card.classList.remove('card-visible');
        card.style.transitionDelay = '0ms';
    });
    /* short pause so removal is applied before re-adding */
    setTimeout(animateCards, 30);
}

/* Observe DOM mutations in papersGrid (cards added by script.js filtering) */
const grid = document.getElementById('papersGrid');
if (grid) {
    const mo = new MutationObserver(() => animateCards());
    mo.observe(grid, { childList: true });
}

/* ── Filter inputs trigger re-animation ── */
['subjectFilter', 'yearFilter', 'semesterFilter', 'searchInput'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => setTimeout(reAnimateCards, 80));
    document.getElementById(id).addEventListener('input',  () => setTimeout(reAnimateCards, 80));
});

document.getElementById('resetFilters').addEventListener('click', () => {
    setTimeout(reAnimateCards, 100);
});

/* ── Filter select: flash on change ── */
document.querySelectorAll('.filter-select').forEach(el => {
    el.addEventListener('change', function () {
        if (!this.value) return;
        this.style.transition = 'background 0.3s ease';
        this.style.background = 'rgba(59,130,246,0.06)';
        setTimeout(() => { this.style.background = ''; }, 450);
    });
});

/* ── Initial entrance after page load ── */
window.addEventListener('load', () => {
    /* small delay so script.js has time to render initial cards */
    setTimeout(animateCards, 300);
});
