/**
 * LocalFix Worker Search & Discovery
 * - Strict State & City/Area filtering
 * - Zero workers from other states when a specific state is chosen
 * - Distance surcharge indicator (>10 km)
 * - Map & Grid view synchronization
 */

let currentSearchResults = [];
let isMapViewActive = false;

const DEFAULT_CATEGORIES = [
  { id: "electrician", name: "Electrician" },
  { id: "plumber", name: "Plumber" },
  { id: "ac_repair", name: "AC Repair" },
  { id: "ro_repair", name: "RO Repair" },
  { id: "carpenter", name: "Carpenter" },
  { id: "cleaning", name: "Home Cleaning" },
  { id: "appliance_repair", name: "Appliance Repair" }
];

async function populateCategoryDropdown() {
  const categorySelect = document.getElementById("filterCategory");
  if (!categorySelect) return;

  let categories = (typeof LF_SERVICES !== "undefined" && Array.isArray(LF_SERVICES) && LF_SERVICES.length)
    ? LF_SERVICES
    : DEFAULT_CATEGORIES;

  try {
    if (window.LocalFixAPI) {
      const res = await window.LocalFixAPI.get("/workers/categories").catch(() => null);
      if (res && Array.isArray(res.categories) && res.categories.length) {
        categories = res.categories;
      }
    }
  } catch (_) {}

  const currentVal = categorySelect.value;
  categorySelect.innerHTML = '<option value="">All Services</option>' +
    categories.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");

  const params = new URLSearchParams(window.location.search);
  const initialCategory = params.get("category") || currentVal || "";
  if (initialCategory) categorySelect.value = initialCategory;
}

document.addEventListener("DOMContentLoaded", () => {
  populateCategoryDropdown();

  // Read URL search params
  const params = new URLSearchParams(window.location.search);
  const initialState = params.get("state") || "";
  const initialArea  = params.get("area") || params.get("loc") || "";
  const initialQuery = params.get("q") || params.get("query") || "";

  const stateSelect = document.getElementById("filterState");
  if (stateSelect && initialState) stateSelect.value = initialState;

  const areaInput = document.getElementById("filterArea");
  if (areaInput && initialArea) areaInput.value = initialArea;

  const queryInput = document.getElementById("searchQuery");
  if (queryInput && initialQuery) queryInput.value = initialQuery;

  // Listeners for live filtering
  ["filterCategory", "filterState", "filterRating", "filterSort"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", applyFilters);
  });
  document.getElementById("searchQuery")?.addEventListener("input", applyFilters);
  document.getElementById("filterArea")?.addEventListener("input", applyFilters);

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
    setTimeout(() => {
      if (window.LocalFixMap) window.LocalFixMap.initSearchMap("searchMap", currentSearchResults);
    }, 50);
  });
}

function resolveStateFromArea(areaStr = "") {
  const lower = areaStr.toLowerCase();
  if (lower.includes("punjab") || lower.includes("ludhiana") || lower.includes("rajpura") || lower.includes("amritsar") || lower.includes("jalandhar") || lower.includes("chandigarh")) {
    return "Punjab";
  }
  if (lower.includes("delhi") || lower.includes("rohini") || lower.includes("dwarka") || lower.includes("saket") || lower.includes("karol")) {
    return "Delhi";
  }
  if (lower.includes("haryana") || lower.includes("gurugram") || lower.includes("faridabad") || lower.includes("ambala")) {
    return "Haryana";
  }
  return "Punjab";
}

