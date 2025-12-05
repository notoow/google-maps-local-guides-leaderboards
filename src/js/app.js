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
  deleteDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatCompactNumber, formatWithCommas, getLevelBadgeClass, getRankBadgeClass } from './utils/format-number.js';

// State
let currentUser = null;
let isAdmin = false;
let guides = [];
let filteredGuides = [];
let currentSort = { field: 'photoViews', direction: 'desc' };
let countdownInterval = null;

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
  userDropdownTrigger: document.getElementById('userDropdownTrigger'),
  userDropdownMenu: document.getElementById('userDropdownMenu'),
  deleteAccountBtn: document.getElementById('deleteAccountBtn'),
  authLoading: document.getElementById('authLoading'),

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

  // Report Modal
  reportModal: document.getElementById('reportModal'),
  reportTargetId: document.getElementById('reportTargetId'),
  reportTargetName: document.getElementById('reportTargetName'),
  reportReason: document.getElementById('reportReason'),
  reportDetail: document.getElementById('reportDetail'),
  cancelReportBtn: document.getElementById('cancelReportBtn'),
  submitReportBtn: document.getElementById('submitReportBtn'),

  // Claim Modal
  claimModal: document.getElementById('claimModal'),
  claimTargetId: document.getElementById('claimTargetId'),
  claimCountry: document.getElementById('claimCountry'),
  cancelClaimBtn: document.getElementById('cancelClaimBtn'),
  submitClaimBtn: document.getElementById('submitClaimBtn'),

  // Quick Add
  quickAddUrl: document.getElementById('quickAddUrl'),
  quickAddBtn: document.getElementById('quickAddBtn'),

  // Countdown
  countdown: document.getElementById('countdown')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();
  initEventListeners();
  loadLeaderboard();
  initCountdown();
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

    // 인증 로딩 숨기기
    if (elements.authLoading) {
      elements.authLoading.hidden = true;
    }

    if (user) {
      elements.loginBtn.hidden = true;
      elements.userMenu.hidden = false;
      elements.userAvatar.src = user.photoURL || '';
      elements.userName.textContent = user.displayName || user.email;

      // Check admin status
      isAdmin = await checkAdminStatus(user.uid);
      elements.adminBtn.hidden = !isAdmin;

      // Check if user is already registered - hide Join button and sync avatar
      const guideDoc = await getGuideDoc(user.uid);
      const isRegistered = !!guideDoc;
      elements.registerBtn.hidden = isRegistered;

      // Sync avatar URL if user is registered and photoURL changed
      if (isRegistered && user.photoURL && guideDoc.avatarUrl !== user.photoURL) {
        syncAvatarUrl(user.uid, user.photoURL);
      }
    } else {
      elements.loginBtn.hidden = false;
      elements.userMenu.hidden = true;
      elements.adminBtn.hidden = true;
      elements.registerBtn.hidden = false;
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

async function getGuideDoc(uid) {
  try {
    const guideRef = doc(db, 'guides', uid);
    const guideSnap = await getDoc(guideRef);
    return guideSnap.exists() ? guideSnap.data() : null;
  } catch (error) {
    console.error('Guide check failed:', error);
    return null;
  }
}

async function syncAvatarUrl(uid, photoURL) {
  try {
    const guideRef = doc(db, 'guides', uid);
    await updateDoc(guideRef, { avatarUrl: photoURL });
    console.log('Avatar URL synced');
  } catch (error) {
    console.error('Avatar sync failed:', error);
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
    closeUserDropdown();
    await signOut(auth);
    showToast('Logged out successfully', 'success');
  } catch (error) {
    console.error('Logout failed:', error);
    showToast('Logout failed', 'error');
  }
}

// User Dropdown
function toggleUserDropdown(e) {
  e.stopPropagation();
  const isHidden = elements.userDropdownMenu.hidden;
  elements.userDropdownMenu.hidden = !isHidden;
}

function closeUserDropdown() {
  if (elements.userDropdownMenu) {
    elements.userDropdownMenu.hidden = true;
  }
}

// Delete Account
async function handleDeleteAccount() {
  if (!currentUser) return;

  const confirmed = confirm(
    'Are you sure you want to delete your account?\n\n' +
    'This will remove your profile from the leaderboard.\n' +
    'This action cannot be undone.'
  );

  if (!confirmed) return;

  try {
    closeUserDropdown();

    // Delete guide document from Firestore
    const guideRef = doc(db, 'guides', currentUser.uid);
    await deleteDoc(guideRef);

    // Sign out
    await signOut(auth);

    showToast('Account deleted successfully', 'success');

    // Reload leaderboard
    loadLeaderboard();
  } catch (error) {
    console.error('Delete account failed:', error);
    showToast('Failed to delete account: ' + error.message, 'error');
  }
}

// Event Listeners
function initEventListeners() {
  // Auth
  elements.loginBtn?.addEventListener('click', handleLogin);
  elements.logoutBtn?.addEventListener('click', handleLogout);
  elements.deleteAccountBtn?.addEventListener('click', handleDeleteAccount);

  // User dropdown
  elements.userDropdownTrigger?.addEventListener('click', toggleUserDropdown);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header__user-dropdown')) {
      closeUserDropdown();
    }
  });

  // Theme
  elements.themeToggle?.addEventListener('click', toggleTheme);

  // Search & Filter
  elements.searchInput?.addEventListener('input', debounce(handleSearch, 300));
  elements.sortBy?.addEventListener('change', handleSort);
  elements.filterLevel?.addEventListener('change', handleFilter);

  // Table Header Sort
  document.querySelectorAll('.leaderboard__sort-btn').forEach(btn => {
    btn.addEventListener('click', () => handleHeaderSort(btn));
  });

  // Report Modal
  elements.reportModal?.querySelector('.modal__backdrop')?.addEventListener('click', closeReportModal);
  elements.reportModal?.querySelector('.modal__close')?.addEventListener('click', closeReportModal);
  elements.cancelReportBtn?.addEventListener('click', closeReportModal);
  elements.submitReportBtn?.addEventListener('click', handleSubmitReport);

  // Claim Modal
  elements.claimModal?.querySelector('.modal__backdrop')?.addEventListener('click', closeClaimModal);
  elements.claimModal?.querySelector('.modal__close')?.addEventListener('click', closeClaimModal);
  elements.cancelClaimBtn?.addEventListener('click', closeClaimModal);
  elements.submitClaimBtn?.addEventListener('click', handleSubmitClaim);

  // Quick Add
  elements.quickAddBtn?.addEventListener('click', handleQuickAdd);
  elements.quickAddUrl?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuickAdd();
  });
}

