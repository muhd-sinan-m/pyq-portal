// ==================== PAPERS FROM BACKEND ====================
const papers = typeof window.PAPERS_FROM_BACKEND !== 'undefined'
  ? window.PAPERS_FROM_BACKEND
  : [];

// ==================== VIEW PAPERS PAGE FUNCTIONALITY ====================
if (document.getElementById('semFolders')) {
    const papersGrid         = document.getElementById('papersGrid');
    const noResults          = document.getElementById('noResults');
    const resultsCount       = document.getElementById('resultsCount');
    const subjectFilter      = document.getElementById('subjectFilter');
    const yearFilter         = document.getElementById('yearFilter');
    const semesterFilter     = document.getElementById('semesterFilter');
    const searchInput        = document.getElementById('searchInput');
    const resetFilters       = document.getElementById('resetFilters');
    const semFolders         = document.getElementById('semFolders');
    const folderPapersView   = document.getElementById('folderPapersView');
    const btnBackFolders     = document.getElementById('btnBackFolders');
    const folderPapersHeader = document.getElementById('folderPapersHeader');

    let activeSem  = null;
    let activeType = null;

    const EXAM_TYPES  = ['SEA I', 'SEA II', 'ISA'];
    const EXAM_ICONS  = { 'SEA I': '📄', 'SEA II': '📋', 'ISA': '📝' };
    const EXAM_COLORS = { 'SEA I': 'blue', 'SEA II': 'purple', 'ISA': 'green' };

    // ---- Filter section visibility ----
    function showFiltersSection() {
        const section = document.getElementById('filtersSection');
        if (section) section.style.display = '';
    }

    function hideFiltersSection() {
        const section = document.getElementById('filtersSection');
        if (section) section.style.display = 'none';
        const wrapper = document.getElementById('filtersCardWrapper');
        const btn     = document.getElementById('filterToggleBtn');
        if (wrapper) wrapper.classList.remove('visible');
        if (btn)     btn.classList.remove('open');
    }

    // ---- Context-aware subject filter ----
    function filterSubjectsBySem(sem) {
        subjectFilter.querySelectorAll('option').forEach(opt => {
            if (!opt.value) return;
            opt.hidden = opt.dataset.semester && String(opt.dataset.semester) !== String(sem);
        });
        if (subjectFilter.value) {
            const selected = subjectFilter.querySelector(`option[value="${subjectFilter.value}"]`);
            if (selected && selected.hidden) subjectFilter.value = '';
        }
    }

    function resetSubjectFilter() {
        subjectFilter.querySelectorAll('option').forEach(opt => opt.hidden = false);
        subjectFilter.value = '';
    }

    // ---- Render semester folders ----
    function renderFolders() {
        semFolders.style.display = 'grid';
        folderPapersView.style.display = 'none';
        hideFiltersSection();
        resetSubjectFilter();
        const sems = [1,2,3,4,5,6];
        semFolders.innerHTML = sems.map(sem => {
            const count = papers.filter(p => String(p.semester) === String(sem)).length;
            const isEmpty = count === 0;
            return `
                <div class="sem-folder-card ${isEmpty ? 'sem-folder-empty' : ''}"
                     onclick="${isEmpty ? '' : `openFolder(${sem})`}">
                    <div class="sem-folder-icon-wrap">
                        <svg viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="0" y="8" width="48" height="30" rx="4" fill="${isEmpty ? '#D1D5DB' : '#BFDBFE'}"/>
                            <rect x="0" y="12" width="48" height="26" rx="4" fill="${isEmpty ? '#E5E7EB' : '#DBEAFE'}"/>
                            <rect x="2" y="6" width="20" height="8" rx="3" fill="${isEmpty ? '#D1D5DB' : '#93C5FD'}"/>
                            <rect x="4" y="18" width="40" height="3" rx="1.5" fill="${isEmpty ? '#9CA3AF' : '#3B82F6'}" opacity="0.4"/>
                            <rect x="4" y="24" width="32" height="3" rx="1.5" fill="${isEmpty ? '#9CA3AF' : '#3B82F6'}" opacity="0.3"/>
                            <rect x="4" y="30" width="36" height="3" rx="1.5" fill="${isEmpty ? '#9CA3AF' : '#3B82F6'}" opacity="0.2"/>
                        </svg>
                    </div>
                    <div class="sem-folder-name">Semester ${sem}</div>
                    <div class="sem-folder-count">${count} ${count === 1 ? 'paper' : 'papers'}</div>
                </div>
            `;
        }).join('');
    }

    // ---- Open semester → show exam type cards ----
    window.openFolder = function(sem) {
        activeSem  = sem;
        activeType = null;
        semFolders.style.display = 'none';
        folderPapersView.style.display = 'block';
        hideFiltersSection();
        resetSubjectFilter();

        const typeCards = EXAM_TYPES.map(type => {
            const count = papers.filter(p =>
                String(p.semester) === String(sem) &&
                (p.examType || '').toUpperCase() === type.toUpperCase()
            ).length;
            const isEmpty = count === 0;
            const color   = EXAM_COLORS[type];
            return `
                <div class="exam-type-card exam-type-${color} ${isEmpty ? 'exam-type-empty' : ''}"
                     onclick="${isEmpty ? '' : `openExamType(${sem}, '${type}')`}">
                    <div class="exam-type-icon">${EXAM_ICONS[type]}</div>
                    <div class="exam-type-name">${type}</div>
                    <div class="exam-type-count">${count} ${count === 1 ? 'paper' : 'papers'}</div>
                </div>
            `;
        }).join('');

        const totalCount = papers.filter(p => String(p.semester) === String(sem)).length;
        folderPapersHeader.innerHTML = `
            <div class="folder-breadcrumb">
                <button class="breadcrumb-btn" onclick="renderFolders()">All Semesters</button>
                <span class="breadcrumb-sep">›</span>
                <span class="breadcrumb-current">Semester ${sem}</span>
            </div>
            <div class="folder-title-row">
                <h2>📂 Semester ${sem}</h2>
                <span class="folder-total-badge">${totalCount} total papers</span>
            </div>
            <div class="exam-type-grid" id="examTypeGrid">${typeCards}</div>
        `;

        papersGrid.style.display = 'none';
        noResults.style.display  = 'none';
        resultsCount.textContent = '';
    };

    // ---- Open exam type → show papers ----
    window.openExamType = function(sem, type) {
        activeType = type;
        semesterFilter.value = String(sem);
        showFiltersSection();
        filterSubjectsBySem(sem);

        folderPapersHeader.innerHTML = `
            <div class="folder-breadcrumb">
                <button class="breadcrumb-btn" onclick="renderFolders()">All Semesters</button>
                <span class="breadcrumb-sep">›</span>
                <button class="breadcrumb-btn" onclick="openFolder(${sem})">Semester ${sem}</button>
                <span class="breadcrumb-sep">›</span>
                <span class="breadcrumb-current">${type}</span>
            </div>
            <div class="folder-title-row">
                <h2>${EXAM_ICONS[type]} ${type} — Semester ${sem}</h2>
            </div>
        `;

        renderPapers(type);
    };

    // ---- Back button ----
    btnBackFolders.addEventListener('click', () => {
        if (activeType !== null) {
            openFolder(activeSem);
        } else {
            activeSem  = null;
            activeType = null;
            semesterFilter.value = '';
            renderFolders();
            if (typeof updateFilterBadge === 'function') updateFilterBadge();
        }
    });
    // ---- Floating back button (mobile scroll) ----
const btnBackFloat = document.getElementById('btnBackFloat');

btnBackFloat.addEventListener('click', () => {
    btnBackFolders.click();
});

window.addEventListener('scroll', () => {
    if (folderPapersView.style.display === 'none') {
        btnBackFloat.classList.remove('visible');
        return;
    }
    const rect = btnBackFolders.getBoundingClientRect();
    btnBackFloat.classList.toggle('visible', rect.bottom < 0);
}, { passive: true });

    // ---- Render papers ----
    function renderPapers(forceType) {
        const subjectValue  = subjectFilter.value.toLowerCase();
        const yearValue     = yearFilter.value;
        const semesterValue = semesterFilter.value;
        const searchValue   = searchInput.value.toLowerCase();
        const typeValue     = forceType || activeType;

        let filteredPapers = papers.filter(paper => {
            const matchSubject  = !subjectValue  || (paper.subject && paper.subject.toLowerCase() === subjectValue);
            const matchYear     = !yearValue     || String(paper.year) === String(yearValue);
            const matchSemester = !semesterValue || String(paper.semester) === String(semesterValue);
            const matchType     = !typeValue     || (paper.examType || '').toUpperCase() === typeValue.toUpperCase();
            const matchSearch   = !searchValue   ||
                (paper.subject    && paper.subject.toLowerCase().includes(searchValue))  ||
                (paper.file_url   && paper.file_url.toLowerCase().includes(searchValue)) ||
                (paper.examType   && paper.examType.toLowerCase().includes(searchValue)) ||
                (paper.department && paper.department.toLowerCase().includes(searchValue));
            return matchSubject && matchYear && matchSemester && matchType && matchSearch;
        });

        const count = filteredPapers.length;
        resultsCount.textContent = `Showing ${count} ${count === 1 ? 'paper' : 'papers'}`;

        if (filteredPapers.length === 0) {
            papersGrid.style.display = 'none';
            noResults.style.display  = 'block';
        } else {
            papersGrid.style.display = 'grid';
            noResults.style.display  = 'none';
            papersGrid.innerHTML = filteredPapers.map(paper => `
                <div class="paper-card">
                    <div class="paper-info">
                        <div class="info-item">
                            <span class="info-label">Subject</span>
                            <span class="info-value">${escapeHtml(paper.subject)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Year</span>
                            <span class="info-value">${escapeHtml(String(paper.year))}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Semester</span>
                            <span class="info-value">Sem ${escapeHtml(String(paper.semester || ''))}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Exam Type</span>
                            <span class="info-value">${escapeHtml(paper.examType || '—')}</span>
                        </div>
                    </div>
                                        <div class="paper-card-actions">
                        <a href="${escapeHtml(paper.file_url || '')}" class="btn-view-paper" target="_blank">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            View
                        </a>
                        <button class="btn-download-paper" onclick="forceDownload('${escapeHtml(paper.file_url || '')}', '${escapeHtml(paper.subject)}_${escapeHtml(String(paper.year))}.pdf')">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download
                        </button>
                        <button class="btn-analyse-paper" onclick="analysePaper(${paper.paper_id}, '${escapeHtml(paper.subject)}')">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                 <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                            </svg>
                            Analyse
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
    async function analysePaper(paperId, subject) {
    showToast('🤖 Analysing… this may take a few seconds');
    try {
        const res = await fetch(`/analyze/${paperId}`);
        const data = await res.json();
        if (data.error) { showToast('⚠️ ' + data.error); return; }
        document.getElementById('analyseSubject').textContent = data.subject + ' — ' + data.exam_type + ' ' + data.year;
        document.getElementById('analyseResult').textContent = data.predictions;
        document.getElementById('analyseModal').style.display = 'flex';
    } catch(e) {
        showToast('⚠️ Analysis failed. Try again.');
    }
}
    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ---- Filter listeners ----
    subjectFilter.addEventListener('change',  () => { if (activeType) renderPapers(); });
    yearFilter.addEventListener('change',     () => { if (activeType) renderPapers(); });
    semesterFilter.addEventListener('change', () => { if (activeType) renderPapers(); });
    searchInput.addEventListener('input',     () => { if (activeType) renderPapers(); });

    resetFilters.addEventListener('click', () => {
        subjectFilter.value  = '';
        yearFilter.value     = '';
        semesterFilter.value = activeSem ? String(activeSem) : '';
        searchInput.value    = '';
        if (activeType) renderPapers();
    });

    // ---- View toggle ----
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            if (view === 'list') {
                papersGrid.style.gridTemplateColumns = '1fr';
                papersGrid.classList.add('view-list');
                papersGrid.classList.remove('view-grid');
            } else {
                papersGrid.style.gridTemplateColumns = '';
                papersGrid.classList.add('view-grid');
                papersGrid.classList.remove('view-list');
            }
        });
    });

    // ---- Initial render ----
    renderFolders();
}

// ==================== UPLOAD PAGE FUNCTIONALITY ====================
if (document.getElementById('uploadForm')) {
    const uploadForm     = document.getElementById('uploadForm');
    const uploadFile     = document.getElementById('uploadFile');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileSelected   = document.getElementById('fileSelected');
    const fileName       = document.getElementById('fileName');
    const fileSize       = document.getElementById('fileSize');
    const removeFile     = document.getElementById('removeFile');

    fileUploadArea.addEventListener('click', () => uploadFile.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.style.borderColor = 'var(--primary-blue)';
            fileUploadArea.style.background = 'rgba(37, 99, 235, 0.05)';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.style.borderColor = '';
            fileUploadArea.style.background = '';
        }, false);
    });

    fileUploadArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) { uploadFile.files = files; handleFileSelect(files[0]); }
    }, false);

    uploadFile.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFileSelect(e.target.files[0]);
    });

    function handleFileSelect(file) {
        if (file.type !== 'application/pdf') {
            showError('fileError', 'Only PDF files are allowed');
            uploadFile.value = ''; return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showError('fileError', 'File size must not exceed 10MB');
            uploadFile.value = ''; return;
        }
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        document.querySelector('.file-upload-content').style.display = 'none';
        fileSelected.style.display = 'flex';
        hideError('fileError');
    }

    removeFile.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadFile.value = '';
        document.querySelector('.file-upload-content').style.display = 'block';
        fileSelected.style.display = 'none';
    });

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    function showError(id, msg) {
        const el = document.getElementById(id);
        if (el) { el.textContent = msg; el.style.display = 'block'; }
    }

    function hideError(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');

        let isValid = true;
        if (!document.getElementById('uploadSubject').value)    { showError('subjectError', 'Please select a subject'); isValid = false; }
        if (!document.getElementById('uploadYear').value)       { showError('yearError', 'Please select a year'); isValid = false; }
        if (!document.getElementById('uploadSemester').value)   { showError('semesterError', 'Please select a semester'); isValid = false; }
        if (!document.getElementById('uploadDepartment').value) { showError('departmentError', 'Please select a department'); isValid = false; }
        if (!document.getElementById('uploadExamType').value)   { showError('examTypeError', 'Please select an exam type'); isValid = false; }

        const file = uploadFile.files[0];
        if (!file) { showError('fileError', 'Please select a PDF file'); isValid = false; }
        else if (file.type !== 'application/pdf') { showError('fileError', 'Only PDF files are allowed'); isValid = false; }

        if (isValid) uploadForm.submit();
    });
}

// ==================== SMOOTH SCROLL ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ==================== MOBILE MENU TOGGLE ====================
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileNav = document.getElementById('mobileNav');

    if (mobileMenuToggle && mobileNav) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.toggle('active');
            mobileNav.classList.toggle('active');
            document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
        });

        mobileNav.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuToggle.classList.remove('active');
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
            });
        });

        document.addEventListener('click', function(e) {
            if (mobileNav.classList.contains('active') &&
                !mobileMenuToggle.contains(e.target) &&
                !mobileNav.contains(e.target)) {
                mobileMenuToggle.classList.remove('active');
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href === currentPath || currentPath.includes(href.split('?')[0]))) {
            link.classList.add('active');
        }
    });
});