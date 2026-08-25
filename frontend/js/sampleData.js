/**
 * LocalFix — Catalog & Global UI Utilities
 * Provides service definitions, brand signature renderer, star rating renderers,
 * back button generator, and status helpers.
 */

const LF_SERVICES = [
  { id: 'electrician', name: 'Electrician', icon: 'bi-lightning-charge-fill', desc: 'Wiring, switches, fan repair & MCB fixes', count: '120+ workers' },
  { id: 'plumber', name: 'Plumber', icon: 'bi-wrench-adjustable', desc: 'Pipe leakages, taps, sanitary & water tank work', count: '95+ workers' },
  { id: 'ac_repair', name: 'AC Repair', icon: 'bi-snow', desc: 'Jet-pump servicing, gas refill & PCB repairs', count: '80+ workers' },
  { id: 'ro_repair', name: 'RO Repair', icon: 'bi-droplet-fill', desc: 'Filter change, membrane repair & TDS test', count: '50+ workers' },
  { id: 'carpenter', name: 'Carpenter', icon: 'bi-hammer', desc: 'Furniture fixes, door locks & modular fittings', count: '65+ workers' },
  { id: 'cleaning', name: 'Home Cleaning', icon: 'bi-stars', desc: 'Deep cleaning, kitchen & bathroom sanitization', count: '90+ workers' },
  { id: 'appliance_repair', name: 'Appliance Repair', icon: 'bi-cpu-fill', desc: 'Washing machine, fridge & geyser repairs', count: '70+ workers' },
];

const LF_SERVICE_LABELS = {
  electrician: 'Electrician',
  plumber: 'Plumber',
  ac_repair: 'AC Repair',
  ro_repair: 'RO Repair',
  carpenter: 'Carpenter',
  cleaning: 'Home Cleaning',
  appliance_repair: 'Appliance Repair',
};

// Dynamic worker list accessor from storage
Object.defineProperty(window, 'LF_WORKERS', {
  get: () => (window.Storage ? window.Storage.getWorkers() : []),
  configurable: true,
});

// Dynamic bookings list accessor from storage
Object.defineProperty(window, 'LF_BOOKINGS', {
  get: () => (window.Storage ? window.Storage.getAllBookings() : []),
  configurable: true,
});

// Dynamic complaints list accessor from storage
Object.defineProperty(window, 'LF_COMPLAINTS', {
  get: () => (window.Storage ? window.Storage.getAllComplaints() : []),
  configurable: true,
});

/**
 * Render crisp star icons for any numeric rating (1 to 5)
 * If rating is null or 0, shows "No ratings yet"
 */
function lfRenderStars(rating, showNumber = false) {
  if (rating === null || rating === undefined || (Number(rating) === 0 && !showNumber)) {
    return '<span class="text-muted small fst-italic">No ratings yet</span>';
  }
  const num = Math.min(Math.max(Number(rating) || 0, 0), 5);
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    if (num >= i) {
      starsHtml += '<i class="bi bi-star-fill text-warning"></i> ';
    } else if (num >= i - 0.5) {
      starsHtml += '<i class="bi bi-star-half text-warning"></i> ';
    } else {
      starsHtml += '<i class="bi bi-star text-muted opacity-50"></i> ';
    }
  }
  if (showNumber) {
    starsHtml += `<span class="ms-1 fw-bold text-dark">${num.toFixed(1)}</span>`;
  }
  return `<span class="lf-stars-wrap">${starsHtml.trim()}</span>`;
}

/**
 * Time-based greeting (used in dashboards)
 * Returns "Good morning", "Good afternoon", or "Good evening"
 */
function lfGreeting(name) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (name || 'there').split(' ')[0];
  return `${time}, ${firstName} &#128075;`;
}

/**
 * Distance surcharge badge for worker cards
 */
function lfDistanceBadge(worker) {
  const km = Number(worker.distanceKm) || 0;
  if (km > 10) {
    return `<span class="badge bg-warning text-dark ms-1" title="+&#8377;100 travel charge applies"><i class="bi bi-exclamation-triangle-fill me-1"></i>${km} km &middot; +&#8377;100</span>`;
  }
  return `<span class="badge bg-light text-muted border">${km} km</span>`;
}

/**
 * Booking progress tracker HTML (4-step)
 * Steps: requested -> accepted -> in_progress -> completed
 */
