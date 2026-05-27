// ============================================================
// app.js — RideGuard Main Application Logic
// ============================================================

/* ───────────────────────────────────────────────────────────
   STATE
─────────────────────────────────────────────────────────── */
const state = {
  user: null,
  profile: null,
  bleDevice: null,
  bleCharacteristic: null,
  bleConnected: false,
  currentStatus: 'UNKNOWN',   // SAFE | FALL_DETECTED | UNKNOWN
  contacts: [],
  fallTimer: null,
  fallCountdown: 15,
  alarmAudio: null,
  realtimeChannel: null,
  activeTab: 'dashboard',
};

/* ───────────────────────────────────────────────────────────
   DOM REFS
─────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const DOM = {
  // Pages
  pageAuth:      $('page-auth'),
  pageApp:       $('page-app'),
  navbar:        $('navbar'),
  bottomNav:     $('bottom-nav'),

  // Auth
  tabLogin:      $('tab-login'),
  tabSignup:     $('tab-signup'),
  formLogin:     $('form-login'),
  formSignup:    $('form-signup'),
  loginEmail:    $('login-email'),
  loginPass:     $('login-pass'),
  loginError:    $('login-error'),
  signupName:    $('signup-name'),
  signupEmail:   $('signup-email'),
  signupPass:    $('signup-pass'),
  signupRole:    $('signup-role'),
  signupError:   $('signup-error'),
  btnLogin:      $('btn-login'),
  btnSignup:     $('btn-signup'),

  // Dashboard
  tabDash:       $('nav-dashboard'),
  tabFamily:     $('nav-family'),
  tabHistory:    $('nav-history'),
  tabSettings:   $('nav-settings'),

  panelDash:     $('panel-dashboard'),
  panelFamily:   $('panel-family'),
  panelHistory:  $('panel-history'),
  panelSettings: $('panel-settings'),

  // Status
  riderName:     $('rider-name'),
  helmetStatus:  $('helmet-status'),
  safetyBadge:   $('safety-badge'),
  lastUpdate:    $('last-update'),

  // BLE
  bleBtn:        $('ble-btn'),
  bleBtnLabel:   $('ble-btn-label'),
  bleBtnSub:     $('ble-btn-sub'),

  // Contacts
  contactsList:  $('contacts-list'),
  contactInput:  $('contact-input'),
  btnAddContact: $('btn-add-contact'),
  customMsg:     $('custom-msg'),
  btnSaveSettings: $('btn-save-settings'),

  // Fall overlay
  fallOverlay:   $('fall-overlay'),
  fallTimerEl:   $('fall-timer'),
  btnImOk:       $('btn-im-ok'),

  // Emergency banner
  emergencyBanner: $('emergency-banner'),
  btnCloseBanner:  $('btn-close-banner'),

  // Family
  familyList:    $('family-list'),

  // History
  historyList:   $('history-list'),

  // Settings
  settingsName:  $('settings-name'),
  settingsEmail: $('settings-email'),
  btnSaveProfile:$('btn-save-profile'),
  btnLogout:     $('btn-logout'),
  btnTestAlert:  $('btn-test-alert'),

  // Misc
  navbarStatus:  $('navbar-status'),
  toastContainer:$('toast-container'),
  loadingOverlay:$('loading-overlay'),
};

/* ───────────────────────────────────────────────────────────
   INIT
─────────────────────────────────────────────────────────── */
async function init() {
  setupAuthUI();
  await checkAuthState();
}

async function checkAuthState() {
  showLoading(true);
  try {
    const user = await getCurrentUser();
    if (user) {
      state.user = user;
      await loadProfile();
      showApp();
    } else {
      showAuth();
    }
  } catch (e) {
    showAuth();
  } finally {
    showLoading(false);
  }
}

function showAuth() {
  DOM.pageAuth.style.display = 'flex';
  DOM.pageApp.style.display  = 'none';
}

function showApp() {
  DOM.pageAuth.style.display = 'none';
  DOM.pageApp.style.display  = 'block';
  setupAppUI();
  navigateTo('dashboard');
}

