/**
 * LocalFix Authentication & Two-Step Verification (OTP) Controller
 * - Multi-role session isolation (Customer & Service Worker)
 * - Two-Step OTP Verification for Email & SMS
 * - 6-Digit Auto-advancing, Backspace & Paste-supporting OTP input
 * - Dynamic 5-minute expiry countdown & 60s resend cooldown
 * - Real error diagnostics (no fake success, no mock bypass)
 * - Full Hindi & English i18n support
 */
document.addEventListener("DOMContentLoaded", () => {
  const roleButtons          = document.querySelectorAll(".lf-role-btn");
  const tabLogin             = document.getElementById("tabLogin");
  const tabRegister          = document.getElementById("tabRegister");
  const authMainFlow         = document.getElementById("authMainFlow");
  const otpSection           = document.getElementById("otpSection");
  const loginForm            = document.getElementById("loginForm");
  const customerRegisterForm = document.getElementById("customerRegisterForm");
  const workerRegisterForm   = document.getElementById("workerRegisterForm");
  const loginError           = document.getElementById("loginError");

  // OTP DOM elements
  const otpHeading           = document.getElementById("otpHeading");
  const otpSubText           = document.getElementById("otpSubText");
  const otpTargetDisplay     = document.getElementById("otpTargetDisplay");
  const otpInputsContainer   = document.getElementById("otpInputsContainer");
  const otpDigits            = document.querySelectorAll(".lf-otp-digit");
  const otpCountdownEl       = document.getElementById("otpCountdown");
  const btnOtpResend         = document.getElementById("btnOtpResend");
  const btnOtpResendText     = document.getElementById("btnOtpResendText");
  const btnOtpVerify         = document.getElementById("btnOtpVerify");
  const btnOtpVerifyText     = document.getElementById("btnOtpVerifyText");
  const otpSpinner           = document.getElementById("otpSpinner");
  const btnOtpSwitchMethod   = document.getElementById("btnOtpSwitchMethod");
  const btnOtpSwitchMethodText = document.getElementById("btnOtpSwitchMethodText");
  const btnOtpBack           = document.getElementById("btnOtpBack");
  const otpError             = document.getElementById("otpError");
  const otpNotice            = document.getElementById("otpNotice");

  let currentRole = "customer";
  let currentTab  = "login";

  const params = new URLSearchParams(window.location.search);
  if (params.get("role") === "worker") currentRole = "worker";
  if (params.get("mode") === "register") currentTab = "register";

  const t = (k, d) => (window.i18n ? window.i18n.t(k, d) : d);

  // ── OTP State (Pure Backend-Backed, No Mocking) ───────────────────────────
  const otpState = {
    active: false,
    purpose: "login", // 'login' | 'register'
    type: "email",    // 'email' | 'phone'
    email: "",
    phone: "",
    user: null,
    pendingUserData: null,
    expirySeconds: 300,
    cooldownSeconds: 60,
    expiryTimer: null,
    cooldownTimer: null,
  };

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
    const title = document.getElementById("authFormTitle");
    const desc  = document.getElementById("authFormDesc");
    const btn   = document.getElementById("loginSubmitBtn");

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
      if (currentRole === "worker") {
        if (title) title.textContent = t("auth.reg_worker_title", "🛠️ Join as Service Worker");
        if (desc)  desc.textContent  = t("auth.reg_worker_desc", "Apply to join LocalFix's verified worker network across your state and area.");
      } else {
        if (title) title.textContent = t("auth.reg_cust_title", "👤 Create Customer Account");
        if (desc)  desc.textContent  = t("auth.reg_cust_desc", "Register to book verified electricians, plumbers, and technicians.");
      }
    }
  };

  window.addEventListener("lf:lang-changed", () => {
    updateRoleSpecificTexts();
    if (otpState.active) updateOtpLabels();
  });

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
  tabLogin?.addEventListener("click",    () => { currentTab = "login";    applyTabUI(); });
  tabRegister?.addEventListener("click", () => { currentTab = "register"; applyTabUI(); });

  applyRoleUI();
  applyTabUI();

  // ── Redirect by Role ──────────────────────────────────────────────────────
  const redirectByUserRole = (user) => {
    const pendingBookingWorker = sessionStorage.getItem("redirect_to_booking");
    const isInsidePages = window.location.pathname.includes("/pages/");
    const prefix = isInsidePages ? "" : "pages/";

    if (user.role === "customer" && pendingBookingWorker) {
      sessionStorage.removeItem("redirect_to_booking");
      window.location.href = `${prefix}booking.html?worker=${pendingBookingWorker}`;
      return;
    }
    if (user.role === "admin") {
      window.location.href = `${prefix}admin-dashboard.html`;
    } else if (user.role === "worker") {
      window.location.href = `${prefix}worker-dashboard.html`;
    } else {
      window.location.href = `${prefix}customer-dashboard.html`;
    }
  };

  // ── OTP UI & Timers ───────────────────────────────────────────────────────
  const updateOtpLabels = () => {
    if (!otpState.active) return;
    const isEmail = otpState.type === "email";
    if (otpSubText) {
      otpSubText.textContent = isEmail
        ? t("otp.sent_to_email", "We sent a 6-digit verification code to your email")
        : t("otp.sent_to_phone", "We sent a 6-digit SMS verification code to your phone");
    }
    if (otpTargetDisplay) {
      otpTargetDisplay.textContent = isEmail ? otpState.email : (otpState.phone || "your phone");
    }
    if (btnOtpSwitchMethodText) {
      btnOtpSwitchMethodText.textContent = isEmail
        ? t("otp.switch_to_phone", "Send code via SMS to phone instead")
        : t("otp.switch_to_email", "Send code to email instead");
    }
    if (btnOtpSwitchMethod) {
      const hasOther = isEmail ? !!otpState.phone : !!otpState.email;
      btnOtpSwitchMethod.parentElement?.classList.toggle("d-none", !hasOther);
    }
  };

  const startExpiryCountdown = (seconds = 300) => {
    clearInterval(otpState.expiryTimer);
    otpState.expirySeconds = seconds;
    const update = () => {
      const m = Math.floor(otpState.expirySeconds / 60);
      const s = otpState.expirySeconds % 60;
      if (otpCountdownEl) {
        otpCountdownEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
      if (otpState.expirySeconds <= 0) {
        clearInterval(otpState.expiryTimer);
        showOtpError(t("otp.err_expired", "This verification code has expired. Please request a new code."));
        if (btnOtpVerify) btnOtpVerify.disabled = true;
      }
      otpState.expirySeconds -= 1;
    };
    update();
    otpState.expiryTimer = setInterval(update, 1000);
  };

  const startCooldownTimer = (seconds = 60) => {
    clearInterval(otpState.cooldownTimer);
    otpState.cooldownSeconds = seconds;
    if (btnOtpResend) btnOtpResend.disabled = true;

    const update = () => {
      if (otpState.cooldownSeconds <= 0) {
        clearInterval(otpState.cooldownTimer);
        if (btnOtpResend) btnOtpResend.disabled = false;
        if (btnOtpResendText) btnOtpResendText.textContent = t("otp.resend_code", "Resend Code");
      } else {
        if (btnOtpResendText) {
          btnOtpResendText.textContent = `${t("otp.resend_in", "Resend in")} ${otpState.cooldownSeconds}s`;
        }
        otpState.cooldownSeconds -= 1;
      }
    };
    update();
    otpState.cooldownTimer = setInterval(update, 1000);
  };

  const showOtpError = (msg) => {
    if (!otpError) return;
    otpError.textContent = msg;
    otpError.classList.remove("d-none");
    otpNotice?.classList.add("d-none");
    if (otpInputsContainer) {
      otpInputsContainer.classList.remove("lf-otp-shake");
      void otpInputsContainer.offsetWidth;
      otpInputsContainer.classList.add("lf-otp-shake");
    }
  };

  const clearOtpMessages = () => {
    otpError?.classList.add("d-none");
    otpNotice?.classList.add("d-none");
  };

  const showOtpNotice = (msg) => {
    if (!otpNotice) return;
    otpNotice.textContent = msg;
    otpNotice.classList.remove("d-none");
    otpError?.classList.add("d-none");
  };

  let isVerifying = false;

  const setVerifyingState = (verifying) => {
    isVerifying = verifying;
    if (btnOtpVerify) btnOtpVerify.disabled = verifying;
    if (otpSpinner) otpSpinner.classList.toggle("d-none", !verifying);
    if (btnOtpVerifyText) {
      btnOtpVerifyText.textContent = verifying
        ? t("otp.verifying", "Verifying code...")
        : t("otp.verify_btn", "Verify & Continue");
    }
    otpDigits.forEach((d) => (d.disabled = verifying));
  };

  const showOtpScreen = async ({ purpose, email, phone, role, userData, user }) => {
    otpState.active = true;
    otpState.purpose = purpose;
    otpState.type = "email";
    otpState.email = email || "";
    otpState.phone = phone || "";
    otpState.userData = userData || null;
    otpState.pendingUserData = userData || null;
    otpState.user = user || null;

    authMainFlow?.classList.add("d-none");
    otpSection?.classList.remove("d-none");

    clearOtpMessages();
    setVerifyingState(false);
    otpDigits.forEach((d) => {
      d.value = "";
      d.disabled = false;
    });
    if (otpDigits[0]) otpDigits[0].focus();

    updateOtpLabels();
    startExpiryCountdown(300);

    await dispatchSendOtp();
  };

  const hideOtpScreen = () => {
    otpState.active = false;
    isVerifying = false;
    clearInterval(otpState.expiryTimer);
    clearInterval(otpState.cooldownTimer);
    otpSection?.classList.add("d-none");
    authMainFlow?.classList.remove("d-none");
    clearOtpMessages();
  };

  // ── Dispatch OTP Send to Backend API ─────────────────────────────────────
  const dispatchSendOtp = async () => {
    const isEmail = otpState.type === "email";
    const identifier = isEmail ? otpState.email : otpState.phone;

    clearOtpMessages();
    if (btnOtpResendText) btnOtpResendText.textContent = t("otp.resending", "Sending code...");

    try {
      if (!window.LocalFixAPI) {
        throw new Error("LocalFixAPI client is not loaded.");
      }

      const res = await window.LocalFixAPI.post("/otp/send", {
        identifier,
        type: otpState.type,
        purpose: otpState.purpose,
        role: currentRole,
      }, { auth: false });

      showOtpNotice(res.message || `Verification code sent to ${identifier}`);
      startCooldownTimer(res.cooldownSeconds || 60);
    } catch (err) {
      showOtpError(err.message || "Failed to dispatch verification code.");
      if (btnOtpResend) btnOtpResend.disabled = false;
      if (btnOtpResendText) btnOtpResendText.textContent = t("otp.resend_code", "Resend Code");
    }
  };

  // ── 6-Digit Auto-advance, Backspace & Paste Event Listeners ───────────────
  otpDigits.forEach((digitInput, idx) => {
    digitInput.addEventListener("input", (e) => {
      const val = e.target.value.replace(/\D/g, "");
      e.target.value = val ? val[val.length - 1] : "";
      clearOtpMessages();

      if (e.target.value && idx < otpDigits.length - 1) {
        otpDigits[idx + 1].focus();
        otpDigits[idx + 1].select();
      }

      const enteredCode = Array.from(otpDigits).map((d) => d.value).join("");
      if (enteredCode.length === 6) {
        handleVerifyOtp();
      }
    });

    digitInput.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        if (!e.target.value && idx > 0) {
          otpDigits[idx - 1].focus();
          otpDigits[idx - 1].value = "";
        }
      } else if (e.key === "ArrowLeft" && idx > 0) {
        e.preventDefault();
        otpDigits[idx - 1].focus();
      } else if (e.key === "ArrowRight" && idx < otpDigits.length - 1) {
        e.preventDefault();
        otpDigits[idx + 1].focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleVerifyOtp();
      }
    });

    digitInput.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData("text").trim();
      const cleanDigits = pasted.replace(/\D/g, "").slice(0, 6);
      if (!cleanDigits) return;

      cleanDigits.split("").forEach((char, i) => {
        if (otpDigits[i]) otpDigits[i].value = char;
      });

      const nextFocus = Math.min(cleanDigits.length, otpDigits.length - 1);
      if (otpDigits[nextFocus]) otpDigits[nextFocus].focus();

      if (cleanDigits.length === 6) {
        handleVerifyOtp();
      }
    });

    digitInput.addEventListener("focus", () => digitInput.select());
  });

  // ── Handle OTP Verification ───────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (isVerifying) return; // Prevent duplicate concurrent in-flight requests

    clearOtpMessages();
    const enteredCode = Array.from(otpDigits).map((d) => d.value.trim()).join("");

    if (enteredCode.length !== 6) {
      showOtpError(t("otp.err_incomplete", "Please enter all 6 digits of your verification code."));
      return;
    }

    setVerifyingState(true);

    const identifier = otpState.type === "email" ? otpState.email : otpState.phone;

    try {
      if (!window.LocalFixAPI) throw new Error("LocalFixAPI client is not loaded.");

      const payload = {
        identifier,
        otp: enteredCode,
        purpose: otpState.purpose,
        type: otpState.type,
      };

      const pendingData = otpState.pendingUserData || otpState.userData;
      if (pendingData) {
        payload.userData = pendingData;
      }

      const res = await window.LocalFixAPI.post("/otp/verify", payload, { auth: false });

      if (!res.verified) {
        throw new Error(res.message || t("otp.err_invalid", "Incorrect verification code. Please check and try again."));
      }

      // Successful verification! Determine authenticated user
      let user = res.user || otpState.user;
      if (!user && pendingData) {
        user = {
          id: "u_" + Date.now(),
          name: pendingData.name,
          email: pendingData.email,
          phone: pendingData.phone,
          role: pendingData.role,
          location: pendingData.location || pendingData.serviceArea || "Model Town, Ludhiana",
          isVerified: true,
          isEmailVerified: otpState.type === "email",
          isPhoneVerified: otpState.type === "phone",
        };
      }

      if (!user) {
        throw new Error("Verification succeeded, but user account details could not be established. Please try logging in.");
      }

      user.isVerified = true;
      if (otpState.type === "email") user.isEmailVerified = true;
      if (otpState.type === "phone") user.isPhoneVerified = true;

      // Update LocalStorage user session
      if (window.Storage) {
        try {
          if (pendingData) {
            window.Storage.registerUser({
              ...pendingData,
              isVerified: true,
              isEmailVerified: otpState.type === "email",
              isPhoneVerified: otpState.type === "phone",
            });
          }
        } catch (e) {
          // Already in local storage, continue
        }
        window.Storage.setCurrentUser(user);
      }

      if (res.token) {
        localStorage.setItem("lf_token", res.token);
      }

      // Clear timers
      clearInterval(otpState.expiryTimer);
      clearInterval(otpState.cooldownTimer);

      showOtpNotice(t("otp.verified_success", "Code verified successfully! Redirecting to dashboard..."));

      setTimeout(() => {
        redirectByUserRole(user);
      }, 500);

    } catch (err) {
      showOtpError(err.message || t("otp.err_invalid", "Incorrect verification code. Please check and try again."));
      setVerifyingState(false);
      if (otpDigits[5]) {
        otpDigits[5].focus();
        otpDigits[5].select();
      }
    }
  };

  btnOtpVerify?.addEventListener("click", handleVerifyOtp);

  // Resend Button
  btnOtpResend?.addEventListener("click", () => {
    if (btnOtpResend.disabled) return;
    dispatchSendOtp();
  });

  // Switch Delivery Method (Email <-> SMS)
  btnOtpSwitchMethod?.addEventListener("click", () => {
    otpState.type = otpState.type === "email" ? "phone" : "email";
    updateOtpLabels();
    otpDigits.forEach((d) => (d.value = ""));
    if (otpDigits[0]) otpDigits[0].focus();
    dispatchSendOtp();
  });

  // Back Button / Change Contact Info
  btnOtpBack?.addEventListener("click", () => {
    hideOtpScreen();
  });

  // ── Login Form Submission ────────────────────────────────────────────────
  loginForm?.addEventListener("submit", async (e) => {
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

    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;

    try {
      let matchedUser = null;

      // Call backend API login
      if (window.LocalFixAPI) {
        try {
          const res = await window.LocalFixAPI.post("/auth/login", { email, password }, { auth: false });
          if (res.requireOtp) {
            matchedUser = res.user;
          } else if (res.token && res.user) {
            window.Storage.setCurrentUser(res.user);
            localStorage.setItem("lf_token", res.token);
            redirectByUserRole(res.user);
            return;
          }
        } catch (apiErr) {
          if (apiErr.message && !apiErr.message.includes("Cannot connect")) {
            showFieldError(emailEl, apiErr.message);
            return;
          }
        }
      }

      // Check local storage fallback for user info
      if (!matchedUser) {
        const users = window.Storage.getUsers();
        matchedUser = users.find((u) => u.email.toLowerCase() === email && u.password === password);
        if (!matchedUser) {
          showFieldError(emailEl, "Incorrect email or password. Please try again.");
          return;
        }
      }

      // Role mismatch checks
      if (currentRole === "worker" && matchedUser.role === "customer") {
        showFieldError(emailEl, "This email belongs to a Customer account. Please switch to 'Customer Account' above.");
        return;
      }
      if (currentRole === "customer" && matchedUser.role === "worker") {
        showFieldError(emailEl, "This email belongs to a Service Worker account. Please switch to 'Service Worker' above.");
        return;
      }

      // Transition to OTP verification screen
      showOtpScreen({
        purpose: "login",
        email: matchedUser.email,
        phone: matchedUser.phone,
        role: currentRole,
        user: matchedUser,
      });
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

    const email = emailEl.value.trim().toLowerCase();
    const phone = phoneEl.value.trim();

    const users = window.Storage.getUsers();
    if (users.find((u) => u.email.toLowerCase() === email)) {
      showFieldError(emailEl, "An account with this email already exists.");
      return;
    }

    const pendingUserData = {
      name:     nameEl.value.trim(),
      email,
      phone,
      password: passwordEl.value,
      role:     "customer",
      state:    stateEl?.value || "Punjab",
      location: locationEl?.value.trim() || "Model Town, Ludhiana",
    };

    showOtpScreen({
      purpose: "register",
      email,
      phone,
      role: "customer",
      userData: pendingUserData,
    });
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

    const email = emailEl.value.trim().toLowerCase();
    const phone = phoneEl.value.trim();

    const users = window.Storage.getUsers();
    if (users.find((u) => u.email.toLowerCase() === email)) {
      showFieldError(emailEl, "An account with this email already exists.");
      return;
    }

    const pendingUserData = {
      name:       nameEl.value.trim(),
      email,
      phone,
      password:   passwordEl.value,
      role:       "worker",
      category:   categoryEl?.value || "electrician",
      experience: expEl?.value || "1",
      state:      stateEl?.value || "Punjab",
      location:   areaEl?.value.trim() || "Model Town, Ludhiana",
      price:      priceEl?.value || "200",
      skills:     skillsEl?.value || "",
    };

    showOtpScreen({
      purpose: "register",
      email,
      phone,
      role: "worker",
      userData: pendingUserData,
    });
  });
});
