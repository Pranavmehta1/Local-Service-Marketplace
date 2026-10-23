/**
 * LocalFix Landing Page Logic
 * Renders service categories, top-rated workers, testimonials, and interactive hero.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderNavbarAndFooterLogo();
  renderServiceCards();
  renderTopWorkers();
  renderTestimonials();
  initTypingAnimation();
  initScrollReveal();
  initStatCounters();
  initNavbarScroll();
  initHeroSearch();
  window.addEventListener('lf:data-changed', () => initStatCounters());
});

function renderNavbarAndFooterLogo() {
  const navLogo = document.getElementById('landingNavLogo');
  if (navLogo) navLogo.innerHTML = lfBrandLogo(false);

  const footLogo = document.getElementById('landingFootLogo');
  if (footLogo) footLogo.innerHTML = lfBrandLogo(true);
}

// Service Category Cards (Clickable cards leading to search)
function renderServiceCards() {
  const el = document.getElementById('serviceCards');
  if (!el) return;

  el.innerHTML = LF_SERVICES.map((s) => `
    <div class="col-md-6 col-lg-3">
      <div class="lf-card lf-service-card lf-reveal d-flex flex-column justify-content-between" onclick="window.location.href='pages/worker-search.html?category=${s.id}'">
        <div>
          <div class="lf-service-icon"><i class="bi ${s.icon}"></i></div>
          <h5 class="mb-1 fw-bold fs-6">${s.name}</h5>
          <p class="text-muted small mb-2">${s.desc}</p>
        </div>
        <div>
          <div class="small fw-semibold text-primary mb-3">${s.count}</div>
          <a href="pages/worker-search.html?category=${s.id}" class="btn btn-lf-outline btn-sm w-100" onclick="event.stopPropagation();">
            Find Workers <i class="bi bi-arrow-right ms-1"></i>
          </a>
        </div>
      </div>
    </div>
  `).join('');
}

// Top Rated Workers
function renderTopWorkers() {
  const el = document.getElementById('topWorkers');
  if (!el) return;

  const workers = window.Storage ? window.Storage.getWorkers() : [];
  const top = [...workers].sort((a, b) => b.rating - a.rating).slice(0, 3);

  el.innerHTML = top.map((w) => `
    <div class="col-md-4">
      <div class="lf-card lf-worker-card lf-reveal h-100 d-flex flex-column justify-content-between" onclick="window.location.href='pages/worker-profile.html?id=${w.id}'" style="cursor:pointer;">
        <div>
          <div class="d-flex gap-3 align-items-start mb-3">
            <div class="lf-worker-avatar">${w.name.split(' ').map((n) => n[0]).join('')}</div>
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h6 class="mb-0 fw-bold">${w.name}</h6>
                <span class="lf-badge-verified"><i class="bi bi-patch-check-fill"></i> Verified</span>
              </div>
              <div class="small text-muted">${LF_SERVICE_LABELS[w.category] || w.category} · ${w.experience} yrs exp</div>
              <div class="small mt-1 d-flex align-items-center gap-1">
                ${lfRenderStars(w.rating)}
                <span class="fw-bold ms-1 text-dark">${w.rating}</span>
                <span class="text-muted">(${w.reviewsCount || 100}+)</span>
              </div>
            </div>
          </div>
          <div class="small text-muted mb-3"><i class="bi bi-geo-alt text-primary me-1"></i>${w.area}</div>
        </div>

        <div class="d-flex justify-content-between align-items-center pt-3 border-top" onclick="event.stopPropagation();">
          <div>
            <span class="small text-muted d-block" style="font-size:0.7rem;">Visiting Fee</span>
            <span class="lf-mono fw-bold fs-5 text-dark">₹${w.price}</span>
          </div>
          <div class="d-flex gap-2">
            <a href="pages/worker-profile.html?id=${w.id}" class="btn btn-lf-outline btn-sm">Profile</a>
            <a href="pages/booking.html?worker=${w.id}" class="btn btn-lf-primary btn-sm"><i class="bi bi-calendar-check me-1"></i>Book</a>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Testimonials
function renderTestimonials() {
  const el = document.getElementById('testimonials');
  if (!el) return;

  // Pull only genuine reviews from Storage (submitted by real authenticated users)
  const reviews = window.Storage ? window.Storage.getAllReviews() : [];

  if (!reviews || reviews.length === 0) {
    el.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <i class="bi bi-star fs-1 opacity-25 d-block mb-3"></i>
        <div class="fw-semibold mb-1">No reviews yet</div>
        <div class="small">Be the first to book a service and share your experience!</div>
        <a href="pages/auth.html?mode=register" class="btn btn-lf-outline btn-sm mt-3">Get Started</a>
      </div>
    `;
    return;
  }

  el.innerHTML = reviews.slice(0, 3).map((t) => `
    <div class="col-md-4">
      <div class="lf-testimonial lf-reveal">
        <div class="mb-2">${lfRenderStars(t.rating)}</div>
        <p class="mb-3 text-muted small lh-base">&ldquo;${t.comment}&rdquo;</p>
        <div class="fw-bold text-dark">${t.customerName || 'Verified Customer'}</div>
        <div class="small text-muted" style="font-size:0.75rem;"><i class="bi bi-geo-alt text-primary me-1"></i>${t.location || 'India'}</div>
      </div>
    </div>
  `).join('');
}

// Hero typing animation
function initTypingAnimation() {
  const el = document.getElementById('heroTyped');
  if (!el) return;

  const phrases = ['a verified electrician?', 'a trusted plumber?', 'your AC serviced?', 'a skilled carpenter?', 'water purifier fixed?'];
  let pIdx = 0, cIdx = 0, deleting = false;

  const tick = () => {
    const current = phrases[pIdx];
    el.textContent = deleting ? current.slice(0, cIdx--) : current.slice(0, cIdx++);

    let delay = deleting ? 40 : 75;
    if (!deleting && cIdx === current.length + 1) {
      delay = 1400;
      deleting = true;
    } else if (deleting && cIdx === 0) {
      deleting = false;
      pIdx = (pIdx + 1) % phrases.length;
      delay = 300;
    }
    setTimeout(tick, delay);
  };
  tick();
}

// Hero search redirection
function initHeroSearch() {
  const btn = document.getElementById('heroSearchBtn');
  const catSelect = document.getElementById('heroCategorySelect');
  const locInput = document.getElementById('heroLocInput');

  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = catSelect?.value || '';
      const query = locInput?.value.trim() || '';
      let url = 'pages/worker-search.html?';
      if (cat && cat !== 'all') url += `category=${encodeURIComponent(cat)}&`;
      if (query) url += `q=${encodeURIComponent(query)}`;
      window.location.href = url;
    });
  }
}

// Scroll reveal
function initScrollReveal() {
  const items = document.querySelectorAll('.lf-reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  setTimeout(() => document.querySelectorAll('.lf-reveal').forEach((el) => observer.observe(el)), 60);
}

// Stat counters (Live from MongoDB via backend API)
async function initStatCounters() {
  const elWorkers = document.getElementById("statRegisteredWorkers");
  const elCustomers = document.getElementById("statRegisteredCustomers");
  const elRepairs = document.getElementById("statRepairsCompleted");
  const elAreas = document.getElementById("statAreasCovered");
  const elCSAT = document.getElementById("statCustomerSatisfaction");

  const statElements = [elWorkers, elCustomers, elRepairs, elAreas, elCSAT].filter(Boolean);
  if (!statElements.length) return;

  // Set initial loading indicator if not already populated
  statElements.forEach((el) => {
    if (!el.textContent.trim()) {
      el.innerHTML = '<span class="spinner-border spinner-border-sm text-primary opacity-50" role="status"></span>';
    }
  });

  let stats;
  try {
    if (window.Storage && typeof window.Storage.getPlatformStatisticsAsync === "function") {
      stats = await window.Storage.getPlatformStatisticsAsync();
    } else if (window.LocalFixAPI) {
      stats = await window.LocalFixAPI.get('/platform/stats');
    } else if (window.Storage) {
      stats = window.Storage.getPlatformStatistics();
    }
    if (!stats || stats.success === false) throw new Error("Statistics response invalid");
  } catch (err) {
    console.warn("Could not retrieve live platform statistics:", err);
    // Do not show misleading 0 — indicate connection issue gracefully
    statElements.forEach((el) => {
      if (!el.dataset.count) {
        el.className = "lf-stat-big lf-stat-fallback";
        el.textContent = "Connecting...";
      }
    });
    return;
  }

  function setTile(el, val, fallback) {
    if (!el) return;
    if (typeof val === "number" && val > 0) {
      el.className = "lf-stat-big";
      el.dataset.count = val;
      el.dataset.suffix = "";
      el.textContent = val.toLocaleString();
    } else {
      el.className = "lf-stat-big lf-stat-fallback";
      delete el.dataset.count;
      el.textContent = fallback;
    }
  }

  setTile(elWorkers, stats.registeredWorkers, "No registered workers yet");
  setTile(elCustomers, stats.registeredCustomers, "No registered customers yet");

  if (elRepairs) {
    if (stats.repairsCompleted > 0) {
      elRepairs.className = "lf-stat-big";
      elRepairs.dataset.count = stats.repairsCompleted;
      elRepairs.dataset.suffix = "";
      elRepairs.textContent = "0";
    } else {
      elRepairs.className = "lf-stat-big lf-stat-fallback";
      delete elRepairs.dataset.count;
      elRepairs.textContent = "No completed repairs yet";
    }
  }

  if (elAreas) {
    if (stats.areasCovered > 0) {
      elAreas.className = "lf-stat-big";
      elAreas.dataset.count = stats.areasCovered;
      elAreas.dataset.suffix = "";
      elAreas.textContent = "0";
    } else {
      elAreas.className = "lf-stat-big lf-stat-fallback";
      delete elAreas.dataset.count;
      elAreas.textContent = "Areas coming soon";
    }
  }

  if (elCSAT) {
    if (stats.customerSatisfaction !== null && !isNaN(stats.customerSatisfaction)) {
      elCSAT.className = "lf-stat-big";
      elCSAT.dataset.count = stats.customerSatisfaction;
      elCSAT.dataset.suffix = "%";
      elCSAT.innerHTML = '0<span>%</span>';
    } else {
      elCSAT.className = "lf-stat-big lf-stat-fallback";
      delete elCSAT.dataset.count;
      elCSAT.textContent = "Not rated yet";
    }
  }

  const counters = document.querySelectorAll('.lf-stat-big[data-count]');
  if (!counters.length) return;

  const animate = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const duration = 1200;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const val = Math.floor(progress * target);
      el.innerHTML = val.toLocaleString() + (suffix ? `<span>${suffix}</span>` : "");
      if (progress < 1) requestAnimationFrame(step);
      else el.innerHTML = target.toLocaleString() + (suffix ? `<span>${suffix}</span>` : "");
    };
    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });

  counters.forEach((el) => observer.observe(el));
}

// Navbar scroll shadow
function initNavbarScroll() {
  const nav = document.querySelector('.lf-navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 12);
  });
}
