/**
 * LocalFix Authentication Logic
 * - Inline field validation (no alert popups)
 * - Multi-user isolation
 * - Redirect by role
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

  // ── Inline Validation Helpers ────────────────────────────────────────────
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

  // ── Role/Tab UI ──────────────────────────────────────────────────────────
  const applyRoleUI = () => {
    roleButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.role === currentRole));
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
  };

  roleButtons.forEach((btn) => {
    btn.addEventListener("click", () => { currentRole = btn.dataset.role; applyRoleUI(); applyTabUI(); });
  });
  tabLogin.addEventListener("click",    () => { currentTab = "login";    applyTabUI(); });
  tabRegister.addEventListener("click", () => { currentTab = "register"; applyTabUI(); });

  applyRoleUI();
  applyTabUI();

  // ── Redirect by Role ─────────────────────────────────────────────────────
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

  // ── Demo Login ───────────────────────────────────────────────────────────
  window.loginAsDemo = (email) => {
    try {
      const user = window.Storage.loginUser(email, "password");
      redirectByUserRole(user);
    } catch (err) {
      if (loginError) { loginError.textContent = err.message; loginError.classList.remove("d-none"); }
    }
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
      lfShowToast("Logged in successfully!");
      setTimeout(() => redirectByUserRole(user), 400);
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
        location: locationEl?.value.trim() || "Ludhiana",
      });
      lfShowToast("Account created! Welcome to LocalFix.");
      setTimeout(() => redirectByUserRole(user), 600);
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
    const priceEl    = document.getElementById("workerPrice");
    const areaEl     = document.getElementById("workerArea");
    const skillsEl   = document.getElementById("workerSkills");

    [nameEl, emailEl, phoneEl, passwordEl, priceEl].forEach(clearFieldError);

    if (!validateRequired([
      { el: nameEl,     msg: "Your full name is required." },
      { el: emailEl,    msg: "Email address is required." },
      { el: phoneEl,    msg: "Phone number is required." },
      { el: passwordEl, msg: "Password is required (min 6 chars)." },
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
        skills:     skillsEl?.value || "",
        location:   areaEl?.value.trim() || "Ludhiana",
        price:      priceEl?.value || "200",
      });
      lfShowToast("Application submitted! Pending admin verification. Login now.");
      setTimeout(() => redirectByUserRole(user), 700);
    } catch (err) {
      showFieldError(emailEl, err.message);
    }
  });
});
