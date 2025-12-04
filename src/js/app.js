/**
 * Local Guides Leaderboard - Main Application
 */

import { auth, db, googleProvider } from './config/firebase.js';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatCompactNumber, formatWithCommas, getLevelBadgeClass, getRankBadgeClass } from './utils/format-number.js';

// State
let currentUser = null;
let isAdmin = false;
let guides = [];
let filteredGuides = [];

// DOM Elements
const elements = {
  // Auth
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  userMenu: document.getElementById('userMenu'),
  userAvatar: document.getElementById('userAvatar'),
  userName: document.getElementById('userName'),
  registerBtn: document.getElementById('registerBtn'),
  adminBtn: document.getElementById('adminBtn'),

  // Theme
  themeToggle: document.getElementById('themeToggle'),

  // Stats
  totalGuides: document.getElementById('totalGuides'),
  totalPoints: document.getElementById('totalPoints'),
  totalReviews: document.getElementById('totalReviews'),
  totalPhotos: document.getElementById('totalPhotos'),
  lastUpdate: document.getElementById('lastUpdate'),

  // Controls
  searchInput: document.getElementById('searchInput'),
  sortBy: document.getElementById('sortBy'),
  filterLevel: document.getElementById('filterLevel'),

  // Leaderboard
  leaderboardBody: document.getElementById('leaderboardBody'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),

  // Modal
  reportModal: document.getElementById('reportModal'),
  reportTargetId: document.getElementById('reportTargetId'),
  reportTargetName: document.getElementById('reportTargetName'),
  reportReason: document.getElementById('reportReason'),
  reportDetail: document.getElementById('reportDetail'),
  cancelReportBtn: document.getElementById('cancelReportBtn'),
  submitReportBtn: document.getElementById('submitReportBtn')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();
  initEventListeners();
  loadLeaderboard();
});

// Theme
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Auth
function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
      elements.loginBtn.hidden = true;
      elements.userMenu.hidden = false;
      elements.userAvatar.src = user.photoURL || '';
      elements.userName.textContent = user.displayName || user.email;

      // Check admin status
      isAdmin = await checkAdminStatus(user.uid);
      elements.adminBtn.hidden = !isAdmin;
    } else {
      elements.loginBtn.hidden = false;
      elements.userMenu.hidden = true;
      elements.adminBtn.hidden = true;
      isAdmin = false;
    }
  });
}

async function checkAdminStatus(uid) {
  try {
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);
    return adminSnap.exists();
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
}

async function handleLogin() {
  try {
    await signInWithPopup(auth, googleProvider);
    showToast('Logged in successfully', 'success');
  } catch (error) {
    console.error('Login failed:', error);
    showToast('Login failed: ' + error.message, 'error');
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    showToast('Logged out successfully', 'success');
  } catch (error) {
    console.error('Logout failed:', error);
    showToast('Logout failed', 'error');
  }
}

// Event Listeners
function initEventListeners() {
  // Auth
  elements.loginBtn?.addEventListener('click', handleLogin);
  elements.logoutBtn?.addEventListener('click', handleLogout);

  // Theme
  elements.themeToggle?.addEventListener('click', toggleTheme);

  // Search & Filter
  elements.searchInput?.addEventListener('input', debounce(handleSearch, 300));
  elements.sortBy?.addEventListener('change', handleSort);
  elements.filterLevel?.addEventListener('change', handleFilter);

  // Modal
  elements.reportModal?.querySelector('.modal__backdrop')?.addEventListener('click', closeReportModal);
  elements.reportModal?.querySelector('.modal__close')?.addEventListener('click', closeReportModal);
  elements.cancelReportBtn?.addEventListener('click', closeReportModal);
  elements.submitReportBtn?.addEventListener('click', handleSubmitReport);
}