/* ───────────────────────────────────────────────────────────
   AUTH UI
─────────────────────────────────────────────────────────── */
function setupAuthUI() {
  // Tab switching
  DOM.tabLogin.addEventListener('click', () => switchAuthTab('login'));
  DOM.tabSignup.addEventListener('click', () => switchAuthTab('signup'));

  // Login
  DOM.btnLogin.addEventListener('click', handleLogin);
  DOM.loginEmail.addEventListener('keydown', e => e.key === 'Enter' && DOM.loginPass.focus());
  DOM.loginPass.addEventListener('keydown',  e => e.key === 'Enter' && handleLogin());

  // Sign up
  DOM.btnSignup.addEventListener('click', handleSignup);
}

function switchAuthTab(tab) {
  if (tab === 'login') {
    DOM.tabLogin.classList.add('active');
    DOM.tabSignup.classList.remove('active');
    DOM.formLogin.classList.add('active');
    DOM.formSignup.classList.remove('active');
  } else {
    DOM.tabSignup.classList.add('active');
    DOM.tabLogin.classList.remove('active');
    DOM.formSignup.classList.add('active');
    DOM.formLogin.classList.remove('active');
  }
  DOM.loginError.classList.remove('show');
  DOM.signupError.classList.remove('show');
}

async function handleLogin() {
  const email = DOM.loginEmail.value.trim();
  const pass  = DOM.loginPass.value;
  if (!email || !pass) { showError('login', 'Please fill in all fields.'); return; }

  setLoading(DOM.btnLogin, true, 'Signing in…');
  try {
    const data = await signIn(email, pass);
    state.user = data.user;
    await loadProfile();
    showApp();
  } catch (e) {
    showError('login', e.message || 'Login failed. Please try again.');
  } finally {
    setLoading(DOM.btnLogin, false, '🔑 Sign In');
  }
}

async function handleSignup() {
  const name  = DOM.signupName.value.trim();
  const email = DOM.signupEmail.value.trim();
  const pass  = DOM.signupPass.value;
  const role  = DOM.signupRole.value;
  if (!name || !email || !pass) { showError('signup', 'Please fill in all fields.'); return; }
  if (pass.length < 6) { showError('signup', 'Password must be at least 6 characters.'); return; }

  setLoading(DOM.btnSignup, true, 'Creating account…');
  try {
    const data = await signUp(email, pass, name, role);
    state.user = data.user;
    await loadProfile();
    showApp();
    showToast('Account created! Welcome to RideGuard 🏍️', 'success');
  } catch (e) {
    showError('signup', e.message || 'Sign up failed. Please try again.');
  } finally {
    setLoading(DOM.btnSignup, false, '🚀 Create Account');
  }
}

function showError(form, msg) {
  const el = form === 'login' ? DOM.loginError : DOM.signupError;
  el.textContent = msg;
  el.classList.add('show');
}

/* ───────────────────────────────────────────────────────────
   PROFILE
─────────────────────────────────────────────────────────── */
async function loadProfile() {
  try {
    state.profile = await getUserProfile(state.user.id);
    state.contacts = state.profile.emergency_contacts || [];
  } catch (e) {
    // Profile might not exist yet for fresh users
    state.profile = { name: state.user.email, role: 'rider', emergency_contacts: [], custom_message: '' };
  }
}

