/**
 * LocalFix Customer Dashboard
 * - Time-based greeting (Hi [name])
 * - Booking progress tracker
 * - Worker phone shown when accepted
 * - Customer confirm-done / dispute flow
 * - Inline validation only (no alert popups)
 */

document.addEventListener("DOMContentLoaded", () => {
  const user = window.Storage.getCurrentUser();
  if (!user) { window.location.href = "auth.html"; return; }
  if (user.role === "worker") { window.location.href = "worker-dashboard.html"; return; }
  if (user.role === "admin")  { window.location.href = "admin-dashboard.html"; return; }

  // Greeting
  const greetEl = document.getElementById("userGreeting");
  if (greetEl) greetEl.innerHTML = lfGreeting(user.name);
  const nameEl  = document.getElementById("userName");
  if (nameEl) nameEl.textContent = user.name;
  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.textContent = user.email;

  initTabNavigation();
  refreshCustomerData(user);
  initReviewModal(user);
  initComplaintModal(user);
  initProfileForm(user);
});

function refreshCustomerData(user) {
  const bookings    = window.Storage.getUserBookings(user);
  const complaints  = window.Storage.getUserComplaints(user);
  const reviews     = window.Storage.getUserReviews(user.id);
  renderStats(bookings);
  renderUpcomingCard(bookings);
  renderAllBookings(bookings);
  renderComplaintsTable(complaints);
  renderReviewsList(reviews);
}

// ── Tab Navigation ───────────────────────────────────────────────────────────
function initTabNavigation() {
  const navLinks = document.querySelectorAll(".lf-sidebar .nav-link[data-tab]");
  const tabViews = document.querySelectorAll(".lf-tab-view");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      tabViews.forEach((v) => v.classList.toggle("active", v.id === "tabView_" + link.dataset.tab));
      document.querySelector(".lf-sidebar")?.classList.remove("open");
    });
  });

  // Booking status filter pills
  document.querySelectorAll("[data-booking-filter]").forEach((pill) => {
    pill.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll("[data-booking-filter]").forEach((p) => {
        p.classList.remove("btn-lf-primary","active");
        p.classList.add("btn-light");
      });
      pill.classList.remove("btn-light");
      pill.classList.add("btn-lf-primary","active");
      const filter = pill.dataset.bookingFilter;
      const u = window.Storage.getCurrentUser();
      const all = window.Storage.getUserBookings(u);
      renderAllBookings(filter === "all" ? all : all.filter((b) => b.status === filter));
    });
  });
}

// ── Stats ────────────────────────────────────────────────────────────────────
function renderStats(bookings) {
  const active    = bookings.filter((b) => ["requested","accepted","in_progress"].includes(b.status)).length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const pending   = bookings.filter((b) => b.status === "requested").length;
  const spent     = bookings.filter((b) => b.status === "completed" && b.confirmedByCustomer).reduce((s, b) => s + (Number(b.totalPrice || b.price) || 0), 0);
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setVal("statActive",    active);
  setVal("statCompleted", completed);
  setVal("statPending",   pending);
  setVal("statSpent",     "₹" + spent.toLocaleString());
}

