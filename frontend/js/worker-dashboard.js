/**
 * LocalFix Worker Dashboard
 * - Time-based greeting (Good morning / Hi [name])
 * - Job request handling (Accept/Reject)
 * - Work Done action
 * - Availability toggle
 * - Ratings & Earnings summary
 */

document.addEventListener("DOMContentLoaded", () => {
  const user = window.Storage.getCurrentUser();
  if (user && user.role === "customer") { window.location.href = "customer-dashboard.html"; return; }
  if (user && user.role === "admin")    { window.location.href = "admin-dashboard.html"; return; }

  const currentWorkerUser = user || {
    id: "u_worker_1", name: "Rahul Sharma", email: "rahul@localfix.com", role: "worker", workerId: "w1", category: "electrician", location: "Model Town, Ludhiana",
  };

  const workerProfile = window.Storage.getWorkerById(currentWorkerUser.workerId || "w1") || {
    id: "w1", name: currentWorkerUser.name, category: "electrician", experience: 6, rating: null, reviewsCount: 0, price: 250, area: "Model Town, Ludhiana", available: true, jobs: 0,
  };

  // Set greeting
  const greetEl = document.getElementById("workerGreeting");
  if (greetEl) greetEl.innerHTML = lfGreeting(currentWorkerUser.name);
  const nameEl  = document.getElementById("userName");
  if (nameEl) nameEl.textContent = currentWorkerUser.name;
  const verLine = document.getElementById("verificationLine");
  if (verLine) verLine.textContent = `${LF_SERVICE_LABELS[workerProfile.category] || workerProfile.category} · ${workerProfile.area}`;

  initWorkerTabs();
  initAvailabilitySwitch(workerProfile);
  refreshWorkerDashboard(currentWorkerUser, workerProfile);
});

function refreshWorkerDashboard(user, profile) {
  const bookings   = window.Storage.getWorkerBookings(user);
  const complaints = window.Storage.getWorkerComplaints(user);
  const reviews    = window.Storage.getWorkerReviews(profile.id || "w1");

  renderWorkerStats(bookings, profile, reviews);
  renderBookingRequests(bookings.filter((b) => b.status === "requested"));
  renderUpcomingJobs(bookings.filter((b) => ["accepted", "in_progress"].includes(b.status)));
  renderCompletedJobs(bookings.filter((b) => b.status === "completed"));
  renderWorkerComplaints(complaints);
  renderWorkerReviews(reviews, profile);
  renderEarnings(bookings.filter((b) => b.status === "completed"));
}

function initWorkerTabs() {
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
}

function initAvailabilitySwitch(profile) {
  const sw  = document.getElementById("availabilitySwitch");
  const lbl = document.getElementById("availabilityLabel");
  if (!sw) return;

  sw.checked = profile.available !== false;
  if (lbl) lbl.textContent = sw.checked ? "Online (Accepting Jobs)" : "Offline (Busy)";

  sw.addEventListener("change", () => {
    window.Storage.updateWorkerAvailability(profile.id, sw.checked);
    if (lbl) lbl.textContent = sw.checked ? "Online (Accepting Jobs)" : "Offline (Busy)";
    lfShowToast(sw.checked ? "You are now online and visible to customers." : "You are marked offline.", sw.checked ? "success" : "info");
  });
}

function renderWorkerStats(bookings, profile, reviews) {
  const pendingRequests = bookings.filter((b) => b.status === "requested").length;
  const activeJobs      = bookings.filter((b) => ["accepted", "in_progress"].includes(b.status)).length;
  const completedJobs   = bookings.filter((b) => b.status === "completed").length;
  const earnings        = bookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + (Number(b.totalPrice || b.price) || 0), 0);

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setVal("statWorkerRequests",  pendingRequests);
  setVal("statWorkerActive",    activeJobs);
  setVal("statWorkerCompleted", completedJobs);
  setVal("statWorkerEarnings",  "₹" + earnings.toLocaleString());

  const ratingEl = document.getElementById("statWorkerRating");
  if (ratingEl) {
    ratingEl.textContent = profile.rating !== null ? `${profile.rating}★` : "No ratings yet";
  }
}