/* ───────────────────────────────────────────────────────────
   APP UI SETUP
─────────────────────────────────────────────────────────── */
function setupAppUI() {
  // Bottom nav
  DOM.tabDash.addEventListener('click',     () => navigateTo('dashboard'));
  DOM.tabFamily.addEventListener('click',   () => navigateTo('family'));
  DOM.tabHistory.addEventListener('click',  () => navigateTo('history'));
  DOM.tabSettings.addEventListener('click', () => navigateTo('settings'));

  // BLE
  DOM.bleBtn.addEventListener('click', handleBLEConnect);

  // Contacts
  DOM.btnAddContact.addEventListener('click', addContact);
  DOM.contactInput.addEventListener('keydown', e => e.key === 'Enter' && addContact());

  // Save settings
  DOM.btnSaveSettings.addEventListener('click', saveRiderSettings);

  // Fall overlay
  DOM.btnImOk.addEventListener('click', handleImOk);

  // Emergency banner
  DOM.btnCloseBanner.addEventListener('click', () => {
    DOM.emergencyBanner.classList.remove('show');
  });

  // Settings page
  DOM.btnSaveProfile.addEventListener('click', saveProfile);
  DOM.btnLogout.addEventListener('click', handleLogout);
  DOM.btnTestAlert.addEventListener('click', triggerTestFall);

  // Setup realtime subscription
  setupRealtimeSubscription();

  // Render initial UI
  renderStatusCard();
  renderContacts();
  renderSettingsPanel();
}

/* ───────────────────────────────────────────────────────────
   NAVIGATION
─────────────────────────────────────────────────────────── */
function navigateTo(tab) {
  state.activeTab = tab;

  // Panels
  ['dashboard', 'family', 'history', 'settings'].forEach(t => {
    $(`panel-${t}`).style.display = t === tab ? 'block' : 'none';
  });

  // Nav items
  ['dashboard', 'family', 'history', 'settings'].forEach(t => {
    $(`nav-${t}`).classList.toggle('active', t === tab);
  });

  // Load tab-specific data
  if (tab === 'history') loadHistory();
  if (tab === 'family')  loadFamilyPortal();
}

/* ───────────────────────────────────────────────────────────
   STATUS CARD
─────────────────────────────────────────────────────────── */
function renderStatusCard() {
  const name = state.profile?.name || 'Rider';
  const role = state.profile?.role || 'rider';

  if (DOM.riderName) DOM.riderName.textContent = name;

  // Settings prefill
  if (DOM.settingsName) DOM.settingsName.value  = state.profile?.name  || '';
  if (DOM.settingsEmail) DOM.settingsEmail.value = state.user?.email   || '';

  updateStatusBadge(state.currentStatus);
  updateLastUpdate();
}

function updateStatusBadge(status) {
  state.currentStatus = status;
  if (!DOM.safetyBadge) return;

  const configs = {
    SAFE:          { cls: 'safe',    dot: 'safe',    icon: '✅', text: 'SAFE' },
    FALL_DETECTED: { cls: 'warning', dot: 'warning', icon: '⚠️', text: 'FALL DETECTED' },
    EMERGENCY:     { cls: 'danger',  dot: 'danger',  icon: '🚨', text: 'EMERGENCY' },
    UNKNOWN:       { cls: 'safe',    dot: 'safe',    icon: '💙', text: 'MONITORING' },
  };

  const cfg = configs[status] || configs.UNKNOWN;
  DOM.safetyBadge.className = `status-badge ${cfg.cls}`;
  DOM.safetyBadge.innerHTML = `
    <span class="status-dot ${cfg.dot}"></span>
    ${cfg.icon} ${cfg.text}
  `;
  updateLastUpdate();
}

function updateLastUpdate() {
  if (DOM.lastUpdate) {
    DOM.lastUpdate.textContent = 'Last update: ' + new Date().toLocaleTimeString();
  }
}

/* ───────────────────────────────────────────────────────────
   WEB BLUETOOTH
─────────────────────────────────────────────────────────── */
async function handleBLEConnect() {
  if (state.bleConnected) {
    disconnectBLE();
    return;
  }

  if (!navigator.bluetooth) {
    showToast('Web Bluetooth is not supported in this browser. Try Chrome on Android.', 'error');
    return;
  }

  setLoading(DOM.bleBtn, true, '🔵 Scanning…');
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'RideGuard' }, { namePrefix: 'RG-' }],
      optionalServices: ['12345678-1234-1234-1234-123456789abc']
    });

    state.bleDevice = device;
    device.addEventListener('gattserverdisconnected', onBLEDisconnected);

    const server  = await device.gatt.connect();
    const service = await server.getPrimaryService('12345678-1234-1234-1234-123456789abc');
    const char    = await service.getCharacteristic('87654321-4321-4321-4321-cba987654321');

    state.bleCharacteristic = char;
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', onBLEMessage);

    state.bleConnected = true;
    updateBLEUI(true);
    showToast('Helmet connected! 🏍️ You\'re protected.', 'success');
    DOM.navbarStatus.className = 'navbar-status connected';

    // Sync contacts + rider info to ESP32
    await sendRiderInfoToBLE();

  } catch (e) {
    if (e.name !== 'NotFoundError') {
      showToast('Connection failed: ' + e.message, 'error');
    }
  } finally {
    resetBLEButton();
  }
}

