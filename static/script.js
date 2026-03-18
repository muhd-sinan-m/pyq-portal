
// ==================== PAPERS FROM BACKEND ====================
// This is set in view.html: window.PAPERS_FROM_BACKEND = {{ papers | tojson }}
const papers = typeof window.PAPERS_FROM_BACKEND !== 'undefined'
  ? window.PAPERS_FROM_BACKEND
  : [];

// ==================== VIEW PAPERS PAGE FUNCTIONALITY ====================
if (document.getElementById('papersGrid')) {
    const papersGrid    = document.getElementById('papersGrid');
    const noResults     = document.getElementById('noResults');
    const resultsCount  = document.getElementById('resultsCount');
    const subjectFilter = document.getElementById('subjectFilter');
    const yearFilter    = document.getElementById('yearFilter');
    const semesterFilter= document.getElementById('semesterFilter');
    const searchInput   = document.getElementById('searchInput');
    const resetFilters  = document.getElementById('resetFilters');
    const semFolders    = document.getElementById('semFolders');
    const folderPapersView = document.getElementById('folderPapersView');
    const btnBackFolders   = document.getElementById('btnBackFolders');
    const folderPapersHeader = document.getElementById('folderPapersHeader');

    let activeSem = null; // which semester folder is open

    // ---- Render semester folders ----
    function renderFolders() {
        const sems = [1,2,3,4,5,6];
        semFolders.innerHTML = sems.map(sem => {
            const count = papers.filter(p => p.semester == sem).length;
            const isEmpty = count === 0;
            return `
                <div class="sem-folder-card ${isEmpty ? 'sem-folder-empty' : ''}"
                     onclick="${isEmpty ? '' : `openFolder(${sem})`}">
                    <span class="sem-folder-icon">📁</span>
                    <div class="sem-folder-name">Semester ${sem}</div>
                    <div class="sem-folder-count">${count} ${count === 1 ? 'paper' : 'papers'}</div>
                </div>
            `;
        }).join('');
    }

    // ---- Open a semester folder ----
window.openFolder = function(sem) {
    activeSem = sem;
    semFolders.style.display = 'none';
    folderPapersView.style.display = 'block';
    folderPapersHeader.innerHTML = `
        <h2>📂 Semester ${sem}</h2>
        <p>Showing papers for Semester ${sem}</p>
    `;
    semesterFilter.value = String(sem);
    renderPapers();
};

    // ---- Back to folders ----
    btnBackFolders.addEventListener('click', () => {
        activeSem = null;
        semesterFilter.value = '';
        folderPapersView.style.display = 'none';
        semFolders.style.display = 'grid';
        renderFolders();
        if (typeof updateFilterBadge === 'function') updateFilterBadge();
    });

    // ---- Render papers (same as before) ----
    function renderPapers() {
        const subjectValue  = subjectFilter.value.toLowerCase();
        const yearValue     = yearFilter.value;
        const semesterValue = semesterFilter.value;
        const searchValue   = searchInput.value.toLowerCase();

        let filteredPapers = papers.filter(paper => {
            const matchSubject  = !subjectValue  || (paper.subject && paper.subject.toLowerCase() === subjectValue);
            const matchYear     = !yearValue     || paper.year == yearValue || String(paper.year) === yearValue;
            const matchSemester = !semesterValue || String(paper.semester) === String(semesterValue);
            const matchSearch   = !searchValue   ||
                (paper.subject  && paper.subject.toLowerCase().includes(searchValue))  ||
                (paper.file_url && paper.file_url.toLowerCase().includes(searchValue)) ||
                (paper.examType && paper.examType.toLowerCase().includes(searchValue)) ||
                (paper.department && paper.department.toLowerCase().includes(searchValue));
            return matchSubject && matchYear && matchSemester && matchSearch;
        });

        const count = filteredPapers.length;
        resultsCount.textContent = `Showing ${count} ${count === 1 ? 'paper' : 'papers'}`;

        if (filteredPapers.length === 0) {
            papersGrid.style.display = 'none';
            noResults.style.display = 'block';
        } else {
            papersGrid.style.display = 'grid';
            noResults.style.display = 'none';
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
                    <a href="${escapeHtml(paper.file_url || '')}" class="btn-download" target="_blank" download>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download
                    </a>
                </div>
            `).join('');
        }

        // if inside a folder, update the header count
        if (activeSem !== null) {
            folderPapersHeader.querySelector('p').textContent =
                `Showing ${count} ${count === 1 ? 'paper' : 'papers'} for Semester ${activeSem}`;
        }
    }

    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ---- Filter event listeners ----
    subjectFilter.addEventListener('change', renderPapers);
    yearFilter.addEventListener('change', renderPapers);
    semesterFilter.addEventListener('change', renderPapers);
    searchInput.addEventListener('input', renderPapers);

    resetFilters.addEventListener('click', () => {
        subjectFilter.value  = '';
        yearFilter.value     = '';
        semesterFilter.value = activeSem || '';
        searchInput.value    = '';
        renderPapers();
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

    // ---- Initial render: show folders ----
    renderFolders();
}
    // View toggle functionality
   // View toggle functionality
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

    // Initial render
    renderPapers();
}

// ==================== UPLOAD PAGE FUNCTIONALITY ====================
if (document.getElementById('uploadForm')) {
    const uploadForm = document.getElementById('uploadForm');
    const uploadFile = document.getElementById('uploadFile');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileSelected = document.getElementById('fileSelected');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFile = document.getElementById('removeFile');
    const successAlert = document.getElementById('successAlert');

    // File upload area click handler
    fileUploadArea.addEventListener('click', () => {
        uploadFile.click();
    });

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
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

    // Handle dropped files
    fileUploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            uploadFile.files = files;
            handleFileSelect(files[0]);
        }
    }, false);

    // File selection handler
    uploadFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });

    // Handle file selection
    function handleFileSelect(file) {
        // Validate file type
        if (file.type !== 'application/pdf') {
            showError('fileError', 'Only PDF files are allowed');
            uploadFile.value = '';
            return;
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showError('fileError', 'File size must not exceed 10MB');
            uploadFile.value = '';
            return;
        }

        // Display file info
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // Show selected file, hide upload content
        document.querySelector('.file-upload-content').style.display = 'none';
        fileSelected.style.display = 'flex';
        
        // Clear any previous errors
        hideError('fileError');
    }

    // Remove file handler
    removeFile.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadFile.value = '';
        document.querySelector('.file-upload-content').style.display = 'block';
        fileSelected.style.display = 'none';
    });

    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Show error message
    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    // Hide error message
    function hideError(elementId) {
        const errorElement = document.getElementById(elementId);
        errorElement.style.display = 'none';
    }

    // Form submission handler: run client-side validation, then submit the real form
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Reset all error messages
        document.querySelectorAll('.error-message').forEach(el => {
            el.style.display = 'none';
        });

        // Get form values
        const subject = document.getElementById('uploadSubject').value;
        const year = document.getElementById('uploadYear').value;
        const semester = document.getElementById('uploadSemester').value;
        const department = document.getElementById('uploadDepartment').value;
        const examType = document.getElementById('uploadExamType').value;
        const file = uploadFile.files[0];
        const notes = document.getElementById('uploadNotes').value;

        let isValid = true;

        // Validation
        if (!subject) {
            showError('subjectError', 'Please select a subject');
            isValid = false;
        }

        if (!year) {
            showError('yearError', 'Please select a year');
            isValid = false;
        }

        if (!semester) {
            showError('semesterError', 'Please select a semester');
            isValid = false;
        }

        if (!department) {
            showError('departmentError', 'Please select a department');
            isValid = false;
        }

        if (!examType) {
            showError('examTypeError', 'Please select an exam type');
            isValid = false;
        }

        if (!file) {
            showError('fileError', 'Please select a PDF file');
            isValid = false;
        } else if (file.type !== 'application/pdf') {
            showError('fileError', 'Only PDF files are allowed');
            isValid = false;
        }

        if (!isValid) return;

        // All validations passed: submit the native form so server receives multipart data
        uploadForm.submit();
    });
}

// ==================== SMOOTH SCROLL FOR ANCHOR LINKS ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});
// ==================== MOBILE MENU TOGGLE ====================
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileNav = document.getElementById('mobileNav');

    if (mobileMenuToggle && mobileNav) {
        // Toggle menu on button click
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            this.classList.toggle('active');
            mobileNav.classList.toggle('active');
            
            // Prevent body scroll when menu is open
            if (mobileNav.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        // Close mobile menu when clicking on a navigation link
        const mobileNavLinks = mobileNav.querySelectorAll('.mobile-nav-link');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuToggle.classList.remove('active');
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
            });
        });

        // Close menu when clicking outside
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

    // Active nav link highlighting
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href === currentPath || currentPath.includes(href.split('?')[0]))) {
            link.classList.add('active');
        }
    });
});
