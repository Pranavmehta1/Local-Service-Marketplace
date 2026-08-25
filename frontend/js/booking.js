/**
 * LocalFix Booking Wizard
 * - Inline field validation (no alert popups)
 * - Distance surcharge logic
 * - Interactive map location picker on step 5
 */

document.addEventListener("DOMContentLoaded", () => {
  const params   = new URLSearchParams(window.location.search);
  const workerId = params.get("worker") || "w1";
  const worker   = window.Storage.getWorkerById(workerId);
  const user     = window.Storage.getCurrentUser();

  if (!user || user.role !== "customer") {
    if (workerId) {
      sessionStorage.setItem("redirect_to_booking", workerId);
    }
    window.location.href = "auth.html";
    return;
  }

  let currentStep  = 1;
  const totalSteps = 7;
  const stepLabels = ["Service","Problem","Date","Time","Address","Review","Done"];

  // Pre-fill service category
  const serviceSelect = document.getElementById("serviceSelect");
  if (serviceSelect && worker) serviceSelect.value = worker.category;

  // Pre-fill address
  const addressInput = document.getElementById("addressInput");
  if (addressInput && user && user.location) addressInput.value = user.location;

  // Show distance surcharge notice
  const surcharge = worker ? window.Storage.getDistanceSurcharge(worker) : 0;
  if (surcharge > 0) {
    const notice = document.createElement("div");
    notice.className = "alert alert-warning d-flex align-items-center gap-2 py-2 mb-3 small";
    notice.innerHTML = `<i class="bi bi-geo-alt-fill text-warning fs-5"></i><div><strong>Long-distance worker:</strong> ${worker.area} is more than 10 km away. A travel charge of <strong>+&#8377;${surcharge}</strong> will be added.</div>`;
    const cardEl = document.querySelector(".lf-card");
    if (cardEl) cardEl.prepend(notice);
  }

  renderTimeSlots();
  renderStepper();

  const minDate = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("bookingDate");
  if (dateInput) { dateInput.min = minDate; dateInput.value = minDate; }

  document.getElementById("btnNext")?.addEventListener("click", () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === totalSteps - 1) finalizeBooking(worker);
    if (currentStep < totalSteps) { currentStep += 1; goToStep(currentStep, worker); }
  });

  document.getElementById("btnBack")?.addEventListener("click", () => {
    if (currentStep > 1) { currentStep -= 1; goToStep(currentStep, worker); }
  });

  // ── Stepper ──────────────────────────────────────────────────────────────
  function renderStepper() {
    const el = document.getElementById("wizardSteps");
    if (!el) return;
    el.innerHTML = stepLabels.map((label, i) => {
      const n = i + 1;
      const cls = n < currentStep ? "done" : n === currentStep ? "active" : "";
      return `<div class="step ${cls}"><div class="dot">${n < currentStep ? '<i class="bi bi-check-lg"></i>' : n}</div><span>${label}</span></div>`;
    }).join("");
  }

  // ── Time Slots ───────────────────────────────────────────────────────────
  function renderTimeSlots() {
    const slots = ["09:00 AM - 11:00 AM","11:00 AM - 01:00 PM","02:00 PM - 04:00 PM","04:00 PM - 06:00 PM"];
    const el = document.getElementById("timeSlots");
    if (!el) return;
    el.innerHTML = slots.map((s, i) => `
      <div class="col-6">
        <div class="lf-timeslot ${i === 0 ? "selected" : ""}" data-slot="${s}">
          <i class="bi bi-clock me-1 text-primary"></i> ${s}
        </div>
      </div>
    `).join("");
    document.querySelectorAll(".lf-timeslot").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".lf-timeslot").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
  }

  // ── Inline Validation ────────────────────────────────────────────────────
  const showErr = (el, msg) => {
    if (!el) return;
    el.classList.add("lf-input-error");
    let span = el.parentElement.querySelector(".lf-field-error");
    if (!span) { span = document.createElement("span"); span.className = "lf-field-error"; el.parentElement.appendChild(span); }
    span.textContent = msg;
  };
  const clearErr = (el) => {
    if (!el) return;
    el.classList.remove("lf-input-error");
    const s = el.parentElement?.querySelector(".lf-field-error");
    if (s) s.textContent = "";
  };

  function validateStep(step) {
    if (step === 2) {
      const el = document.getElementById("problemDesc");
      clearErr(el);
      if (!el?.value.trim()) { showErr(el, "Please describe the issue before continuing."); return false; }
    }
    if (step === 3) {
      const el = document.getElementById("bookingDate");
      clearErr(el);
      if (!el?.value) { showErr(el, "Please select a service date."); return false; }
    }
    if (step === 5) {
      const el = document.getElementById("addressInput");
      clearErr(el);
      if (!el?.value.trim()) { showErr(el, "Please enter or pin your service address."); return false; }
    }
    return true;
  }

  // ── Review Summary ───────────────────────────────────────────────────────
  function buildReviewSummary(w) {
    const service  = document.getElementById("serviceSelect");
    const sLabel   = service ? service.options[service.selectedIndex].text : "Service";
    const date     = document.getElementById("bookingDate")?.value || "-";
    const slot     = document.querySelector(".lf-timeslot.selected")?.dataset.slot || "Morning";
    const address  = document.getElementById("addressInput")?.value || "-";
    const problem  = document.getElementById("problemDesc")?.value || "-";
    const basePrice = Number(w?.price) || 200;
    const totalPrice = basePrice + surcharge;

    document.getElementById("reviewSummary").innerHTML = `
      <div class="d-flex justify-content-between border-bottom py-2"><span class="text-muted">Worker</span><strong>${w?.name} (${w?.area})</strong></div>
      <div class="d-flex justify-content-between border-bottom py-2"><span class="text-muted">Service</span><strong>${sLabel}</strong></div>
      <div class="d-flex justify-content-between border-bottom py-2"><span class="text-muted">Problem</span><strong class="text-wrap" style="max-width:65%">${problem}</strong></div>
      <div class="d-flex justify-content-between border-bottom py-2"><span class="text-muted">Date</span><strong>${date}</strong></div>
      <div class="d-flex justify-content-between border-bottom py-2"><span class="text-muted">Time Slot</span><strong>${slot}</strong></div>
      <div class="d-flex justify-content-between border-bottom py-2"><span class="text-muted">Address</span><strong>${address}</strong></div>
      <div class="d-flex justify-content-between border-bottom py-2"><span class="text-muted">Base Charge</span><strong class="lf-mono">&#8377;${basePrice}</strong></div>
      ${surcharge > 0 ? `<div class="d-flex justify-content-between border-bottom py-2 text-warning"><span>Travel Charge (&gt;10 km)</span><strong class="lf-mono">+&#8377;${surcharge}</strong></div>` : ""}
      <div class="d-flex justify-content-between py-2"><span class="fw-bold">Total Payable</span><strong class="lf-mono text-primary fs-5">&#8377;${totalPrice}</strong></div>
    `;
  }

  // ── Finalize Booking ─────────────────────────────────────────────────────
  function finalizeBooking(w) {
    const service = document.getElementById("serviceSelect");
    const sLabel  = service ? service.options[service.selectedIndex].text : "Service";
    const booking = window.Storage.createBooking({
      workerId:           w?.id,
      workerName:         w?.name,
      service:            sLabel,
      serviceCategory:    w?.category,
      problemDescription: document.getElementById("problemDesc")?.value || "",
      customerAddress:    document.getElementById("addressInput")?.value || "",
      date:               document.getElementById("bookingDate")?.value || "",
      slot:               document.querySelector(".lf-timeslot.selected")?.dataset.slot || "",
      price:              w?.price || 200,
    });
    const el = document.getElementById("confirmedBookingId");
    if (el) el.textContent = booking.id;
  }

  // ── Step Navigation ──────────────────────────────────────────────────────
  function goToStep(step, w) {
    document.querySelectorAll(".wizard-pane").forEach((p) => p.classList.remove("active"));
    document.querySelector(`.wizard-pane[data-step="${step}"]`)?.classList.add("active");
    renderStepper();

    const nav     = document.getElementById("wizardNav");
    const backBtn = document.getElementById("btnBack");
    const nextBtn = document.getElementById("btnNext");

    // Init location map on step 5
    if (step === 5) {
      setTimeout(() => {
        if (window.LocalFixMap && !window._bookingLocationPicker) {
          window._bookingLocationPicker = window.LocalFixMap.initLocationPicker("bookingLocationMap", (lat, lng) => {
            const addr = document.getElementById("addressInput");
            if (addr && !addr.value.trim()) addr.value = `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)}), Ludhiana`;
          });
          document.getElementById("btnLocateGps")?.addEventListener("click", () => {
            window._bookingLocationPicker?.locateMe();
          });
        }
      }, 60);
    }

    if (step === 6) buildReviewSummary(w);

    if (backBtn) backBtn.style.visibility = step === 1 ? "hidden" : "visible";
    if (step === totalSteps) {
      nav?.classList.add("d-none");
    } else {
      nav?.classList.remove("d-none");
      if (nextBtn) nextBtn.textContent = step === totalSteps - 1 ? "Confirm & Book" : "Continue";
    }
  }
});
