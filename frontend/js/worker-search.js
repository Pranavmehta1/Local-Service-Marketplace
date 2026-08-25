/**
 * LocalFix Worker Search & Discovery
 * - Distance badge + surcharge indicator (>10 km)
 * - No ratings yet display
 * - Grid/Map view toggle
 */

let currentSearchResults = [];
let isMapViewActive = false;

document.addEventListener("DOMContentLoaded", () => {
  const categorySelect = document.getElementById("filterCategory");
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">All Services</option>' +
      LF_SERVICES.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  }

  const params = new URLSearchParams(window.location.search);
  const initialCategory = params.get("category") || "";
  if (categorySelect && initialCategory) categorySelect.value = initialCategory;

  ["filterCategory","filterRating","filterSort"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", applyFilters);
  });
  document.getElementById("searchQuery")?.addEventListener("input", applyFilters);

  const priceInput = document.getElementById("filterPrice");
  if (priceInput) {
    priceInput.addEventListener("input", () => {
      document.getElementById("filterPriceLabel").textContent = priceInput.value;
      applyFilters();
    });
  }

  initViewSwitcher();
  applyFilters();
});

function initViewSwitcher() {
  const btnList   = document.getElementById("btnListView");
  const btnMap    = document.getElementById("btnMapView");
  const secGrid   = document.getElementById("sectionGridView");
  const secMap    = document.getElementById("sectionMapView");
  if (!btnList || !btnMap) return;

  btnList.addEventListener("click", () => {
    isMapViewActive = false;
    btnList.classList.add("btn-lf-primary","active");   btnList.classList.remove("btn-light");
    btnMap.classList.remove("btn-lf-primary","active"); btnMap.classList.add("btn-light");
    secGrid?.classList.remove("d-none"); secMap?.classList.add("d-none");
  });

  btnMap.addEventListener("click", () => {
    isMapViewActive = true;
    btnMap.classList.add("btn-lf-primary","active");     btnMap.classList.remove("btn-light");
    btnList.classList.remove("btn-lf-primary","active"); btnList.classList.add("btn-light");
    secGrid?.classList.add("d-none"); secMap?.classList.remove("d-none");
    setTimeout(() => { if (window.LocalFixMap) window.LocalFixMap.initSearchMap("searchMap", currentSearchResults); }, 50);
  });
}

function applyFilters() {
  const category  = document.getElementById("filterCategory")?.value || "";
  const minRating = Number(document.getElementById("filterRating")?.value || 0);
  const maxPrice  = Number(document.getElementById("filterPrice")?.value || 1000);
  const sort      = document.getElementById("filterSort")?.value || "recommended";
  const query     = document.getElementById("searchQuery")?.value.trim().toLowerCase() || "";

  let workers = window.Storage.getWorkers({ category, minRating, maxPrice, query });

  if (sort === "rating_desc")     workers.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  else if (sort === "price_asc")  workers.sort((a, b) => a.price - b.price);
  else if (sort === "experience_desc") workers.sort((a, b) => b.experience - a.experience);

  currentSearchResults = workers;

  const titleEl    = document.getElementById("resultsTitle");
  const subtitleEl = document.getElementById("resultsSubtitle");
  if (titleEl) titleEl.textContent = `${workers.length} Verified Workers Available Near You`;
  if (subtitleEl) subtitleEl.textContent = category && LF_SERVICE_LABELS[category]
    ? `Showing ${LF_SERVICE_LABELS[category]} workers near your area.`
    : "Showing all verified home service workers available for booking.";

  renderResults(workers);

  if (isMapViewActive && window.LocalFixMap) {
    window.LocalFixMap.initSearchMap("searchMap", workers);
  }
}

function renderResults(results) {
  const grid    = document.getElementById("workerResults");
  const emptyEl = document.getElementById("resultsEmpty");
  if (!grid) return;

  if (!results.length) {
    grid.classList.add("d-none");
    if (emptyEl) {
      emptyEl.classList.remove("d-none");
      emptyEl.innerHTML = lfEmptyState(
        "bi-emoji-frown",
        "No workers match these filters",
        "Try changing the category, reducing the minimum rating, or adjusting the price slider."
      );
    }
    return;
  }

  grid.classList.remove("d-none");
  if (emptyEl) emptyEl.classList.add("d-none");

  grid.innerHTML = results.map((w) => {
    const surcharge = window.Storage.getDistanceSurcharge(w);
    const distBadge = lfDistanceBadge(w);
    const ratingHtml = w.rating !== null
      ? `${lfRenderStars(w.rating)} <span class="fw-bold small text-dark">${w.rating}</span> <span class="text-muted small">(${w.reviewsCount})</span>`
      : `<span class="text-muted small fst-italic">No ratings yet</span>`;

    return `
    <div class="col-md-6">
      <div class="lf-card lf-worker-card h-100 d-flex flex-column justify-content-between">
        <div>
          <div class="d-flex gap-3 align-items-start">
            <div class="lf-worker-avatar">${w.name.split(" ").map((n) => n[0]).join("")}</div>
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h6 class="mb-0 fw-bold">${w.name}</h6>
                ${w.verified ? '<span class="lf-badge-verified"><i class="bi bi-patch-check-fill"></i> Verified</span>' : ""}
                ${w.available ? '<span class="small text-success fw-semibold"><span class="lf-pulse-dot me-1"></span>Available</span>' : '<span class="small text-muted">Busy</span>'}
              </div>
              <div class="small text-muted mb-1">${LF_SERVICE_LABELS[w.category] || w.category} &middot; ${w.experience} yrs exp</div>
              <div class="small d-flex align-items-center gap-2 flex-wrap">${ratingHtml}</div>
              <div class="small text-muted mt-1">
                <i class="bi bi-geo-alt me-1 text-primary"></i>${w.area} ${distBadge}
                ${surcharge > 0 ? `<span class="text-warning small fw-semibold ms-1">+&#8377;${surcharge} travel</span>` : ""}
              </div>
            </div>
          </div>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
          <div>
            <span class="small text-muted d-block" style="font-size:0.72rem">Starting from</span>
            <span class="lf-mono fw-bold fs-5 text-dark">&#8377;${w.price}<span class="text-muted small fw-normal" style="font-size:0.75rem">/visit</span></span>
            ${surcharge > 0 ? `<div class="text-warning small">+&#8377;${surcharge} travel</div>` : ""}
          </div>
          <div class="d-flex gap-2">
            <a href="worker-profile.html?id=${w.id}" class="btn btn-lf-outline btn-sm">View Profile</a>
            <a href="booking.html?worker=${w.id}" class="btn btn-lf-primary btn-sm"><i class="bi bi-calendar-check me-1"></i>Book</a>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");
}