// Leaderboard
async function loadLeaderboard() {
  showLoading(true);

  try {
    const guidesRef = collection(db, 'guides');
    // Get all guides without ordering (avoid index requirement)
    const snapshot = await getDocs(guidesRef);
    guides = [];

    snapshot.forEach((docSnap) => {
      guides.push({ id: docSnap.id, ...docSnap.data() });
    });

    console.log('Loaded guides:', guides.length);

    // Calculate avgViewsPerPhoto for each guide
    guides.forEach(g => {
      g.avgViewsPerPhoto = g.photoCount > 0 ? Math.round((g.photoViews || 0) / g.photoCount) : 0;
    });

    // Sort by points first to assign absolute ranks
    guides.sort((a, b) => (b.points || 0) - (a.points || 0));

    // Assign absolute rank based on points (this rank never changes)
    guides.forEach((g, index) => {
      g.absoluteRank = index + 1;
    });

    // Calculate stats
    updateStats(guides);

    // Apply initial sort (photoViews) and render
    filteredGuides = [...guides];
    applySort();
    renderLeaderboard(filteredGuides);

  } catch (error) {
    console.error('Failed to load leaderboard:', error.code, error.message);
    showToast('Failed to load leaderboard: ' + error.message, 'error');

    // Show demo data if Firebase fails
    loadDemoData();
  }

  showLoading(false);
}