function lfBookingTracker(status) {
  const steps = [
    { key: 'requested',   label: 'Requested',   icon: 'bi-send-fill' },
    { key: 'accepted',    label: 'Accepted',     icon: 'bi-person-check-fill' },
    { key: 'in_progress', label: 'In Progress',  icon: 'bi-tools' },
    { key: 'completed',   label: 'Completed',    icon: 'bi-check-circle-fill' },
  ];
  const ORDER = { requested: 0, accepted: 1, in_progress: 2, completed: 3, cancelled: -1 };
  const currentOrder = ORDER[status] ?? 0;

  if (status === 'cancelled') {
    return `<div class="text-danger small fw-semibold"><i class="bi bi-x-circle-fill me-1"></i>Booking Cancelled</div>`;
  }

  return `
    <div class="lf-tracker d-flex align-items-center gap-0 my-2">
      ${steps.map((step, i) => {
        const isDone   = currentOrder > i;
        const isActive = currentOrder === i;
        const cls = isDone ? 'done' : isActive ? 'active' : 'pending';
        return `
          <div class="lf-tracker-step ${cls}" title="${step.label}">
            <div class="lf-tracker-dot"><i class="bi ${step.icon}"></i></div>
            <div class="lf-tracker-label">${step.label}</div>
          </div>
          ${i < steps.length - 1 ? `<div class="lf-tracker-line ${isDone ? 'done' : ''}"></div>` : ''}
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Status Badge Renderer
 */
function lfStatusBadge(status) {
  const cleanStatus = (status || 'requested').toLowerCase();
  const label = cleanStatus.replace('_', ' ');
  return `<span class="lf-status lf-status-${cleanStatus}">${label}</span>`;
}

/**
 * Priority Badge Renderer
 */
function lfPriorityBadge(priority) {
  const map = { low: 'info', medium: 'warning', high: 'danger' };
  const p = (priority || 'medium').toLowerCase();
  return `<span class="badge bg-${map[p] || 'secondary'} text-uppercase" style="font-size:0.65rem;">${p}</span>`;
}

/**
 * Empty State UI
 */
function lfEmptyState(icon = 'bi-inbox', title = 'No data available', subtitle = '', ctaText = '', ctaHref = '#') {
  return `
    <div class="lf-empty py-4 text-center">
      <div class="lf-empty-icon mb-3">
        <i class="bi ${icon}" style="font-size: 2.5rem; color: #94A3B8;"></i>
      </div>
      <div class="fw-bold text-dark fs-6 mb-1">${title}</div>
      ${subtitle ? `<p class="text-muted small mb-3 mx-auto" style="max-width: 340px;">${subtitle}</p>` : ''}
      ${ctaText ? `<a href="${ctaHref}" class="btn btn-lf-primary btn-sm px-3">${ctaText}</a>` : ''}
    </div>
  `;
}

/**
 * Universal Brand Signature Logo Component
 * Combined Symbol + Typography + Verification Tag
 */
function lfBrandLogo(isDark = false, isSmall = false) {
  const textColor = isDark ? '#FFFFFF' : '#0B1120';
  const sizeClass = isSmall ? 'lf-logo-sm' : 'lf-logo-md';

  return `
    <div class="lf-brand-signature ${sizeClass} d-inline-flex align-items-center gap-2 text-decoration-none">
      <div class="lf-logo-mark">
        <svg viewBox="0 0 40 40" width="34" height="34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="url(#lf_logo_grad)" />
          <path d="M20 9L11 16V29C11 29.5523 11.4477 30 12 30H28C28.5523 30 29 29.5523 29 29V16L20 9Z" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17 22L19.5 24.5L24 19" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="28" cy="11" r="3.5" fill="#38BDF8" stroke="#0369A1" stroke-width="1.5"/>
          <defs>
            <linearGradient id="lf_logo_grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stop-color="#0284C7"/>
              <stop offset="1" stop-color="#0B1120"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="lf-brand-text d-flex flex-column leading-none">
        <div class="lf-brand-title" style="color:${textColor}; font-family:var(--lf-font-display); font-weight:800; font-size:${isSmall ? '1.15rem' : '1.35rem'}; letter-spacing:-0.03em; line-height:1;">
          Local<span style="color:var(--lf-primary); font-weight:800;">Fix</span>
        </div>
        <span class="lf-brand-tagline" style="font-size:0.58rem; letter-spacing:0.08em; text-transform:uppercase; font-weight:700; color:${isDark ? '#94A3B8' : '#64748B'}; line-height:1.2; margin-top:2px;">
          Verified Services
        </span>
      </div>
    </div>
  `;
}

/**
 * Universal In-Built Back Button Helper
 */
function lfBackButton(fallbackHref = '../index.html', label = 'Back') {
  return `
    <button type="button" class="btn-lf-back" onclick="lfGoBack('${fallbackHref}')">
      <i class="bi bi-arrow-left"></i> <span>${label}</span>
    </button>
  `;
}

/**
 * Global back navigation handler
 */
function lfGoBack(fallbackHref = '../index.html') {
  if (window.history.length > 1 && document.referrer && document.referrer.indexOf(window.location.host) !== -1) {
    window.history.back();
  } else {
    window.location.href = fallbackHref;
  }
}

/**
 * Global Toast Notification Helper
 */
function lfShowToast(message, type = 'success') {
  let container = document.getElementById('lfToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'lfToastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  const toastId = 'toast_' + Date.now();
  const icon = type === 'success' ? 'bi-check-circle-fill text-success' : type === 'danger' ? 'bi-exclamation-triangle-fill text-danger' : 'bi-info-circle-fill text-primary';
  
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-bg-white border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icon} fs-5"></i>
          <div>${message}</div>
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', toastHtml);
  const toastEl = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(toastEl, { delay: 3500 });
  bsToast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

