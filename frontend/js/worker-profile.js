/**
 * LocalFix Worker Profile & 1-5 Star Reviews Breakdown
 * - "No ratings yet" support for unreviewed workers
 * - Real-time rating recalculation
 * - Issue reporting modal
 */

document.addEventListener("DOMContentLoaded", () => {
  const params   = new URLSearchParams(window.location.search);
  const workerId = params.get("id") || "w1";
  const worker   = window.Storage.getWorkerById(workerId);

  if (!worker) {
    document.getElementById("profileRoot").innerHTML = `
      <div class="alert alert-warning text-center py-5">
        <h5>Worker profile not found</h5>
        <a href="worker-search.html" class="btn btn-lf-primary btn-sm mt-2">Back to Workers Search</a>
      </div>
    `;
    return;
  }

  renderProfile(worker);
  initReviewModal(worker);
  initReportModal(worker);
});

function renderProfile(w) {
  const reviews      = window.Storage.getWorkerReviews(w.id);
  const totalReviews = reviews.length;
  const surcharge    = window.Storage.getDistanceSurcharge ? window.Storage.getDistanceSurcharge(w) : 0;

  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const star = Math.min(Math.max(Math.round(Number(r.rating) || 5), 1), 5);
    starCounts[star] = (starCounts[star] || 0) + 1;
  });

  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = starCounts[star] || 0;
    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, pct };
  });

  const root = document.getElementById("profileRoot");
  if (!root) return;

  const ratingHeaderHtml = w.rating !== null
    ? `<div class="mb-3 d-flex align-items-center justify-content-center gap-2">
         ${lfRenderStars(w.rating)}
         <strong class="fs-5 text-dark">${w.rating}</strong>
         <span class="text-muted small">(${totalReviews} reviews)</span>
       </div>`
    : `<div class="mb-3 text-muted small fst-italic"><i class="bi bi-star me-1"></i>No ratings yet &middot; Be the first to review!</div>`;

  const breakdownSectionHtml = totalReviews > 0
    ? `<div class="row align-items-center mb-4 g-3">
         <div class="col-sm-4 text-center border-end">
           <div class="lf-display display-4 fw-bold text-dark">${w.rating}</div>
           <div class="mb-1">${lfRenderStars(w.rating)}</div>
           <div class="text-muted small">Based on ${totalReviews} verified reviews</div>
         </div>
         <div class="col-sm-8 ps-sm-4">
           ${breakdown.map((b) => `
             <div class="lf-rating-breakdown-bar">
               <span class="small fw-semibold" style="width:38px;">${b.star} <i class="bi bi-star-fill text-warning" style="font-size:0.75rem;"></i></span>
               <div class="progress"><div class="progress-bar" style="width: ${b.pct}%;"></div></div>
               <span class="small text-muted" style="width:38px; text-align:right;">${b.pct}%</span>
             </div>
           `).join("")}
         </div>
       </div>`
    : `<div class="text-center py-4 text-muted bg-light rounded-3 mb-4">
         <i class="bi bi-star fs-3 text-muted opacity-50 d-block mb-2"></i>
         <div class="fw-semibold">No reviews written yet</div>
         <div class="small">Have you worked with ${w.name}? Click &ldquo;Rate Worker&rdquo; to share your experience!</div>
       </div>`;

  root.innerHTML = `
    <div class="row g-4">
      <!-- Left Column -->
      <div class="col-lg-4">
        <div class="lf-card p-4 text-center">
          <div class="lf-worker-avatar mx-auto mb-3" style="width:96px;height:96px;font-size:2.2rem;">
            ${w.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <h4 class="mb-1 fw-bold">${w.name}</h4>
          <div class="mb-2">
            ${w.verified ? '<span class="lf-badge-verified"><i class="bi bi-patch-check-fill"></i> Verified Service Worker</span>' : '<span class="badge bg-secondary">Verification Pending</span>'}
          </div>
          
          ${ratingHeaderHtml}

          <div class="text-muted small mb-3">
            <span class="badge bg-light text-dark border me-1">${LF_SERVICE_LABELS[w.category] || w.category}</span>
            <span>${w.experience} years experience</span>
          </div>

          <div class="d-grid gap-2">
            <a href="booking.html?worker=${w.id}" class="btn btn-lf-primary py-2">
              <i class="bi bi-calendar-check me-1"></i> Book This Worker
            </a>
            <button class="btn btn-lf-outline btn-sm" data-bs-toggle="modal" data-bs-target="#reviewModal">
              <i class="bi bi-star-fill text-warning me-1"></i> Write a Review &amp; Rate
            </button>
            <button class="btn btn-light btn-sm text-muted" data-bs-toggle="modal" data-bs-target="#reportModal">
              <i class="bi bi-flag me-1"></i> Report an Issue
            </button>
          </div>
        </div>

        <div class="lf-card p-4 mt-3">
          <h6 class="fw-bold mb-3"><i class="bi bi-info-circle text-primary me-2"></i>Worker Details</h6>
          <div class="small text-muted mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-geo-alt text-primary"></i> <span>Service Area: <strong>${w.area}</strong></span>
          </div>
          <div class="small text-muted mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-tag text-primary"></i> <span>Visit Charge: <strong class="lf-mono text-dark fs-6">&#8377;${w.price}</strong></span>
          </div>
          ${surcharge > 0 ? `<div class="small text-warning mb-2 d-flex align-items-center gap-2"><i class="bi bi-exclamation-triangle-fill"></i> <span>Long distance travel: <strong>+&#8377;${surcharge}</strong></span></div>` : ""}
          <div class="small text-muted mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-briefcase text-primary"></i> <span>Completed Jobs: <strong>${w.jobs || 0}+</strong></span>
          </div>
          <div class="small text-muted mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-clock text-primary"></i> <span>Working Hours: <strong>${w.workingHours || "09:00 AM - 08:00 PM"}</strong></span>
          </div>
          <div class="small text-muted d-flex align-items-center gap-2">
            <i class="bi bi-telephone text-primary"></i> <span>Phone: <strong>${w.phone || "+91 98765 00000"}</strong></span>
          </div>
        </div>

        <!-- Skills Card -->
        <div class="lf-card p-4 mt-3">
          <h6 class="fw-bold mb-3"><i class="bi bi-tools text-primary me-2"></i>Skills &amp; Expertise</h6>
          <div class="d-flex flex-wrap gap-1">
            ${(w.skills || ["Wiring", "Switchboard Repair", "Fan Fix", "Inverter Setup"]).map((s) => `<span class="badge bg-light text-dark border">${s}</span>`).join("")}
          </div>
        </div>

        <!-- Service Area Map Card -->
        <div class="lf-card p-4 mt-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="fw-bold mb-0"><i class="bi bi-geo-alt-fill text-danger me-1"></i> Service Coverage Map</h6>
            <span class="badge bg-light text-primary border">3 km Radius</span>
          </div>
          <div class="small text-muted mb-2">${w.area} &amp; nearby sectors</div>
          <div class="lf-map-wrapper">
            <div id="workerProfileMap" class="lf-map-container lf-map-sm"></div>
          </div>
        </div>
      </div>

      <!-- Right Column: About, Rating Breakdown & Customer Reviews -->
      <div class="col-lg-8">
        <!-- About Section -->
        <div class="lf-card p-4 mb-4">
          <h5 class="fw-bold mb-2">About the Worker</h5>
          <p class="text-muted mb-0 lh-base">
            ${w.about || `Experienced ${LF_SERVICE_LABELS[w.category] || w.category} worker serving ${w.area} and nearby areas. Known for punctual arrivals, honest quotes, and high quality repairs with genuine parts.`}
          </p>
        </div>

        <!-- Rating Breakdown Card -->
        <div class="lf-card p-4 mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold mb-0">Customer Ratings &amp; Breakdown</h5>
            <button class="btn btn-lf-outline btn-sm" data-bs-toggle="modal" data-bs-target="#reviewModal">
              <i class="bi bi-pencil-square me-1"></i> Rate Worker
            </button>
          </div>
          ${breakdownSectionHtml}
        </div>

        <!-- Verified Reviews Feed -->
        <div class="lf-card p-4">
          <h5 class="fw-bold mb-3">Verified Customer Reviews (${totalReviews})</h5>
          <div class="d-flex flex-column gap-3" id="reviewsContainer">
            ${totalReviews === 0
              ? '<div class="text-muted small py-3 text-center">No reviews written yet.</div>'
              : reviews.map((r) => `
                <div class="p-3 rounded-3 bg-light border">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="d-flex align-items-center gap-2">
                      <div class="lf-worker-avatar" style="width:34px;height:34px;font-size:0.85rem;">
                        ${(r.customerName || "Customer").split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <div class="fw-bold text-dark mb-0 small">${r.customerName || "Verified Customer"}</div>
                        <div class="text-muted" style="font-size:0.75rem;">${r.date || "Recent Service"}</div>
                      </div>
                    </div>
                    <div>${lfRenderStars(r.rating)}</div>
                  </div>
                  <p class="mb-0 text-muted small lh-base">${r.comment}</p>
                </div>
              `).join("")
            }
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    if (window.LocalFixMap) {
      window.LocalFixMap.initWorkerMap("workerProfileMap", w);
    }
  }, 50);
}