async function applyFilters() {
  const category  = document.getElementById("filterCategory")?.value || "";
  const state     = document.getElementById("filterState")?.value || "all";
  const area      = document.getElementById("filterArea")?.value.trim() || "";
  const minRating = Number(document.getElementById("filterRating")?.value || 0);
  const maxPrice  = Number(document.getElementById("filterPrice")?.value || 1000);
  const sort      = document.getElementById("filterSort")?.value || "recommended";
  const query     = document.getElementById("searchQuery")?.value.trim().toLowerCase() || "";

  let workers = [];
  let registeredWorkersCount = 0;

  // Try fetching live workers from backend API
  try {
    if (window.LocalFixAPI) {
      const qParams = new URLSearchParams();
      if (category) qParams.append("category", category);
      if (minRating > 0) qParams.append("rating", minRating);
      if (maxPrice < 1000) qParams.append("maxPrice", maxPrice);
      if (sort && sort !== "recommended") qParams.append("sort", sort);

      const [res, stats] = await Promise.all([
        window.LocalFixAPI.get(`/workers?${qParams.toString()}`).catch(() => null),
        window.LocalFixAPI.get("/platform/stats").catch(() => null)
      ]);

      if (stats && typeof stats.registeredWorkers === "number") {
        registeredWorkersCount = stats.registeredWorkers;
      }

      if (res && Array.isArray(res.workers)) {
        workers = res.workers.map((w) => {
          const userObj = w.userId || {};
          const rawArea = w.serviceArea || userObj.location || "Ludhiana";
          const rawPrice = (w.pricing && w.pricing.startingPrice) || 200;
          return {
            id: w._id,
            name: userObj.name || "Verified Worker",
            category: w.serviceCategory,
            experience: w.experience || 1,
            price: rawPrice,
            rating: typeof w.rating === "number" && w.rating > 0 ? w.rating : null,
            reviewsCount: w.totalReviews || 0,
            area: rawArea,
            state: resolveStateFromArea(rawArea),
            verified: w.verificationStatus === "approved",
            available: true,
            skills: w.skills || [],
            about: w.about || "",
            completedJobs: w.completedJobs || 0
          };
        });
      }
    }
  } catch (err) {
    console.warn("Worker live fetch notice:", err);
  }

  // Fallback to local storage if API returned no data and local workers exist
  if (!workers.length) {
    const localWorkers = window.Storage.getWorkers({
      category,
      state: state === "all" ? "" : state,
      area,
      minRating,
      maxPrice,
      query
    });
    if (localWorkers && localWorkers.length) {
      workers = localWorkers;
    }
  }

  // Client-side area/query refinement
  if (state && state !== "all") {
    workers = workers.filter((w) => (w.state || "").toLowerCase() === state.toLowerCase());
  }
  if (area) {
    workers = workers.filter((w) => (w.area || "").toLowerCase().includes(area.toLowerCase()));
  }
  if (query) {
    workers = workers.filter((w) =>
      (w.name || "").toLowerCase().includes(query) ||
      (w.category || "").toLowerCase().includes(query) ||
      (w.area || "").toLowerCase().includes(query)
    );
  }

  if (sort === "rating_desc")     workers.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  else if (sort === "price_asc")  workers.sort((a, b) => a.price - b.price);
  else if (sort === "experience_desc") workers.sort((a, b) => b.experience - a.experience);

  currentSearchResults = workers;

  const titleEl    = document.getElementById("resultsTitle");
  const subtitleEl = document.getElementById("resultsSubtitle");

  let locLabel = "";
  if (area && state !== "all") locLabel = `in ${area}, ${state}`;
  else if (area) locLabel = `in ${area}`;
  else if (state !== "all") locLabel = `in ${state}`;
  else locLabel = "Across All Locations";

  if (titleEl) {
    if (workers.length > 0) {
      titleEl.textContent = `${workers.length} Verified Workers Available ${locLabel}`;
    } else {
      titleEl.textContent = `0 Verified Workers Found ${locLabel}`;
    }
  }

  if (subtitleEl) {
    if (workers.length > 0) {
      subtitleEl.textContent = category && typeof LF_SERVICE_LABELS !== "undefined" && LF_SERVICE_LABELS[category]
        ? `Showing verified ${LF_SERVICE_LABELS[category]} workers strictly matching your location.`
        : `Showing verified home service technicians available for booking.`;
    } else if (registeredWorkersCount > 0 && workers.length === 0) {
      subtitleEl.textContent = `There are ${registeredWorkersCount} registered technician(s) currently awaiting admin verification before they appear publicly for booking.`;
    } else {
      subtitleEl.textContent = state !== "all"
        ? `No verified workers have applied from ${state} yet for this service.`
        : `No workers match your filter criteria. Try adjusting the search or resetting filters.`;
    }
  }

  renderResults(workers, { state, area, category, registeredWorkersCount });

  if (isMapViewActive && window.LocalFixMap) {
    window.LocalFixMap.initSearchMap("searchMap", workers);
  }
}

