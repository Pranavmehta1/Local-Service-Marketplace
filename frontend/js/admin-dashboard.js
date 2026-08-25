/**
 * LocalFix Admin Dashboard
 * Manages platform overview, worker verification queue, customers, workers,
 * bookings, and complaint resolution.
 */

document.addEventListener('DOMContentLoaded', () => {
  const user = window.Storage.getCurrentUser();
  if (user && user.role === 'customer') {
    window.location.href = 'customer-dashboard.html';
    return;
  } else if (user && user.role === 'worker') {
    window.location.href = 'worker-dashboard.html';
    return;
  }

  initAdminTabs();
  refreshAdminData();
  renderCharts();
});

function refreshAdminData() {
  const users = window.Storage.getUsers();
  const workers = window.Storage.getWorkers();
  const bookings = window.Storage.getAllBookings();
  const complaints = window.Storage.getAllComplaints();
  const reviews = window.Storage.getAllReviews();

  const customers = users.filter((u) => u.role === 'customer');
  const pendingWorkers = users.filter((u) => u.role === 'worker' && u.verificationStatus === 'pending');

  renderAdminStats(customers, workers, bookings, complaints);
  renderVerificationQueue(pendingWorkers);
  renderAllComplaints(complaints);
  renderAllBookings(bookings);
  renderWorkersTable(workers);
  renderCustomersTable(customers);
  renderReviewsTable(reviews);
}

function initAdminTabs() {
  const navLinks = document.querySelectorAll('.lf-sidebar .nav-link[data-tab]');
  const tabViews = document.querySelectorAll('.lf-tab-view');

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.dataset.tab;

      navLinks.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      tabViews.forEach((view) => {
        view.classList.toggle('active', view.id === `tabAdmin_${targetTab}`);
      });

      document.querySelector('.lf-sidebar')?.classList.remove('open');
      document.querySelector('.lf-sidebar-backdrop')?.classList.remove('open');
    });
  });
}

function renderAdminStats(customers, workers, bookings, complaints) {
  const totalCompleted = bookings.filter((b) => b.status === 'completed').length;
  const totalPending = bookings.filter((b) => b.status === 'requested').length;
  const resolvedComplaints = complaints.filter((c) => c.status === 'resolved').length;
  const revenue = bookings.filter((b) => b.status === 'completed').reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setVal('statAdminCustomers', customers.length);
  setVal('statAdminWorkers', workers.length);
  setVal('statAdminBookings', bookings.length);
  setVal('statAdminCompleted', totalCompleted);
  setVal('statAdminPending', totalPending);
  setVal('statAdminComplaints', complaints.length);
  setVal('statAdminResolved', resolvedComplaints);
  setVal('statAdminRevenue', `₹${revenue.toLocaleString()}`);
}

function renderVerificationQueue(pending) {
  const tbody = document.querySelector('#verificationTable tbody');
  const countBadge = document.getElementById('pendingCount');
  if (!tbody) return;

  if (countBadge) countBadge.textContent = `${pending.length} pending`;

  if (!pending.length) {
    tbody.innerHTML = `<tr><td colspan="6">${lfEmptyState('bi-patch-check-fill', 'No pending worker verifications', 'All worker applications have been processed.')}</td></tr>`;
    return;
  }

  tbody.innerHTML = pending.map((w) => `
    <tr>
      <td><strong>${w.name}</strong></td>
      <td><span class="badge bg-light text-dark border">${LF_SERVICE_LABELS[w.category] || w.category || 'Worker'}</span></td>
      <td>${w.experience || 2} yrs</td>
      <td>${w.location || 'Ludhiana'}</td>
      <td>${w.createdAt || 'Recent'}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-lf-primary btn-sm py-1 px-2" onclick="approveWorkerAccount('${w.id}', '${w.name}')"><i class="bi bi-check-lg me-1"></i>Approve</button>
          <button class="btn btn-outline-danger btn-sm py-1 px-2" onclick="rejectWorkerAccount('${w.id}', '${w.name}')">Reject</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.approveWorkerAccount = (userId, name) => {
  window.Storage.verifyWorker(name, true);
  lfShowToast(`Worker ${name} has been approved and is now live!`);
  refreshAdminData();
};

window.rejectWorkerAccount = (userId, name) => {
  if (confirm(`Decline application for ${name}?`)) {
    window.Storage.verifyWorker(name, false);
    lfShowToast(`Worker application for ${name} declined.`, 'info');
    refreshAdminData();
  }
};

function renderAllComplaints(complaints) {
  const tbody = document.querySelector('#allComplaintsTable tbody');
  if (!tbody) return;

  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="8">${lfEmptyState('bi-shield-check', 'No active complaints')}</td></tr>`;
    return;
  }

  tbody.innerHTML = complaints.map((c) => `
    <tr>
      <td class="lf-mono fw-bold">${c.id}</td>
      <td><span class="badge bg-light text-dark border">${c.service}</span></td>
      <td>${c.workerName}</td>
      <td>${c.customerName}</td>
      <td>
        <div class="fw-semibold">${c.subject}</div>
        <div class="small text-muted" style="max-width:250px;">${c.description || ''}</div>
      </td>
      <td>${lfPriorityBadge(c.priority)}</td>
      <td>${lfStatusBadge(c.status)}</td>
      <td>
        ${c.status !== 'resolved'
          ? `<button class="btn btn-success btn-sm py-1 px-2" onclick="resolveComplaint('${c.id}')"><i class="bi bi-check-circle me-1"></i>Resolve</button>`
          : '<span class="small text-muted">Resolved</span>'}
      </td>
    </tr>
  `).join('');
}