function onBLEMessage(event) {
  const decoder = new TextDecoder('utf-8');
  const msg     = decoder.decode(event.target.value).trim();
  console.log('[BLE] Received:', msg);

  if (msg === 'FALL_DETECTED') {
    handleFallDetected();
  } else if (msg === 'SAFE') {
    updateStatusBadge('SAFE');
    showToast('Helmet reports: All clear ✅', 'success');
  }
}

function onBLEDisconnected() {
  state.bleConnected = false;
  state.bleCharacteristic = null;
  updateBLEUI(false);
  DOM.navbarStatus.className = 'navbar-status';
  showToast('Helmet disconnected. Tap to reconnect.', 'warning');
}

function disconnectBLE() {
  if (state.bleDevice && state.bleDevice.gatt.connected) {
    state.bleDevice.gatt.disconnect();
  }
  state.bleConnected = false;
  updateBLEUI(false);
}

function updateBLEUI(connected) {
  DOM.bleBtn.className = 'ble-btn' + (connected ? ' connected' : '');
  DOM.bleBtnLabel.textContent = connected ? 'Helmet Connected' : 'Connect Helmet';
  DOM.bleBtnSub.textContent   = connected
    ? '🟢 Live monitoring active'
    : 'Tap to pair via Bluetooth';
  const icon = DOM.bleBtn.querySelector('.ble-btn-icon');
  if (icon) icon.textContent = connected ? '🔵' : '📡';
}

function resetBLEButton() {
  setLoading(DOM.bleBtn, false);
  updateBLEUI(state.bleConnected);
}

async function sendBLEMessage(msg) {
  if (!state.bleCharacteristic) return;
  try {
    const encoder = new TextEncoder();
    await state.bleCharacteristic.writeValue(encoder.encode(msg));
  } catch (e) {
    console.error('[BLE] Write error:', e);
  }
}

/* ───────────────────────────────────────────────────────────
   FALL DETECTION
─────────────────────────────────────────────────────────── */
function handleFallDetected() {
  updateStatusBadge('FALL_DETECTED');
  startAlarm();
  showFallOverlay();
}

function showFallOverlay() {
  DOM.fallOverlay.classList.add('show');
  DOM.fallTimerEl.textContent = '15';
  state.fallCountdown = 15;

  // Vibrate if supported
  if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);

  state.fallTimer = setInterval(async () => {
    state.fallCountdown--;
    DOM.fallTimerEl.textContent = state.fallCountdown;

    // Change color as time runs out
    if (state.fallCountdown <= 5) {
      DOM.fallTimerEl.style.color = 'var(--danger)';
      DOM.fallTimerEl.style.borderColor = 'var(--danger)';
    }

    if (state.fallCountdown <= 0) {
      clearInterval(state.fallTimer);
      await confirmEmergency();
    }
  }, 1000);
}

function hideFallOverlay() {
  DOM.fallOverlay.classList.remove('show');
  clearInterval(state.fallTimer);
  DOM.fallTimerEl.style.color = '';
  DOM.fallTimerEl.style.borderColor = '';
}

async function handleImOk() {
  hideFallOverlay();
  stopAlarm();
  updateStatusBadge('SAFE');
  await sendBLEMessage('CANCEL');
  showToast('Glad you\'re okay! Stay safe. ✅', 'success');

  // Log cancelled alert
  try {
    if (state.user) {
      await insertAlert(state.user.id, 'CANCELLED');
    }
  } catch (e) { /* silent */ }
}

