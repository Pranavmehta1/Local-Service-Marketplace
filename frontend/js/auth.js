/**
 * LocalFix Authentication Logic
 * - Inline field validation (no alert popups)
 * - Multi-user role isolation
 * - 1-second loading page screen before entering dashboard
 * - State and area aware registration
 */
document.addEventListener("DOMContentLoaded", () => {
  const roleButtons          = document.querySelectorAll(".lf-role-btn");
  const tabLogin             = document.getElementById("tabLogin");
  const tabRegister          = document.getElementById("tabRegister");
  const loginForm            = document.getElementById("loginForm");
  const customerRegisterForm = document.getElementById("customerRegisterForm");
  const workerRegisterForm   = document.getElementById("workerRegisterForm");
  const loginError           = document.getElementById("loginError");

  let currentRole = "customer";
  let currentTab  = "login";

  const params = new URLSearchParams(window.location.search);
  if (params.get("role") === "worker") currentRole = "worker";
  if (params.get("mode") === "register") currentTab = "register";

  // ── Inline Validation Helpers ─────────────────────────────────────────────
  const showFieldError = (inputEl, msg) => {
    if (!inputEl) return;
    inputEl.classList.add("lf-input-error");
    let err = inputEl.parentElement.querySelector(".lf-field-error");
    if (!err) {
      err = document.createElement("span");
      err.className = "lf-field-error";
      inputEl.parentElement.appendChild(err);
    }
    err.textContent = msg;
  };

  const clearFieldError = (inputEl) => {
    if (!inputEl) return;
    inputEl.classList.remove("lf-input-error");
    const err = inputEl.parentElement?.querySelector(".lf-field-error");
    if (err) err.textContent = "";
  };

  const validateRequired = (fields) => {
    let valid = true;
    fields.forEach(({ el, msg }) => {
      if (!el) return;
      clearFieldError(el);
      if (!el.value.trim()) {
        showFieldError(el, msg || "This field is required.");
        valid = false;
      }
    });
    return valid;
  };

  // ── Role/Tab UI ───────────────────────────────────────────────────────────
  const updateRoleSpecificTexts = () => {
    const title  = document.getElementById("authFormTitle");
    const desc   = document.getElementById("authFormDesc");
    const btn    = document.getElementById("loginSubmitBtn");
    const t = (k, d) => (window.i18n ? window.i18n.t(k, d) : d);

    if (currentTab === "login") {
      if (currentRole === "worker") {
        if (title) title.textContent = t("auth.login_worker_title", "🛠️ Service Worker Sign In");
        if (desc)  desc.textContent  = t("auth.login_worker_desc", "Log in to manage customer bookings, accept repair jobs, and check earnings.");
        if (btn) {
          btn.textContent = t("auth.btn_signin_worker", "Sign In as Service Worker");
          btn.className   = "btn w-100 py-2 fw-semibold";
          btn.style.cssText = "background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;border:none;border-radius:10px;";
        }
      } else {
        if (title) title.textContent = t("auth.login_cust_title", "👤 Customer Sign In");
        if (desc)  desc.textContent  = t("auth.login_cust_desc", "Access your home service bookings, track technician arrival, and view bills.");
        if (btn) {
          btn.textContent = t("auth.btn_signin_cust", "Sign In as Customer");
          btn.className   = "btn btn-lf-primary w-100 py-2 fw-semibold";
          btn.style.cssText = "";
        }
      }
    } else {
      // register tab
      if (currentRole === "worker") {
        if (title) title.textContent = t("auth.reg_worker_title", "🛠️ Join as Service Worker");
        if (desc)  desc.textContent  = t("auth.reg_worker_desc", "Apply to join LocalFix's verified worker network across your state and area.");
      } else {
        if (title) title.textContent = t("auth.reg_cust_title", "👤 Create Customer Account");
        if (desc)  desc.textContent  = t("auth.reg_cust_desc", "Register to book verified electricians, plumbers, and technicians.");
      }
    }
  };

  window.addEventListener("lf:lang-changed", updateRoleSpecificTexts);

  const applyRoleUI = () => {
    roleButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.role === currentRole));
    updateRoleSpecificTexts();
  };

  const applyTabUI = () => {
    tabLogin.classList.toggle("btn-lf-dark",    currentTab === "login");
    tabLogin.classList.toggle("btn-lf-outline", currentTab !== "login");
    tabRegister.classList.toggle("btn-lf-dark",    currentTab === "register");
    tabRegister.classList.toggle("btn-lf-outline", currentTab !== "register");

    loginForm?.classList.toggle("d-none", currentTab !== "login");
    customerRegisterForm?.classList.toggle("d-none", !(currentTab === "register" && currentRole === "customer"));
    workerRegisterForm?.classList.toggle("d-none",   !(currentTab === "register" && currentRole === "worker"));
    if (loginError) loginError.classList.add("d-none");
    updateRoleSpecificTexts();
  };

  roleButtons.forEach((btn) => {
    btn.addEventListener("click", () => { currentRole = btn.dataset.role; applyRoleUI(); applyTabUI(); });
  });
  tabLogin.addEventListener("click",    () => { currentTab = "login";    applyTabUI(); });
  tabRegister.addEventListener("click", () => { currentTab = "register"; applyTabUI(); });

  applyRoleUI();
  applyTabUI();

  // ── Redirect by Role ──────────────────────────────────────────────────────
  const redirectByUserRole = (user) => {
    const pendingBookingWorker = sessionStorage.getItem("redirect_to_booking");
    if (user.role === "customer" && pendingBookingWorker) {
      sessionStorage.removeItem("redirect_to_booking");
      window.location.href = `booking.html?worker=${pendingBookingWorker}`;
      return;
    }
    if (user.role === "admin")  window.location.href = "admin-dashboard.html";
    else if (user.role === "worker") window.location.href = "worker-dashboard.html";
    else window.location.href = "customer-dashboard.html";
  };

  // ── Login Form ───────────────────────────────────────────────────────────
  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const emailEl    = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");

    clearFieldError(emailEl);
    clearFieldError(passwordEl);
    if (loginError) loginError.classList.add("d-none");

    if (!validateRequired([
      { el: emailEl,    msg: "Please enter your email address." },
      { el: passwordEl, msg: "Please enter your password." },
    ])) return;

    try {
      const user = window.Storage.loginUser(emailEl.value.trim(), passwordEl.value);

      if (currentRole === "worker" && user.role === "customer") {
        showFieldError(emailEl, "This email belongs to a Customer account. Please switch to 'Customer Account' above or use a worker account (e.g. rahul@localfix.com).");
        return;
      }
      if (currentRole === "customer" && user.role === "worker") {
        showFieldError(emailEl, "This email belongs to a Service Worker account. Please switch to 'Service Worker' above.");
        return;
      }

      redirectByUserRole(user);
    } catch (err) {
      showFieldError(emailEl, err.message);
    }
  });

  // ── Customer Registration ─────────────────────────────────────────────────
  customerRegisterForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameEl     = document.getElementById("custName");
    const emailEl    = document.getElementById("custEmail");
    const phoneEl    = document.getElementById("custPhone");
    const passwordEl = document.getElementById("custPassword");
    const stateEl    = document.getElementById("custState");
    const locationEl = document.getElementById("custLocation");

    [nameEl, emailEl, phoneEl, passwordEl].forEach(clearFieldError);

    if (!validateRequired([
      { el: nameEl,     msg: "Full name is required." },
      { el: emailEl,    msg: "Email address is required." },
      { el: phoneEl,    msg: "Phone number is required." },
      { el: passwordEl, msg: "Password is required (min 6 chars)." },
    ])) return;

    if (passwordEl && passwordEl.value.length < 6) {
      showFieldError(passwordEl, "Password must be at least 6 characters.");
      return;
    }

    try {
      const user = window.Storage.registerUser({
        name:     nameEl.value.trim(),
        email:    emailEl.value.trim(),
        phone:    phoneEl.value.trim(),
        password: passwordEl.value,
        role:     "customer",
        state:    stateEl?.value || "Punjab",
        location: locationEl?.value.trim() || "Model Town, Ludhiana",
      });
      redirectByUserRole(user);
    } catch (err) {
      showFieldError(emailEl, err.message);
    }
  });

  // ── Worker Registration ───────────────────────────────────────────────────
  workerRegisterForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameEl     = document.getElementById("workerNameInput");
    const emailEl    = document.getElementById("workerEmail");
    const phoneEl    = document.getElementById("workerPhone");
    const passwordEl = document.getElementById("workerPassword");
    const categoryEl = document.getElementById("workerCategory");
    const expEl      = document.getElementById("workerExp");
    const stateEl    = document.getElementById("workerState");
    const areaEl     = document.getElementById("workerArea");
    const priceEl    = document.getElementById("workerPrice");
    const skillsEl   = document.getElementById("workerSkills");

    [nameEl, emailEl, phoneEl, passwordEl, priceEl, areaEl].forEach(clearFieldError);

    if (!validateRequired([
      { el: nameEl,     msg: "Your full name is required." },
      { el: emailEl,    msg: "Email address is required." },
      { el: phoneEl,    msg: "Phone number is required." },
      { el: passwordEl, msg: "Password is required (min 6 chars)." },
      { el: areaEl,     msg: "Please enter your city and service area." },
      { el: priceEl,    msg: "Please enter your visit charge (₹)." },
    ])) return;

    if (passwordEl && passwordEl.value.length < 6) {
      showFieldError(passwordEl, "Password must be at least 6 characters.");
      return;
    }

    try {
      const user = window.Storage.registerUser({
        name:       nameEl?.value.trim(),
        email:      emailEl?.value.trim(),
        phone:      phoneEl?.value.trim(),
        password:   passwordEl?.value,
        role:       "worker",
        category:   categoryEl?.value || "electrician",
        experience: expEl?.value || "1",
        state:      stateEl?.value || "Punjab",
        location:   areaEl?.value.trim() || "Model Town, Ludhiana",
        price:      priceEl?.value || "200",
        skills:     skillsEl?.value || "",
      });
      redirectByUserRole(user);
    } catch (err) {
      showFieldError(emailEl, err.message);
    }
  });
});
