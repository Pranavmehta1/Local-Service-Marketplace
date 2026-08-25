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

  const reviews = [
    {
      name: 'Neha Gupta',
      location: 'Model Town, Ludhiana',
      rating: 5,
      text: 'Booked an electrician in under 2 minutes and he arrived with testing tools within the hour. Super fast and hassle-free!',
    },
    {
      name: 'Rohit Malhotra',
      location: 'Sarabha Nagar, Ludhiana',
      rating: 5,
      text: 'The verified badge is real! The plumber who came was polite, fixed the pipe joint cleanly, and charged exactly what was shown.',
    },
    {
      name: 'Simran Kaur',
      location: 'Civil Lines, Ludhiana',
      rating: 5,
      text: 'AC servicing was top notch. The jet-pump cleaning made cooling freezing cold again. Great platform!',
    },
  ];

  el.innerHTML = reviews.map((t) => `
    <div class="col-md-4">
      <div class="lf-testimonial lf-reveal">
        <div class="mb-2">${lfRenderStars(t.rating)}</div>
        <p class="mb-3 text-muted small lh-base">&ldquo;${t.text}&rdquo;</p>
        <div class="fw-bold text-dark">${t.name}</div>
        <div class="small text-muted" style="font-size:0.75rem;"><i class="bi bi-geo-alt text-primary me-1"></i>${t.location}</div>
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

// Stat counters
function initStatCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const animate = (el) => {
    const target = Number(el.dataset.count);
    const duration = 1200;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.floor(progress * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString();
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
  }, { threshold: 0.5 });

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