// ── Upcoming Booking Card (Dashboard Overview) ────────────────────────────────
function renderUpcomingCard(bookings) {
  const el = document.getElementById("upcomingCard");
  if (!el) return;
  const upcoming = bookings.find((b) => ["accepted","requested","in_progress"].includes(b.status));

  if (!upcoming) {
    el.innerHTML = `<h5 class="fw-bold mb-3">Next Scheduled Service</h5>
      ${lfEmptyState("bi-calendar-plus","No upcoming service","Ready for a repair or checkup?","Book a Worker","worker-search.html")}`;
    return;
  }

  const worker = upcoming.workerId ? window.Storage.getWorkerById(upcoming.workerId) : null;
  const phone  = upcoming.workerPhone || (worker ? worker.phone : null);
  const showPhone = ["accepted","in_progress"].includes(upcoming.status) && phone;

  el.innerHTML = `
    <h5 class="fw-bold mb-3">Next Scheduled Service</h5>
    <div class="d-flex align-items-center gap-3 mb-3 p-3 rounded-3 bg-light border">
      <div class="lf-worker-avatar" style="width:48px;height:48px;font-size:1.1rem;">${upcoming.workerName.split(" ").map((n)=>n[0]).join("")}</div>
      <div>
        <div class="fw-bold text-dark">${upcoming.workerName}</div>
        <div class="small text-muted">${upcoming.service}</div>
        ${showPhone ? `<div class="mt-1"><a href="tel:${phone}" class="btn btn-sm btn-success py-0 px-2"><i class="bi bi-telephone-fill me-1"></i>${phone}</a></div>` : ""}
      </div>
    </div>
    ${lfBookingTracker(upcoming.status)}
    <div class="small text-muted mb-1"><i class="bi bi-calendar3 text-primary me-2"></i>Date: <strong>${upcoming.date}</strong></div>
    <div class="small text-muted mb-1"><i class="bi bi-clock text-primary me-2"></i>Slot: <strong>${upcoming.slot}</strong></div>
    <div class="small text-muted mb-2"><i class="bi bi-geo-alt text-primary me-2"></i>${upcoming.customerAddress || "Ludhiana"}</div>
    <div class="d-flex justify-content-between align-items-center pt-2 border-top">
      ${lfStatusBadge(upcoming.status)}
      <span class="lf-mono fw-bold text-primary fs-6">&#8377;${upcoming.totalPrice || upcoming.price}</span>
    </div>
    ${renderDisputeOrConfirm(upcoming)}
  `;
}

// ── Dispute / Confirm Panel ───────────────────────────────────────────────────
function renderDisputeOrConfirm(booking) {
  // Worker marked done but customer hasn't confirmed
  if (booking.markedDoneByWorker && !booking.confirmedByCustomer) {
    return `
      <div class="lf-dispute-panel mt-3">
        <div class="fw-semibold mb-2"><i class="bi bi-question-circle-fill text-warning me-1"></i>Worker marked this job as completed. Was the work done?</div>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-success btn-sm" onclick="confirmDone('${booking.id}')"><i class="bi bi-check-circle-fill me-1"></i>Yes, Work is Done</button>
          <button class="btn btn-outline-danger btn-sm" onclick="toggleDisputePanel('${booking.id}')"><i class="bi bi-x-circle me-1"></i>Worker Didn't Come / Issue</button>
        </div>
        <div id="disputePanel_${booking.id}" class="d-none mt-3">
          <div class="fw-semibold text-danger mb-2">What would you like to do?</div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-warning btn-sm" onclick="reopenService('${booking.id}')"><i class="bi bi-arrow-counterclockwise me-1"></i>Reopen Service Request</button>
            <a href="tel:+911800001234" class="btn btn-outline-secondary btn-sm"><i class="bi bi-headset me-1"></i>Customer Care: 1800-001-234</a>
          </div>
        </div>
      </div>
    `;
  }
  // Completed & confirmed
  if (booking.status === "completed" && booking.confirmedByCustomer && !booking.rating) {
    return `
      <div class="lf-confirm-panel mt-3">
        <div class="fw-semibold text-success mb-2"><i class="bi bi-check-circle-fill me-1"></i>Service Confirmed Complete!</div>
        <button class="btn btn-warning btn-sm" onclick="openReviewModalForBooking('${booking.id}','${booking.workerId}','${booking.workerName}')">
          <i class="bi bi-star-fill me-1"></i>Rate & Review Worker
        </button>
      </div>
    `;
  }
  return "";
}

window.confirmDone = (bookingId) => {
  window.Storage.confirmBookingDone(bookingId);
  lfShowToast("Work confirmed complete! You can now rate the worker.");
  const user = window.Storage.getCurrentUser();
  refreshCustomerData(user);
};