function renderBookingRequests(requests) {
  const container = document.getElementById("requestsContainer");
  const emptyEl   = document.getElementById("requestsEmpty");
  const tabContainer = document.getElementById("requestsTabContainer");

  const html = requests.map((r) => `
    <div class="lf-card p-3 mb-3 border-start border-4 border-warning">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
        <div>
          <span class="badge bg-warning text-dark me-2">New Request</span>
          <strong>${r.service}</strong>
          <span class="text-muted small">(${r.id})</span>
        </div>
        <div class="lf-mono fw-bold fs-5 text-primary">₹${r.totalPrice || r.price}</div>
      </div>
      <div class="small text-muted mb-2">
        <i class="bi bi-person me-1"></i><strong>${r.customerName}</strong> (${r.customerPhone || "Phone hidden until accepted"})
      </div>
      <div class="small text-muted mb-2">
        <i class="bi bi-geo-alt me-1 text-danger"></i>${r.customerAddress || "Ludhiana"}
      </div>
      <div class="small text-muted mb-3">
        <i class="bi bi-calendar3 me-1 text-primary"></i>${r.date} &middot; <i class="bi bi-clock me-1 text-primary"></i>${r.slot}
      </div>
      <div class="p-2 rounded bg-light border small mb-3">
        <strong>Problem Description:</strong> ${r.problemDescription || "General service requirement"}
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-success btn-sm px-3" onclick="workerAcceptBooking('${r.id}')">
          <i class="bi bi-check-lg me-1"></i> Accept Job
        </button>
        <button class="btn btn-outline-danger btn-sm" onclick="workerRejectBooking('${r.id}')">
          <i class="bi bi-x-lg me-1"></i> Decline
        </button>
      </div>
    </div>
  `).join("");

  if (container) {
    if (!requests.length) {
      container.innerHTML = "";
      if (emptyEl) {
        emptyEl.classList.remove("d-none");
        emptyEl.innerHTML = lfEmptyState("bi-inbox", "No pending booking requests", "New requests from nearby customers will appear here.");
      }
    } else {
      if (emptyEl) emptyEl.classList.add("d-none");
      container.innerHTML = html;
    }
  }

  if (tabContainer) {
    if (!requests.length) {
      tabContainer.innerHTML = lfEmptyState("bi-inbox", "No pending booking requests", "New requests from nearby customers will appear here.");
    } else {
      tabContainer.innerHTML = html;
    }
  }
}

window.workerAcceptBooking = (bookingId) => {
  window.Storage.updateBookingStatus(bookingId, "accepted");
  lfShowToast("Booking accepted! Customer has been notified with your contact details.");
  const user = window.Storage.getCurrentUser();
  const profile = window.Storage.getWorkerById(user?.workerId || "w1");
  refreshWorkerDashboard(user, profile);
};

window.workerRejectBooking = (bookingId) => {
  window.Storage.updateBookingStatus(bookingId, "cancelled");
  lfShowToast("Booking request declined.", "info");
  const user = window.Storage.getCurrentUser();
  const profile = window.Storage.getWorkerById(user?.workerId || "w1");
  refreshWorkerDashboard(user, profile);
};

function renderUpcomingJobs(jobs) {
  const container = document.getElementById("upcomingJobsContainer");
  const emptyEl   = document.getElementById("upcomingJobsEmpty");
  if (!container) return;

  if (!jobs.length) {
    container.innerHTML = "";
    if (emptyEl) {
      emptyEl.classList.remove("d-none");
      emptyEl.innerHTML = lfEmptyState("bi-calendar-check", "No active jobs scheduled", "Accept incoming requests to start working.");
    }
    return;
  }

  if (emptyEl) emptyEl.classList.add("d-none");
  container.innerHTML = jobs.map((j) => `
    <div class="lf-card p-3 mb-3 border-start border-4 border-primary">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
        <div>
          ${lfStatusBadge(j.status)}
          <strong class="ms-2">${j.service}</strong>
          <span class="text-muted small">(${j.id})</span>
        </div>
        <div class="lf-mono fw-bold fs-5 text-primary">₹${j.totalPrice || j.price}</div>
      </div>
      <div class="small text-muted mb-2">
        <i class="bi bi-person me-1"></i>Customer: <strong>${j.customerName}</strong>
        ${j.customerPhone ? ` &middot; <a href="tel:${j.customerPhone}" class="text-primary"><i class="bi bi-telephone-fill me-1"></i>${j.customerPhone}</a>` : ""}
      </div>
      <div class="small text-muted mb-2"><i class="bi bi-geo-alt me-1 text-danger"></i>${j.customerAddress || "Ludhiana"}</div>
      <div class="small text-muted mb-3"><i class="bi bi-calendar3 me-1"></i>${j.date} &middot; ${j.slot}</div>
      ${lfBookingTracker(j.status)}
      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-primary btn-sm px-3" onclick="workerMarkDone('${j.id}')">
          <i class="bi bi-check2-circle me-1"></i> Mark Job Complete
        </button>
      </div>
    </div>
  `).join("");
}