function renderResults(results, currentFilters = {}) {
  const grid    = document.getElementById("workerResults");
  const emptyEl = document.getElementById("resultsEmpty");
  if (!grid) return;

  if (!results.length) {
    grid.classList.add("d-none");
    if (emptyEl) {
      emptyEl.classList.remove("d-none");

      const state = currentFilters.state && currentFilters.state !== "all" ? currentFilters.state : "";
      const area  = currentFilters.area || "";

      let emptyTitle = "No verified workers found";
      let emptyMsg   = "No technicians found matching your criteria.";

      if (currentFilters.registeredWorkersCount > 0) {
        emptyTitle = "Worker Verification in Progress";
        emptyMsg   = `There are <strong>${currentFilters.registeredWorkersCount}</strong> technician(s) registered on LocalFix who are currently undergoing verification. Once an application is approved by an admin, the verified profile will appear here immediately.`;
      } else if (state) {
        emptyTitle = `No verified workers found in ${state}`;
        emptyMsg   = `No service workers have applied or registered from <strong>${state}</strong> for this category yet. Workers from other states are hidden to ensure location accuracy.`;
      } else if (area) {
        emptyTitle = `No workers found in "${area}"`;
        emptyMsg   = `Try searching a nearby locality or choose "All States" to browse all verified technicians.`;
      }

      emptyEl.innerHTML = `
        <div class="lf-empty py-5 text-center bg-white rounded-4 p-4 border shadow-sm">
          <div class="lf-empty-icon mb-3">
            <i class="bi bi-geo-alt-fill text-muted opacity-50" style="font-size: 3rem;"></i>
          </div>
          <h4 class="fw-bold text-dark mb-2">${emptyTitle}</h4>
          <p class="text-muted small mb-4 mx-auto" style="max-width: 460px;">${emptyMsg}</p>
          <div class="d-flex justify-content-center gap-2 flex-wrap">
            <button type="button" onclick="resetToPunjab()" class="btn btn-lf-primary btn-sm px-3">
              <i class="bi bi-geo-alt me-1"></i> View Punjab Workers (Ludhiana / Rajpura)
            </button>
            <a href="worker-search.html" class="btn btn-outline-secondary btn-sm px-3">
              <i class="bi bi-arrow-repeat me-1"></i> Reset All Filters
            </a>
            <a href="auth.html?mode=register&role=worker" class="btn btn-outline-primary btn-sm px-3">
              <i class="bi bi-person-plus-fill me-1"></i> Register as Worker
            </a>
          </div>
        </div>
      `;
    }
    return;
  }

  grid.classList.remove("d-none");
  if (emptyEl) emptyEl.classList.add("d-none");

  grid.innerHTML = results.map((w) => {
    const surcharge = window.Storage.getDistanceSurcharge(w);
    const distBadge = lfDistanceBadge(w);
    const ratingHtml = w.rating !== null
      ? `${lfRenderStars(w.rating)} <span class="fw-bold small text-dark">${w.rating}</span> <span class="text-muted small">(${w.reviewsCount || 0})</span>`
      : `<span class="text-muted small fst-italic">No ratings yet</span>`;

    const stateTag = w.state ? `<span class="badge bg-light text-primary border me-1"><i class="bi bi-geo-alt me-1"></i>${w.state}</span>` : "";

    const t = (k, d) => (window.i18n ? window.i18n.t(k, d) : d);
    const verifiedLbl = t("worker.verified", "Verified");
    const availLbl = t("worker.available", "Available");
    const busyLbl = t("worker.busy", "Busy");
    const expLbl = t("worker.yrs_exp", "yrs exp");
    const feeLbl = t("worker.visiting_fee", "Visiting Fee");
    const perVisitLbl = t("worker.per_visit", "/visit");
    const bookNowLbl = t("worker.book_now", "Book Now");
    const travelLbl = t("worker.travel", "travel");
    const catName = lfGetServiceName(w.category);

    return `
    <div class="col-md-6">
      <div class="lf-card lf-worker-card h-100 d-flex flex-column justify-content-between p-3">
        <div>
          <div class="d-flex gap-3 align-items-start">
            <div class="lf-worker-avatar" style="width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,#0284C7,#0369A1);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.15rem;flex-shrink:0;">
              ${w.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h6 class="mb-0 fw-bold text-dark fs-6">${w.name}</h6>
                ${w.verified ? `<span class="lf-badge-verified"><i class="bi bi-patch-check-fill"></i> ${verifiedLbl}</span>` : ""}
                ${w.available ? `<span class="small text-success fw-semibold"><span class="lf-pulse-dot me-1"></span>${availLbl}</span>` : `<span class="small text-muted">${busyLbl}</span>`}
              </div>
              <div class="small text-muted mb-1">
                ${stateTag}
                <strong>${catName}</strong> &middot; ${w.experience} ${expLbl}
              </div>
              <div class="small d-flex align-items-center gap-2 flex-wrap mb-1">${ratingHtml}</div>
              <div class="small text-muted">
                <i class="bi bi-pin-map text-primary me-1"></i>${w.area || w.location || 'Local Area'} ${distBadge}
                ${surcharge > 0 ? `<span class="text-warning small fw-semibold ms-1">+₹${surcharge} ${travelLbl}</span>` : ""}
              </div>
            </div>
          </div>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
          <div>
            <span class="small text-muted d-block" style="font-size:0.72rem">${feeLbl}</span>
            <span class="lf-mono fw-bold fs-5 text-dark">₹${w.price}<span class="text-muted small fw-normal" style="font-size:0.75rem">${perVisitLbl}</span></span>
            ${surcharge > 0 ? `<div class="text-warning small">+₹${surcharge} ${travelLbl}</div>` : ""}
          </div>
          <div class="d-flex gap-2">
            <a href="booking.html?worker=${w.id}" class="btn btn-lf-primary btn-sm px-3 fw-semibold"><i class="bi bi-calendar-check me-1"></i>${bookNowLbl}</a>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");
}

function resetToPunjab() {
  const stateSelect = document.getElementById("filterState");
  if (stateSelect) stateSelect.value = "Punjab";
  const areaInput = document.getElementById("filterArea");
  if (areaInput) areaInput.value = "";
  applyFilters();
}

window.addEventListener("lf:lang-changed", applyFilters);