async function confirmEmergency() {
  hideFallOverlay();
  updateStatusBadge('EMERGENCY');
  DOM.navbarStatus.className = 'navbar-status alert';

  await sendBLEMessage('CONFIRM');

  // Insert alert into Supabase
  try {
    if (state.user) {
      await insertAlert(state.user.id, 'CONFIRMED');
    }
  } catch (e) {
    console.error('Alert insert failed:', e);
    showToast('Failed to send alert to server.', 'error');
  }

  showEmergencyBanner('Emergency confirmed! Help is being notified. 🚨');
  showToast('🚨 EMERGENCY ALERT SENT', 'error');

  // Keep alarm going
}

function triggerTestFall() {
  showToast('🧪 Test fall triggered!', 'warning');
  handleFallDetected();
}

/* ───────────────────────────────────────────────────────────
   ALARM SYSTEM
─────────────────────────────────────────────────────────── */
function startAlarm() {
  stopAlarm(); // reset first

  // Create alarm using Web Audio API
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.3);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);

    // Loop-like effect using a repeating pattern
    let t = ctx.currentTime;
    const pattern = [880, 660, 880, 660, 1100, 660];
    for (let i = 0; i < 60; i++) {
      osc.frequency.setValueAtTime(pattern[i % pattern.length], t + i * 0.25);
    }

    osc.start(ctx.currentTime);
    state.alarmAudio = { ctx, osc, gain };
  } catch (e) {
    console.warn('Audio context failed:', e);
  }
}

function stopAlarm() {
  if (state.alarmAudio) {
    try {
      state.alarmAudio.osc.stop();
      state.alarmAudio.ctx.close();
    } catch (e) { /* silent */ }
    state.alarmAudio = null;
  }
}

/* ───────────────────────────────────────────────────────────
   EMERGENCY BANNER
─────────────────────────────────────────────────────────── */
function showEmergencyBanner(msg) {
  const textEl = DOM.emergencyBanner.querySelector('.emergency-banner-text');
  if (textEl) textEl.innerHTML = `🚨 ${msg}`;
  DOM.emergencyBanner.classList.add('show');
}

/* ───────────────────────────────────────────────────────────
   CONTACTS
─────────────────────────────────────────────────────────── */
function addContact() {
  const val = DOM.contactInput.value.trim();
  if (!val) return;
  if (state.contacts.includes(val)) {
    showToast('Contact already added.', 'warning');
    return;
  }
  if (state.contacts.length >= 5) {
    showToast('Maximum 5 contacts allowed.', 'warning');
    return;
  }
  state.contacts.push(val);
  DOM.contactInput.value = '';
  renderContacts();
}

function removeContact(index) {
  state.contacts.splice(index, 1);
  renderContacts();
}

function renderContacts() {
  if (!DOM.contactsList) return;
  DOM.contactsList.innerHTML = '';
  state.contacts.forEach((c, i) => {
    const tag = document.createElement('div');
    tag.className = 'contact-tag animate-in';
    tag.innerHTML = `📞 ${c} <button onclick="removeContact(${i})">×</button>`;
    DOM.contactsList.appendChild(tag);
  });
}

async function saveRiderSettings() {
  if (!state.user) return;
  const msg = DOM.customMsg?.value || '';
  setLoading(DOM.btnSaveSettings, true, 'Saving…');
  try {
    await updateUserProfile(state.user.id, {
      emergency_contacts: state.contacts,
      custom_message: msg
    });
    state.profile.emergency_contacts = state.contacts;
    state.profile.custom_message     = msg;
    showToast('Settings saved ✓', 'success');
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
  } finally {
    setLoading(DOM.btnSaveSettings, false, '💾 Save Settings');
  }
}