window.workerMarkDone = (bookingId) => {
  window.Storage.updateBookingStatus(bookingId, "completed");
  lfShowToast("Job marked as done! Customer can now confirm and rate your service.");
  const user = window.Storage.getCurrentUser();
  const profile = window.Storage.getWorkerById(user?.workerId || "w1");
  refreshWorkerDashboard(user, profile);
};

function renderCompletedJobs(jobs) {
  const container = document.getElementById("completedJobsContainer");
  const emptyEl   = document.getElementById("completedJobsEmpty");
  if (!container) return;

  if (!jobs.length) {
    container.innerHTML = "";
    if (emptyEl) {
      emptyEl.classList.remove("d-none");
      emptyEl.innerHTML = lfEmptyState("bi-check2-all", "No completed jobs yet", "Jobs you complete will be recorded here.");
    }
    return;
  }

  if (emptyEl) emptyEl.classList.add("d-none");
  container.innerHTML = jobs.map((j) => `
    <div class="lf-card p-3 mb-3">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <span class="badge bg-success me-2">Completed</span>
          <strong>${j.service}</strong>
          <span class="text-muted small">(${j.id})</span>
        </div>
        <div class="lf-mono fw-bold text-success">₹${j.totalPrice || j.price}</div>
      </div>
      <div class="small text-muted mb-1"><i class="bi bi-person me-1"></i>${j.customerName} &middot; ${j.date}</div>
      <div class="small text-muted">${j.customerAddress || "Ludhiana"}</div>
      ${j.rating ? `<div class="mt-2 small text-warning"><i class="bi bi-star-fill me-1"></i>Customer rated: <strong>${j.rating}★</strong> &ldquo;${j.reviewComment || ""}&rdquo;</div>` : `<div class="mt-2 small text-muted fst-italic">Waiting for customer rating</div>`}
    </div>
  `).join("");
}

function renderWorkerComplaints(complaints) {
  const container = document.getElementById("workerComplaintsContainer");
  const emptyEl   = document.getElementById("workerComplaintsEmpty");
  if (!container) return;

  if (!complaints.length) {
    container.innerHTML = "";
    if (emptyEl) {
      emptyEl.classList.remove("d-none");
      emptyEl.innerHTML = lfEmptyState("bi-shield-check", "No complaints", "Great job maintaining high service standards!");
    }
    return;
  }

  if (emptyEl) emptyEl.classList.add("d-none");
  container.innerHTML = complaints.map((c) => `
    <div class="lf-card p-3 mb-3 border-start border-4 border-danger">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <strong class="text-danger">${c.subject}</strong>
          <div class="small text-muted">From ${c.customerName} &middot; Booking ${c.bookingId}</div>
        </div>
        <div>${lfPriorityBadge(c.priority)}</div>
      </div>
      <p class="small text-muted mb-2">${c.description}</p>
      <div class="small text-muted">Status: <strong>${c.status}</strong></div>
    </div>
  `).join("");
}

function renderWorkerReviews(reviews, profile) {
  const container = document.getElementById("workerReviewsContainer");
  const emptyEl   = document.getElementById("workerReviewsEmpty");
  if (!container) return;

  if (!reviews.length) {
    container.innerHTML = "";
    if (emptyEl) {
      emptyEl.classList.remove("d-none");
      emptyEl.innerHTML = lfEmptyState("bi-star", "No reviews yet", "Reviews from your customers will show up here.");
    }
    return;
  }

  if (emptyEl) emptyEl.classList.add("d-none");
  container.innerHTML = reviews.map((r) => `
    <div class="lf-card p-3 mb-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <strong>${r.customerName || "Customer"}</strong>
        <div>${lfRenderStars(r.rating)}</div>
      </div>
      <p class="small text-muted mb-0">"${r.comment}"</p>
      <div class="small text-muted mt-1 text-end">${r.date || "Recent"}</div>
    </div>
  `).join("");
}

function renderEarnings(completedBookings) {
  const total = completedBookings.reduce((s, b) => s + (Number(b.totalPrice || b.price) || 0), 0);
  const el = document.getElementById("earningsTotalDisplay");
  if (el) el.textContent = "₹" + total.toLocaleString();

  const listEl = document.getElementById("earningsList");
  if (listEl) {
    if (!completedBookings.length) {
      listEl.innerHTML = '<div class="text-muted small py-3 text-center">No earnings recorded yet.</div>';
    } else {
      listEl.innerHTML = completedBookings.map((b) => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
          <div>
            <strong>${b.service}</strong>
            <div class="small text-muted">${b.customerName} &middot; ${b.date}</div>
          </div>
          <div class="lf-mono fw-bold text-success fs-6">+₹${b.totalPrice || b.price}</div>
        </div>
      `).join("");
    }
  }
}