window.resolveComplaint = (complaintId) => {
  window.Storage.updateComplaintStatus(complaintId, 'resolved');
  lfShowToast(`Complaint ${complaintId} marked as Resolved!`);
  refreshAdminData();
};

function renderAllBookings(bookings) {
  const tbody = document.querySelector('#adminAllBookingsTable tbody');
  if (!tbody) return;

  tbody.innerHTML = bookings.map((b) => `
    <tr>
      <td class="lf-mono fw-bold">${b.id}</td>
      <td>${b.service}</td>
      <td>${b.workerName}</td>
      <td>${b.customerName}</td>
      <td>${b.date}</td>
      <td>${lfStatusBadge(b.status)}</td>
      <td class="lf-mono fw-bold">₹${b.price}</td>
    </tr>
  `).join('');
}

function renderWorkersTable(workers) {
  const tbody = document.querySelector('#adminWorkersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = workers.map((w) => `
    <tr>
      <td><strong>${w.name}</strong></td>
      <td>${LF_SERVICE_LABELS[w.category] || w.category}</td>
      <td>${w.experience} yrs</td>
      <td>${w.area}</td>
      <td>${w.rating} ★ (${w.reviewsCount || 0})</td>
      <td>${w.verified ? '<span class="badge bg-success">Verified</span>' : '<span class="badge bg-warning text-dark">Pending</span>'}</td>
      <td class="lf-mono">₹${w.price}</td>
    </tr>
  `).join('');
}

function renderCustomersTable(customers) {
  const tbody = document.querySelector('#adminCustomersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = customers.map((c) => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.email}</td>
      <td>${c.phone || '+91 98765 00000'}</td>
      <td>${c.location || 'Ludhiana'}</td>
      <td>${c.createdAt || 'Recent'}</td>
    </tr>
  `).join('');
}

function renderReviewsTable(reviews) {
  const tbody = document.querySelector('#adminReviewsTable tbody');
  if (!tbody) return;

  tbody.innerHTML = reviews.map((r) => `
    <tr>
      <td>${r.customerName}</td>
      <td>Worker #${r.workerId}</td>
      <td>${lfRenderStars(r.rating, true)}</td>
      <td>${r.comment}</td>
      <td>${r.date || 'Recent'}</td>
    </tr>
  `).join('');
}

function renderCharts() {
  const trendsCtx = document.getElementById('bookingTrendsChart');
  if (trendsCtx && typeof Chart !== 'undefined') {
    new Chart(trendsCtx, {
      type: 'line',
      data: {
        labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
        datasets: [{
          label: 'Bookings',
          data: [45, 62, 58, 79, 94, 108],
          borderColor: '#0284C7',
          backgroundColor: 'rgba(2, 132, 199, 0.12)',
          fill: true,
          tension: 0.35,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  const popCtx = document.getElementById('servicePopularityChart');
  if (popCtx && typeof Chart !== 'undefined') {
    new Chart(popCtx, {
      type: 'doughnut',
      data: {
        labels: LF_SERVICES.map((s) => s.name),
        datasets: [{
          data: [120, 95, 80, 50, 65, 90, 70],
          backgroundColor: ['#0284C7', '#0369A1', '#38BDF8', '#7DD3FC', '#0B1120', '#64748B', '#94A3B8'],
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
      },
    });
  }
}