function loadDemoData() {
  guides = [
    { id: '1', displayName: 'Demo User', level: 1, points: 0, reviewCount: 0, photoCount: 0, photoViews: 0, country: '', avatarUrl: null, joinedThisMonth: false, leveledUpThisMonth: false, isGoogler: false, absoluteRank: 1 },
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

  // Find most recent updatedAt from guides
  let lastUpdateTime = null;
  data.forEach(g => {
    if (g.updatedAt) {
      const timestamp = g.updatedAt.toDate ? g.updatedAt.toDate() : new Date(g.updatedAt);
      if (!lastUpdateTime || timestamp > lastUpdateTime) {
        lastUpdateTime = timestamp;
      }
    }
  });

  // Format last update time
  if (lastUpdateTime) {
    const formatted = lastUpdateTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    elements.lastUpdate.textContent = `Last updated: ${formatted}`;
  } else {
    elements.lastUpdate.textContent = 'Last updated: -';
  }
}

function renderGuideRow(guide, rank, isPinned = false) {
  const rankClass = getRankBadgeClass(rank);
  const levelClass = getLevelBadgeClass(guide.level);
  const initial = (guide.displayName || 'U')[0].toUpperCase();

  // Calculate avgViewsPerPhoto if not present
  const avgViewsPerPhoto = guide.avgViewsPerPhoto ||
    (guide.photoCount > 0 ? Math.round((guide.photoViews || 0) / guide.photoCount) : 0);

  // Badges
  let badges = '';
  if (guide.status === 'pending') {
    badges += '<span class="leaderboard__badge leaderboard__badge--pending">PENDING</span>';
  } else if (guide.status === 'approved') {
    badges += '<span class="leaderboard__badge leaderboard__badge--syncing">SYNCING</span>';
  }
  // Show "Submit" badge if no country (needs to claim/verify profile)
  if (!guide.country) {
    badges += '<span class="leaderboard__badge leaderboard__badge--submit">SUBMIT</span>';
  }
  if (guide.joinedThisMonth) badges += '<span class="leaderboard__badge leaderboard__badge--new">NEW</span>';
  if (guide.leveledUpThisMonth) badges += '<span class="leaderboard__badge leaderboard__badge--levelup">LEVEL UP</span>';
  if (guide.isGoogler) badges += '<span class="leaderboard__badge leaderboard__badge--googler">GOOGLER</span>';

  // Row class
  let rowClass = 'leaderboard__row';
  if (isPinned) {
    rowClass += ' leaderboard__row--pinned';
  } else if (rank === 1) {
    rowClass += ' leaderboard__row--top-1';
  } else if (rank === 2) {
    rowClass += ' leaderboard__row--top-2';
  } else if (rank === 3) {
    rowClass += ' leaderboard__row--top-3';
  }

  // Avatar class - add syncing spinner for approved status
  const isSyncing = guide.status === 'approved';
  const avatarClass = isSyncing ? 'avatar avatar--syncing' : 'avatar';

  return `
    <div class="${rowClass}" data-id="${guide.id}" data-name="${guide.displayName}">
      <div class="leaderboard__rank">
        <span class="rank-badge ${rankClass}">${rank}</span>
      </div>
      <div class="leaderboard__user">
        <div class="${avatarClass}">
          ${guide.avatarUrl ? `<img src="${guide.avatarUrl}" alt="">` : initial}
        </div>
        <div class="leaderboard__user-info">
          <span class="leaderboard__user-name">${guide.displayName || 'Unknown'}${isPinned ? ' (You)' : ''}</span>
          <span class="leaderboard__user-country ${!guide.country ? 'leaderboard__user-country--empty' : ''}" data-country="${guide.country || ''}">${guide.country || 'Set country'}</span>
        </div>
        <div class="leaderboard__user-badges">${badges}</div>
      </div>
      <div class="leaderboard__level">
        <span class="level-badge ${levelClass}">${guide.level || 0}</span>
      </div>
      <div class="leaderboard__photo-views" title="${formatWithCommas(guide.photoViews || 0)}">${formatCompactNumber(guide.photoViews || 0)}</div>
      <div class="leaderboard__photos" title="${formatWithCommas(guide.photoCount || 0)}">${formatCompactNumber(guide.photoCount || 0)}</div>
      <div class="leaderboard__avg-views" title="${formatWithCommas(avgViewsPerPhoto)}">${formatCompactNumber(avgViewsPerPhoto)}</div>
      <div class="leaderboard__points" title="${formatWithCommas(guide.points || 0)}">${formatCompactNumber(guide.points || 0)}</div>
      <div class="leaderboard__reviews" title="${formatWithCommas(guide.reviewCount || 0)}">${formatCompactNumber(guide.reviewCount || 0)}</div>
    </div>
  `;
}

function renderLeaderboard(data) {
  if (data.length === 0) {
    elements.leaderboardBody.innerHTML = '';
    elements.emptyState.hidden = false;
    return;
  }

  elements.emptyState.hidden = true;

  // Check if current user is in the list
  let myGuide = null;
  let myRank = -1;
  if (currentUser) {
    myRank = data.findIndex(g => g.id === currentUser.uid || g.uid === currentUser.uid);
    if (myRank >= 0) {
      myGuide = data[myRank];
    }
  }

  // Build pinned row if user is logged in but not in top visible positions
  let pinnedHtml = '';
  if (myGuide && myRank > 4) {
    pinnedHtml = renderGuideRow(myGuide, myGuide.absoluteRank, true);
  }

  // Use absoluteRank (points-based) instead of display index
  const html = data.map((guide) => renderGuideRow(guide, guide.absoluteRank, false)).join('');

  elements.leaderboardBody.innerHTML = pinnedHtml + html;

  // Add click handlers for rows
  elements.leaderboardBody.querySelectorAll('.leaderboard__row').forEach(row => {
    // Right-click for report
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (currentUser) {
        openReportModal(row.dataset.id, row.dataset.name);
      }
    });

    // Left-click for claim (if user is logged in and name matches)
    row.addEventListener('click', (e) => {
      // Don't trigger if clicking on country
      if (e.target.closest('.leaderboard__user-country')) return;

      const guideId = row.dataset.id;
      const guideName = row.dataset.name;

      // Check if user can claim this profile
      if (currentUser && canClaimProfile(guideName)) {
        const guide = guides.find(g => g.id === guideId);
        if (guide) {
          openClaimModal(guideId, guide.country);
        }
      }
    });
  });

  // Add click handlers for country filter / claim
  elements.leaderboardBody.querySelectorAll('.leaderboard__user-country').forEach(countryEl => {
    countryEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const country = countryEl.dataset.country;
      const row = countryEl.closest('.leaderboard__row');
      const guideId = row?.dataset.id;
      const guideName = row?.dataset.name;

      if (country) {
        // Has country - filter by it
        filterByCountry(country);
      } else {
        // No country - show claim guidance
        if (!currentUser) {
          showToast('Log in with Google to claim this profile', 'info');
        } else if (!canClaimProfile(guideName)) {
          showToast('Your Google name must match the profile name to claim', 'info');
        } else {
          // Can claim - open modal
          const guide = guides.find(g => g.id === guideId);
          if (guide) {
            openClaimModal(guideId, guide.country);
          }
        }
      }
    });
  });
}