window.toggleDisputePanel = (bookingId) => {
  const el = document.getElementById("disputePanel_" + bookingId);
  if (el) el.classList.toggle("d-none");
};

window.reopenService = (bookingId) => {
  window.Storage.reopenBooking(bookingId, "Customer reported worker did not arrive.");
  lfShowToast("Service has been reopened. A new worker will be assigned shortly.", "info");
  const user = window.Storage.getCurrentUser();
  refreshCustomerData(user);
};

// ── All Bookings Table ────────────────────────────────────────────────────────
function renderAllBookings(bookings) {
  const container = document.getElementById("allBookingsList");
  const emptyEl   = document.getElementById("allBookingsEmpty");
  if (!container) return;

  if (!bookings.length) {
    container.innerHTML = "";
    if (emptyEl) {
      emptyEl.classList.remove("d-none");
      emptyEl.innerHTML = lfEmptyState("bi-calendar-x","No bookings found","Book a service now to connect with top-rated local workers.","Find Workers","worker-search.html");
    }
    return;
  }
  if (emptyEl) emptyEl.classList.add("d-none");

  container.innerHTML = bookings.map((b) => {
    const worker      = b.workerId ? window.Storage.getWorkerById(b.workerId) : null;
    const phone       = b.workerPhone || (worker ? worker.phone : null);
    const showPhone   = ["accepted","in_progress"].includes(b.status) && phone;
    const needsConfirm = b.markedDoneByWorker && !b.confirmedByCustomer;

    return `
    <div class="lf-card p-3 mb-3">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
        <div>
          <span class="lf-mono fw-bold small text-muted me-2">${b.id}</span>
          <strong>${b.service}</strong>
          <div class="small text-muted">${b.problemDescription || "General repair"}</div>
        </div>
        <div class="text-end">
          ${lfStatusBadge(b.status)}
          <div class="lf-mono fw-bold text-primary mt-1">&#8377;${b.totalPrice || b.price}</div>
          ${b.distanceSurcharge > 0 ? `<div class="text-muted" style="font-size:0.7rem">incl. +&#8377;${b.distanceSurcharge} travel</div>` : ""}
        </div>
      </div>

      <div class="small text-muted mb-2">
        <i class="bi bi-person me-1 text-primary"></i>${b.workerName}
        &nbsp;|&nbsp;<i class="bi bi-calendar3 me-1"></i>${b.date}, ${b.slot}
      </div>

      ${showPhone ? `<div class="mb-2"><a href="tel:${phone}" class="btn btn-sm btn-success py-0 px-2"><i class="bi bi-telephone-fill me-1"></i>Call Worker: ${phone}</a></div>` : ""}

      ${lfBookingTracker(b.status)}

      ${needsConfirm ? renderDisputeOrConfirm(b) : ""}
      ${b.status === "completed" && b.confirmedByCustomer && !b.rating ? renderDisputeOrConfirm(b) : ""}

      <div class="d-flex gap-2 flex-wrap mt-2">
        ${b.status === "completed" && !b.rating && b.confirmedByCustomer
          ? `<button class="btn btn-warning btn-sm" onclick="openReviewModalForBooking('${b.id}','${b.workerId}','${b.workerName}')"><i class="bi bi-star-fill me-1"></i>Rate Worker</button>` : ""}
        ${b.status === "completed" && b.rating ? `<span class="small text-success"><i class="bi bi-check-circle-fill me-1"></i>Rated ${b.rating}&#9733;</span>` : ""}
        ${["requested","accepted"].includes(b.status)
          ? `<button class="btn btn-outline-danger btn-sm" onclick="cancelBooking('${b.id}')">Cancel</button>` : ""}
        <button class="btn btn-light btn-sm" onclick="openComplaintModalForBooking('${b.id}','${b.workerId}','${b.workerName}','${b.service}')"><i class="bi bi-flag text-muted"></i></button>
      </div>
    </div>`;
  }).join("");
}

window.cancelBooking = (bookingId) => {
  window.Storage.updateBookingStatus(bookingId, "cancelled");
  lfShowToast("Booking cancelled.", "info");
  const user = window.Storage.getCurrentUser();
  refreshCustomerData(user);
};

// ── Complaints Table ──────────────────────────────────────────────────────────
function renderComplaintsTable(complaints) {
  const el      = document.getElementById("complaintsListEl");
  const emptyEl = document.getElementById("complaintsEmpty");
  if (!el) return;

  if (!complaints.length) {
    el.innerHTML = "";
    if (emptyEl) {
      emptyEl.classList.remove("d-none");
      emptyEl.innerHTML = lfEmptyState("bi-shield-check","No complaints on record","Everything is running smoothly!");
    }
    return;
  }
  if (emptyEl) emptyEl.classList.add("d-none");
  el.innerHTML = complaints.map((c) => `
    <div class="lf-card p-3 mb-3 d-flex justify-content-between align-items-start flex-wrap gap-2">
      <div>
        <div class="fw-semibold">${c.subject}</div>
        <div class="small text-muted">${c.description}</div>
        <div class="small text-muted mt-1"><i class="bi bi-person me-1"></i>${c.workerName} | Booking ${c.bookingId}</div>
      </div>
      <div class="text-end">
        ${lfPriorityBadge(c.priority)}
        <div class="mt-1">${lfStatusBadge(c.status)}</div>
        <div class="small text-muted mt-1">${c.createdAt}</div>
      </div>
    </div>
  `).join("");
}

// ── Reviews List ──────────────────────────────────────────────────────────────
function renderReviewsList(reviews) {
  const el      = document.getElementById("reviewsListEl");
  const emptyEl = document.getElementById("reviewsEmpty");
  if (!el) return;
  if (!reviews.length) {
    el.innerHTML = "";
    if (emptyEl) { emptyEl.classList.remove("d-none"); emptyEl.innerHTML = lfEmptyState("bi-star","No reviews written yet","After completing a booking, you can rate and review the worker."); }
    return;
  }
  if (emptyEl) emptyEl.classList.add("d-none");
  el.innerHTML = reviews.map((r) => `
    <div class="lf-card p-3 mb-3">
      <div class="d-flex justify-content-between align-items-start mb-1">
        <div class="fw-semibold">${r.workerName || "Worker"}</div>
        <div class="small text-muted">${r.date}</div>
      </div>
      <div class="mb-1">${lfRenderStars(r.rating, true)}</div>
      <div class="small text-muted">"${r.comment}"</div>
    </div>
  `).join("");
}

// ── Review Modal ──────────────────────────────────────────────────────────────
let _reviewTarget = {};
window.openReviewModalForBooking = (bookingId, workerId, workerName) => {
  _reviewTarget = { bookingId, workerId, workerName };
  const el = document.getElementById("reviewModalLabel");
  if (el) el.innerHTML = `<i class="bi bi-star-fill text-warning me-1"></i>Rate ${workerName}`;
  const nameInput = document.getElementById("reviewerName");
  const user = window.Storage.getCurrentUser();
  if (nameInput && user) nameInput.value = user.name;
  const modal = new bootstrap.Modal(document.getElementById("reviewModal"));
  modal.show();
};

function initReviewModal(user) {
  const starBtns    = document.querySelectorAll("#reviewModal .lf-star-btn");
  const ratingLabel = document.getElementById("selectedRatingLabel");
  const ratingInput = document.getElementById("selectedRatingValue");
  const form        = document.getElementById("workerReviewForm");
  const LABELS      = { 1:"1 Star — Terrible 😡", 2:"2 Stars — Poor 🙁", 3:"3 Stars — Average 😐", 4:"4 Stars — Good 😊", 5:"5 Stars — Excellent 🤩" };
  let selectedRating = 5;

  const updateStarsUI = (val) => {
    starBtns.forEach((btn) => {
      const v = Number(btn.dataset.value);
      btn.classList.toggle("selected", v <= val);
      btn.classList.remove("hovered");
    });
    if (ratingLabel) ratingLabel.textContent = LABELS[val] || "";
    if (ratingInput) ratingInput.value = val;
  };
  updateStarsUI(5);

  starBtns.forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      starBtns.forEach((b) => b.classList.toggle("hovered", Number(b.dataset.value) <= Number(btn.dataset.value)));
    });
    btn.addEventListener("mouseleave", () => starBtns.forEach((b) => b.classList.remove("hovered")));
    btn.addEventListener("click", () => { selectedRating = Number(btn.dataset.value); updateStarsUI(selectedRating); });
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const commentEl = document.getElementById("reviewComment");
    if (!commentEl?.value.trim()) {
      let span = commentEl?.parentElement.querySelector(".lf-field-error");
      if (!span) { span = document.createElement("span"); span.className = "lf-field-error"; commentEl?.parentElement.appendChild(span); }
      if (span) span.textContent = "Please write a brief review.";
      return;
    }

    window.Storage.addReview({
      workerId: _reviewTarget.workerId,
      bookingId: _reviewTarget.bookingId,
      rating: selectedRating,
      comment: commentEl.value.trim(),
    });
    bootstrap.Modal.getInstance(document.getElementById("reviewModal"))?.hide();
    lfShowToast("Review submitted! Thank you.");
    const u = window.Storage.getCurrentUser();
    refreshCustomerData(u);
  });
}

// ── Complaint Modal ───────────────────────────────────────────────────────────
let _complaintTarget = {};
window.openComplaintModalForBooking = (bookingId, workerId, workerName, service) => {
  _complaintTarget = { bookingId, workerId, workerName, service };
  const modal = new bootstrap.Modal(document.getElementById("complaintModal"));
  modal.show();
};

function initComplaintModal(user) {
  const form = document.getElementById("complaintForm");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const subjectEl = document.getElementById("complaintSubject");
    const descEl    = document.getElementById("complaintDesc");
    const priorityEl= document.getElementById("complaintPriority");

    [subjectEl, descEl].forEach((el) => {
      if (el) { el.classList.remove("lf-input-error"); const s = el.parentElement?.querySelector(".lf-field-error"); if (s) s.textContent = ""; }
    });

    let valid = true;
    if (!subjectEl?.value.trim()) { showInlineErr(subjectEl, "Please enter a subject."); valid = false; }
    if (!descEl?.value.trim())    { showInlineErr(descEl,    "Please describe the issue."); valid = false; }
    if (!valid) return;

    window.Storage.addComplaint({
      workerId:       _complaintTarget.workerId,
      workerName:     _complaintTarget.workerName,
      bookingId:      _complaintTarget.bookingId,
      service:        _complaintTarget.service,
      subject:        subjectEl.value.trim(),
      description:    descEl.value.trim(),
      priority:       priorityEl?.value || "medium",
    });
    form.reset();
    bootstrap.Modal.getInstance(document.getElementById("complaintModal"))?.hide();
    lfShowToast("Complaint filed. Our team will review it shortly.", "info");
    const u = window.Storage.getCurrentUser();
    refreshCustomerData(u);
  });
}

function showInlineErr(el, msg) {
  if (!el) return;
  el.classList.add("lf-input-error");
  let span = el.parentElement?.querySelector(".lf-field-error");
  if (!span) { span = document.createElement("span"); span.className = "lf-field-error"; el.parentElement?.appendChild(span); }
  if (span) span.textContent = msg;
}

// ── Profile Form ──────────────────────────────────────────────────────────────
function initProfileForm(user) {
  const nameEl  = document.getElementById("profileName");
  const phoneEl = document.getElementById("profilePhone");
  const locEl   = document.getElementById("profileLocation");
  if (nameEl) nameEl.value  = user.name || "";
  if (phoneEl) phoneEl.value = user.phone || "";
  if (locEl) locEl.value    = user.location || "";

  document.getElementById("profileForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    lfShowToast("Profile updated.");
  });
}