/* ───────────────────────────────────────────────────────────
   SETTINGS PANEL
─────────────────────────────────────────────────────────── */
function renderSettingsPanel() {
  if (DOM.settingsName)  DOM.settingsName.value  = state.profile?.name  || '';
  if (DOM.settingsEmail) DOM.settingsEmail.value  = state.user?.email   || '';
  if (DOM.customMsg)     DOM.customMsg.value      = state.profile?.custom_message || '';
}

async function saveProfile() {
  if (!state.user) return;
  const name = DOM.settingsName?.value.trim();
  if (!name) { showToast('Name cannot be empty.', 'error'); return; }

  setLoading(DOM.btnSaveProfile, true, 'Saving…');
  try {
    await updateUserProfile(state.user.id, { name });
    state.profile.name = name;
    if (DOM.riderName) DOM.riderName.textContent = name;
    showToast('Profile updated ✓', 'success');
  } catch (e) {
    showToast('Failed to update profile.', 'error');
  } finally {
    setLoading(DOM.btnSaveProfile, false, '💾 Save Profile');
  }
}

async function handleLogout() {
  try {
    stopAlarm();
    disconnectBLE();
    if (state.realtimeChannel) {
      rgDB.removeChannel(state.realtimeChannel);
    }
    await signOut();
    state.user = null;
    state.profile = null;
    state.contacts = [];
    showAuth();
  } catch (e) {
    showToast('Logout failed.', 'error');
  }
}

/* ───────────────────────────────────────────────────────────
   HISTORY
─────────────────────────────────────────────────────────── */
async function loadHistory() {
  if (!DOM.historyList) return;
  DOM.historyList.innerHTML = '<div class="loader"></div>';
  try {
    const alerts = await getAlertHistory(state.user.id, 20);
    renderHistory(alerts);
  } catch (e) {
    DOM.historyList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Could not load history.</div></div>';
  }
}

function renderHistory(alerts) {
  if (!DOM.historyList) return;
  if (!alerts || alerts.length === 0) {
    DOM.historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏍️</div>
        <div class="empty-state-text">No alerts yet. Ride safe!</div>
      </div>`;
    return;
  }

  DOM.historyList.innerHTML = '';
  alerts.forEach((a, i) => {
    const div = document.createElement('div');
    div.className = 'alert-item animate-in';
    div.style.animationDelay = `${i * 0.05}s`;

    const isConfirmed = a.status === 'CONFIRMED';
    const date = new Date(a.created_at);
    div.innerHTML = `
      <div class="alert-icon ${isConfirmed ? 'confirmed' : 'cancelled'}">
        ${isConfirmed ? '🚨' : '✅'}
      </div>
      <div class="alert-info">
        <div class="alert-status">${isConfirmed ? 'Emergency Confirmed' : 'Fall Cancelled'}</div>
        <div class="alert-time">${date.toLocaleDateString()} at ${date.toLocaleTimeString()}</div>
      </div>
      <span class="badge ${isConfirmed ? '' : 'badge-blue'}" style="${isConfirmed ? 'background:#FEE2E2;color:#DC2626' : ''}">
        ${a.status}
      </span>`;
    DOM.historyList.appendChild(div);
  });
}

/* ───────────────────────────────────────────────────────────
   FAMILY PORTAL
─────────────────────────────────────────────────────────── */
async function loadFamilyPortal() {
  if (!DOM.familyList) return;
  DOM.familyList.innerHTML = '<div class="loader"></div>';
  try {
    const riders = await getAllRidersStatus();
    renderFamilyPortal(riders);
  } catch (e) {
    DOM.familyList.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-text">Could not load rider data.</div>
        </div>
      </div>`;
  }
}