// 1-to-5 Star Interactive Review Modal Handler
function initReviewModal(w) {
  const modalEl = document.getElementById("reviewModal");
  if (!modalEl) return;

  const starBtns    = modalEl.querySelectorAll(".lf-star-btn");
  const ratingLabel = document.getElementById("selectedRatingLabel");
  const ratingInput = document.getElementById("selectedRatingValue");
  const form        = document.getElementById("workerReviewForm");

  const ratingDescriptions = {
    1: "1 Star — Terrible 😡",
    2: "2 Stars — Poor 🙁",
    3: "3 Stars — Average 😐",
    4: "4 Stars — Good 😊",
    5: "5 Stars — Excellent 🤩",
  };

  let selectedRating = 5;

  const updateStarsUI = (val) => {
    starBtns.forEach((btn) => {
      const btnVal = Number(btn.dataset.value);
      btn.classList.toggle("selected", btnVal <= val);
      btn.classList.remove("hovered");
    });
    if (ratingLabel) ratingLabel.textContent = ratingDescriptions[val] || `${val} Stars`;
    if (ratingInput) ratingInput.value = val;
  };

  updateStarsUI(5);

  starBtns.forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      const val = Number(btn.dataset.value);
      starBtns.forEach((b) => b.classList.toggle("hovered", Number(b.dataset.value) <= val));
    });
    btn.addEventListener("mouseleave", () => starBtns.forEach((b) => b.classList.remove("hovered")));
    btn.addEventListener("click", () => { selectedRating = Number(btn.dataset.value); updateStarsUI(selectedRating); });
  });

  const currentUser = window.Storage.getCurrentUser();
  const nameInput = document.getElementById("reviewerName");
  if (nameInput && currentUser) nameInput.value = currentUser.name;

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const commentEl = document.getElementById("reviewComment");
    const comment   = commentEl ? commentEl.value.trim() : "";
    const name      = nameInput ? nameInput.value.trim() : "Verified Customer";

    if (!comment) {
      alert("Please enter a short comment about your experience.");
      return;
    }

    window.Storage.addReview({
      workerId:     w.id,
      customerName: name,
      rating:       selectedRating,
      comment,
    });

    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
    form.reset();

    lfShowToast("Review submitted successfully! Rating updated.");

    const updatedWorker = window.Storage.getWorkerById(w.id);
    renderProfile(updatedWorker);
  });
}

function initReportModal(w) {
  const form = document.getElementById("reportWorkerForm");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const subject  = document.getElementById("reportSubject")?.value.trim();
    const priority = document.getElementById("reportPriority")?.value;
    const details  = document.getElementById("reportDetails")?.value.trim();

    if (!subject || !details) {
      alert("Please fill in both subject and description.");
      return;
    }

    window.Storage.addComplaint({
      workerId:        w.id,
      workerName:      w.name,
      service:         LF_SERVICE_LABELS[w.category] || w.category,
      serviceCategory: w.category,
      subject,
      priority,
      description:     details,
    });

    const modalEl = document.getElementById("reportModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
    form.reset();

    lfShowToast("Complaint filed. Admin team will investigate.", "info");
  });
}