// Leaderboard
async function loadLeaderboard() {
  showLoading(true);

  try {
    const guidesRef = collection(db, 'guides');
    const q = query(
      guidesRef,
      where('status', '==', 'approved'),
      orderBy('points', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    guides = [];

    snapshot.forEach((doc) => {
      guides.push({ id: doc.id, ...doc.data() });
    });

    // Calculate stats
    updateStats(guides);

    // Apply initial sort and render
    filteredGuides = [...guides];
    renderLeaderboard(filteredGuides);

  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    showToast('Failed to load leaderboard', 'error');

    // Show demo data if Firebase fails
    loadDemoData();
  }

  showLoading(false);
}

function loadDemoData() {
  guides = [
    { id: '1', displayName: 'Demo User', level: 1, points: 0, reviewCount: 0, photoCount: 0, photoViews: 0, country: '', avatarUrl: null, joinedThisMonth: false, leveledUpThisMonth: false, isGoogler: false },
  ];

  updateStats(guides);
  filteredGuides = [...guides];
  renderLeaderboard(filteredGuides);
}

function updateStats(data) {
  const stats = {
    totalGuides: data.length,
    totalPoints: data.reduce((sum, g) => sum + (g.points || 0), 0),
    totalReviews: data.reduce((sum, g) => sum + (g.reviewCount || 0), 0),
    totalPhotos: data.reduce((sum, g) => sum + (g.photoCount || 0), 0)
  };

  elements.totalGuides.textContent = formatWithCommas(stats.totalGuides);
  elements.totalPoints.textContent = formatCompactNumber(stats.totalPoints);
  elements.totalReviews.textContent = formatCompactNumber(stats.totalReviews);
  elements.totalPhotos.textContent = formatCompactNumber(stats.totalPhotos);

  // Last update
  elements.lastUpdate.textContent = `Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`;
}

function renderLeaderboard(data) {
  if (data.length === 0) {
    elements.leaderboardBody.innerHTML = '';
    elements.emptyState.hidden = false;
    return;
  }

  elements.emptyState.hidden = true;

  const html = data.map((guide, index) => {
    const rank = index + 1;
    const rankClass = getRankBadgeClass(rank);
    const levelClass = getLevelBadgeClass(guide.level);
    const initial = (guide.displayName || 'U')[0].toUpperCase();

    // Badges
    let badges = '';
    if (guide.joinedThisMonth) badges += '<span class="leaderboard__badge leaderboard__badge--new">NEW</span>';
    if (guide.leveledUpThisMonth) badges += '<span class="leaderboard__badge leaderboard__badge--levelup">LEVEL UP</span>';
    if (guide.isGoogler) badges += '<span class="leaderboard__badge leaderboard__badge--googler">GOOGLER</span>';

    // Top row class
    let rowClass = 'leaderboard__row';
    if (rank === 1) rowClass += ' leaderboard__row--top-1';
    else if (rank === 2) rowClass += ' leaderboard__row--top-2';
    else if (rank === 3) rowClass += ' leaderboard__row--top-3';

    return `
      <div class="${rowClass}" data-id="${guide.id}" data-name="${guide.displayName}">
        <div class="leaderboard__rank">
          <span class="rank-badge ${rankClass}">${rank}</span>
        </div>
        <div class="leaderboard__user">
          <div class="avatar">
            ${guide.avatarUrl ? `<img src="${guide.avatarUrl}" alt="">` : initial}
          </div>
          <div class="leaderboard__user-info" data-stats="Lv.${guide.level} | ${formatCompactNumber(guide.points)} pts | ${formatCompactNumber(guide.reviewCount)} reviews">
            <span class="leaderboard__user-name">${guide.displayName || 'Unknown'}</span>
            <span class="leaderboard__user-country">${guide.country || ''}</span>
          </div>
          <div class="leaderboard__user-badges">${badges}</div>
        </div>
        <div class="leaderboard__level">
          <span class="level-badge ${levelClass}">${guide.level}</span>
        </div>
        <div class="leaderboard__points">${formatCompactNumber(guide.points)}</div>
        <div class="leaderboard__reviews">${formatCompactNumber(guide.reviewCount)}</div>
        <div class="leaderboard__photos">${formatCompactNumber(guide.photoCount)}</div>
      </div>
    `;
  }).join('');

  elements.leaderboardBody.innerHTML = html;

  // Add click handlers for report
  elements.leaderboardBody.querySelectorAll('.leaderboard__row').forEach(row => {
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (currentUser) {
        openReportModal(row.dataset.id, row.dataset.name);
      }
    });
  });
}

// Search & Filter
function handleSearch(e) {
  const term = e.target.value.toLowerCase().trim();

  if (!term) {
    filteredGuides = [...guides];
  } else {
    filteredGuides = guides.filter(g =>
      g.displayName?.toLowerCase().includes(term) ||
      g.country?.toLowerCase().includes(term)
    );
  }

  applySort();
  renderLeaderboard(filteredGuides);
}

function handleSort() {
  applySort();
  renderLeaderboard(filteredGuides);
}

function applySort() {
  const sortBy = elements.sortBy.value;

  filteredGuides.sort((a, b) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    return bVal - aVal;
  });
}

function handleFilter() {
  const level = elements.filterLevel.value;

  if (level === 'all') {
    filteredGuides = [...guides];
  } else if (level === '5') {
    filteredGuides = guides.filter(g => g.level <= 5);
  } else {
    filteredGuides = guides.filter(g => g.level === parseInt(level));
  }

  applySort();
  renderLeaderboard(filteredGuides);
}

// Report Modal
function openReportModal(targetId, targetName) {
  elements.reportTargetId.value = targetId;
  elements.reportTargetName.value = targetName;
  elements.reportModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeReportModal() {
  elements.reportModal.hidden = true;
  document.body.style.overflow = '';
  elements.reportReason.value = 'data_manipulation';
  elements.reportDetail.value = '';
}

async function handleSubmitReport() {
  if (!currentUser) {
    showToast('Please login to submit a report', 'error');
    return;
  }

  // Import report service dynamically
  const { submitReport } = await import('./services/report-service.js');

  const result = await submitReport(
    currentUser.uid,
    currentUser.email,
    elements.reportTargetId.value,
    elements.reportTargetName.value,
    elements.reportReason.value,
    elements.reportDetail.value
  );

  if (result.success) {
    showToast('Report submitted successfully', 'success');
    closeReportModal();
  } else {
    showToast('Failed to submit report: ' + result.error, 'error');
  }
}

// Utilities
function showLoading(show) {
  if (elements.loadingState) {
    elements.loadingState.hidden = !show;
  }
}

function showToast(message, type = 'success') {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 5000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