function renderFamilyPortal(riders) {
  if (!DOM.familyList) return;
  if (!riders || riders.length === 0) {
    DOM.familyList.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">🏍️</div>
          <div class="empty-state-text">No riders registered yet.</div>
        </div>
      </div>`;
    return;
  }

  DOM.familyList.innerHTML = '';
  riders.forEach((r, i) => {
    const latestAlert = r.alerts && r.alerts[0];
    const status = latestAlert?.status || 'UNKNOWN';
    const isEmergency = status === 'CONFIRMED';

    const card = document.createElement('div');
    card.className = `rider-card animate-in${isEmergency ? ' danger' : ''}`;
    card.style.animationDelay = `${i * 0.07}s`;

    const lastSeen = latestAlert
      ? 'Last alert: ' + new Date(latestAlert.created_at).toLocaleString()
      : 'No alerts recorded';

    card.innerHTML = `
      <div class="rider-avatar">🏍️</div>
      <div class="rider-info">
        <div class="rider-name">${r.name}</div>
        <div class="rider-status-text">${lastSeen}</div>
      </div>
      <span class="rider-status-badge ${isEmergency ? 'danger' : (status === 'CANCELLED' ? 'safe' : 'unknown')}">
        ${isEmergency ? '🚨 SOS' : (status === 'CANCELLED' ? '✅ Safe' : '💙 OK')}
      </span>`;
    DOM.familyList.appendChild(card);
  });
}

/* ───────────────────────────────────────────────────────────
   REALTIME SUBSCRIPTIONS
─────────────────────────────────────────────────────────── */
function setupRealtimeSubscription() {
  state.realtimeChannel = subscribeToAlerts((alert) => {
    console.log('[Realtime] New alert:', alert);
    if (alert.status === 'CONFIRMED') {
      // Show emergency banner for family members or other riders
      showEmergencyBanner('Emergency detected for a rider!');
      startAlarm();
      DOM.navbarStatus.className = 'navbar-status alert';

      // Auto-stop alarm after 30s if no interaction
      setTimeout(() => {
        stopAlarm();
      }, 30000);

      // Refresh family portal if on that tab
      if (state.activeTab === 'family') loadFamilyPortal();
      if (state.activeTab === 'history') loadHistory();
    }
  });
}

/* ───────────────────────────────────────────────────────────
   UI UTILITIES
─────────────────────────────────────────────────────────── */
function showToast(msg, type = 'default') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✅', error: '🚨', warning: '⚠️', default: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${msg}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fading');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function setLoading(el, loading, newText = '') {
  if (!el) return;
  el.disabled = loading;
  if (newText) el.innerHTML = loading
    ? `<span style="width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block"></span> ${newText}`
    : newText;
}

function showLoading(show) {
  DOM.loadingOverlay.classList.toggle('show', show);
}

/* ───────────────────────────────────────────────────────────
   SEND RIDER INFO TO ESP32 VIA BLE
   Called right after Bluetooth connects.
   Sends two messages:
     CONTACTS:+63917XXXXXXX,+63928XXXXXXX
     NAME:Marco Santos
     MSG:I may have been in an accident...
─────────────────────────────────────────────────────────── */
async function sendRiderInfoToBLE() {
  if (!state.bleCharacteristic) return;

  const contacts = state.contacts || [];
  const name     = state.profile?.name        || 'Rider';
  const msg      = state.profile?.custom_message || 'I may have been in an accident. Please check on me. — RideGuard Alert';

  // Small delay to let ESP32 settle after connection
  await new Promise(r => setTimeout(r, 800));

  try {
    // 1. Send contacts as comma-separated list
    if (contacts.length > 0) {
      const contactStr = 'CONTACTS:' + contacts.join(',');
      await sendBLEMessage(contactStr);
      console.log('[BLE] Sent:', contactStr);
      await new Promise(r => setTimeout(r, 400));
    }

    // 2. Send rider name
    await sendBLEMessage('NAME:' + name);
    console.log('[BLE] Sent name:', name);
    await new Promise(r => setTimeout(r, 400));

    // 3. Send custom emergency message (truncated to 160 chars for SMS)
    const smsMsg = msg.substring(0, 160);
    await sendBLEMessage('MSG:' + smsMsg);
    console.log('[BLE] Sent message:', smsMsg);

    showToast('📡 Contacts synced to helmet', 'success');
  } catch (e) {
    console.error('[BLE] Failed to send rider info:', e);
    showToast('Could not sync contacts to helmet', 'warning');
  }
}