// Check if logged-in user can claim this profile (name matching)
function canClaimProfile(guideName) {
  if (!currentUser || !guideName) return false;

  const googleName = currentUser.displayName?.toLowerCase().trim();
  const mapsName = guideName.toLowerCase().trim();

  // Exact match or close match
  return googleName === mapsName;
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
  const sortBy = elements.sortBy.value;
  currentSort = { field: sortBy, direction: 'desc' };
  updateSortButtons();
  applySort();
  renderLeaderboard(filteredGuides);
}

function handleHeaderSort(btn) {
  const field = btn.dataset.sort;

  // Toggle direction if same field, otherwise default to desc
  if (currentSort.field === field) {
    currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
  } else {
    currentSort.field = field;
    currentSort.direction = 'desc';
  }

  updateSortButtons();
  applySort();
  renderLeaderboard(filteredGuides);
}

function updateSortButtons() {
  document.querySelectorAll('.leaderboard__sort-btn').forEach(btn => {
    btn.classList.remove('active', 'asc', 'desc');
    if (btn.dataset.sort === currentSort.field) {
      btn.classList.add('active', currentSort.direction);
    }
  });

  // Sync dropdown if exists
  if (elements.sortBy) {
    elements.sortBy.value = currentSort.field;
  }
}

function applySort() {
  const { field, direction } = currentSort;

  // rank 정렬은 points 기준으로 정렬 (rank는 points 순위이므로)
  const sortField = field === 'rank' ? 'points' : field;

  filteredGuides.sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    return direction === 'desc' ? bVal - aVal : aVal - bVal;
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

// State for country filter
let currentCountryFilter = null;

function filterByCountry(country) {
  // Toggle: 같은 국가 다시 클릭하면 필터 해제
  if (currentCountryFilter === country) {
    currentCountryFilter = null;
    filteredGuides = [...guides];
    elements.searchInput.value = '';
  } else {
    currentCountryFilter = country;
    filteredGuides = guides.filter(g => g.country === country);
    // 검색창에 국가 표시
    elements.searchInput.value = country;
  }

  applySort();
  renderLeaderboard(filteredGuides);
}

// Claim Modal
function openClaimModal(guideId, currentCountry) {
  elements.claimTargetId.value = guideId;
  elements.claimCountry.value = currentCountry || '';
  elements.claimModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeClaimModal() {
  elements.claimModal.hidden = true;
  document.body.style.overflow = '';
  elements.claimCountry.value = '';
}

async function handleSubmitClaim() {
  if (!currentUser) {
    showToast('Please login first', 'error');
    return;
  }

  const guideId = elements.claimTargetId.value;
  const country = elements.claimCountry.value;

  if (!country) {
    showToast('Please select a country', 'error');
    return;
  }

  try {
    // Update the guide document with country and link to user
    const guideRef = doc(db, 'guides', guideId);
    await updateDoc(guideRef, {
      country: country,
      claimedBy: currentUser.uid,
      claimedAt: serverTimestamp()
    });

    showToast('Profile claimed successfully!', 'success');
    closeClaimModal();

    // Reload to show updated data
    await loadLeaderboard();

  } catch (error) {
    console.error('Claim failed:', error);
    showToast('Failed to claim profile: ' + error.message, 'error');
  }
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

// Countdown Timer
function initCountdown() {
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  if (!elements.countdown) return;

  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const utcSecond = now.getUTCSeconds();

  // Next update times: UTC 03:00 and 15:00 (KST 12:00 and 00:00)
  let nextUpdateHour;
  if (utcHour < 3) {
    nextUpdateHour = 3;
  } else if (utcHour < 15) {
    nextUpdateHour = 15;
  } else {
    nextUpdateHour = 27; // 다음날 03:00 (24 + 3)
  }

  const hoursLeft = nextUpdateHour - utcHour - 1;
  const minutesLeft = 59 - utcMinute;
  const secondsLeft = 59 - utcSecond;

  const h = String(hoursLeft).padStart(2, '0');
  const m = String(minutesLeft).padStart(2, '0');
  const s = String(secondsLeft).padStart(2, '0');

  elements.countdown.textContent = `${h}:${m}:${s}`;
}

// Extract contrib ID from Google Maps profile URL
function extractContribId(url) {
  // https://www.google.com/maps/contrib/123456789012345678901/...
  const match = url.match(/google\.com\/maps\/contrib\/(\d+)/);
  return match ? match[1] : null;
}

// Trigger GitHub Actions scraper via Cloudflare Worker proxy
async function triggerScraper(userId) {
  try {
    const response = await fetch(
      'https://google-localguides-leaderboard-github-action-trigger.antcow0706.workers.dev',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('Scraper triggered successfully for:', userId);
      return true;
    } else {
      console.error('Failed to trigger scraper');
      return false;
    }
  } catch (error) {
    console.error('Error triggering scraper:', error);
    return false;
  }
}

// Quick Add Profile (no login required - directly saves to Firestore)
async function handleQuickAdd() {
  const url = elements.quickAddUrl?.value?.trim();

  if (!url) {
    showToast('Please enter a Google Maps profile URL', 'error');
    return;
  }

  // Validate URL format
  const isValidUrl = url.includes('google.com/maps/contrib/') || url.includes('maps.app.goo.gl');
  if (!isValidUrl) {
    showToast('Please enter a valid Google Maps profile URL', 'error');
    return;
  }

  // Extract contrib ID for document ID
  const contribId = extractContribId(url);
  if (!contribId) {
    showToast('Could not extract profile ID from URL. Please use the full profile URL.', 'error');
    return;
  }

  // Check if already exists (by document ID or by URL)
  const existingDoc = await getDoc(doc(db, 'guides', contribId));
  if (existingDoc.exists()) {
    showToast('This profile is already on the leaderboard!', 'error');
    return;
  }

  // Also check if URL already exists in any document (for older registrations with uid as doc ID)
  const urlQuery = query(collection(db, 'guides'), where('mapsProfileUrl', '==', url));
  const urlSnapshot = await getDocs(urlQuery);
  if (!urlSnapshot.empty) {
    showToast('This profile is already on the leaderboard!', 'error');
    return;
  }

  // Disable button while saving
  const btn = elements.quickAddBtn;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span>Adding...</span>';

  try {
    // Check if user is logged in
    if (!currentUser) {
      showToast('Please log in to add a profile', 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }

    // Save directly to guides collection (no country, no displayName - scraper will fill these)
    const guideData = {
      mapsProfileUrl: url,
      displayName: 'Loading...', // Will be updated by scraper
      country: '', // Empty - user can claim and set country later
      level: 0,
      points: 0,
      photoCount: 0,
      photoViews: 0,
      reviewCount: 0,
      status: 'approved', // Will become 'active' after first scrape
      uid: currentUser.uid, // Include uid for Firestore rules
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Use contrib ID as document ID
    await setDoc(doc(db, 'guides', contribId), guideData);

    showToast('Profile added! Syncing data...', 'success');
    elements.quickAddUrl.value = '';

    // Trigger scraper for this profile
    const scraperTriggered = await triggerScraper(contribId);
    if (scraperTriggered) {
      showToast('Data sync started. Results in ~1 minute.', 'success');
    }

    // Reload leaderboard to show new entry
    await loadLeaderboard();

  } catch (error) {
    console.error('Failed to add profile:', error);
    showToast('Failed to add profile: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
