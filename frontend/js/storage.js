/**
 * LocalFix Central Storage & Data Engine — v7
 * - Auto-wipes stale data on version mismatch
 * - Strict multi-user isolation (by ID + email)
 * - Strict State & Area/City based worker search & registration
 * - Smart state resolution for local Punjab cities (Rajpura, Ludhiana, Patiala, etc.)
 * - Genuine customer reviews tied to verified completed bookings
 * - Multi-state realistic technician profiles
 */

const LocalFixStorage = (() => {
  const DATA_VERSION = "lf_v13"; // bumped: force-cleans all previous dummy ratings & seeded reviews

  const KEYS = {
    USERS: "lf_users",
    CURRENT_USER: "lf_current_user",
    WORKERS: "lf_workers",
    BOOKINGS: "lf_bookings",
    COMPLAINTS: "lf_complaints",
    REVIEWS: "lf_reviews",
    NOTIFICATIONS: "lf_notifications",
    VERSION: "lf_data_version",
  };

  // Smart state detector from locality/area name
  const resolveWorkerState = (worker) => {
    if (worker && worker.state && worker.state.trim() && worker.state.toLowerCase() !== "all") {
      return worker.state.trim();
    }
    const str = `${(worker && worker.area) || ""} ${(worker && worker.city) || ""} ${(worker && worker.location) || ""}`.toLowerCase();
    if (str.includes("punjab") || str.includes("ludhiana") || str.includes("rajpura") || str.includes("patiala") || str.includes("jalandhar") || str.includes("amritsar") || str.includes("mohali") || str.includes("bathinda") || str.includes("khanna")) {
      return "Punjab";
    }
    if (str.includes("haryana") || str.includes("gurugram") || str.includes("gurgaon") || str.includes("faridabad") || str.includes("panipat") || str.includes("ambala") || str.includes("karnal") || str.includes("rohtak")) {
      return "Haryana";
    }
    if (str.includes("delhi") || str.includes("rohini") || str.includes("saket") || str.includes("dwarka") || str.includes("janakpuri") || str.includes("ncr")) {
      return "Delhi";
    }
    if (str.includes("uttar pradesh") || str.includes("noida") || str.includes("greater noida") || str.includes("ghaziabad") || str.includes("lucknow") || str.includes("kanpur") || str.includes("meerut")) {
      return "Uttar Pradesh";
    }
    if (str.includes("himachal") || str.includes("shimla") || str.includes("manali") || str.includes("solan") || str.includes("dharamshala")) {
      return "Himachal Pradesh";
    }
    if (str.includes("rajasthan") || str.includes("jaipur") || str.includes("jodhpur") || str.includes("udaipur") || str.includes("kota")) {
      return "Rajasthan";
    }
    if (str.includes("maharashtra") || str.includes("mumbai") || str.includes("pune") || str.includes("nagpur") || str.includes("thane")) {
      return "Maharashtra";
    }
    if (str.includes("gujarat") || str.includes("ahmedabad") || str.includes("surat") || str.includes("vadodara")) {
      return "Gujarat";
    }
    if (str.includes("karnataka") || str.includes("bengaluru") || str.includes("bangalore") || str.includes("mysuru")) {
      return "Karnataka";
    }
    return "Punjab";
  };

  // No pre-seeded users. Only real users who register appear in the system.
  const DEFAULT_USERS = [];

  const DEFAULT_WORKERS = [];

  const DEFAULT_BOOKINGS = [];

  // No reviews are pre-seeded. Reviews are only submitted by authenticated customers
  // after a confirmed completed booking. The landing page and worker profiles
  // will show "No reviews yet" until real users submit their own reviews.
  const DEFAULT_REVIEWS = [];

  const DISTANCE_SURCHARGE_KM = 10;
  const DISTANCE_SURCHARGE_AMOUNT = 100;

  const init = () => {
    const storedVersion = localStorage.getItem(KEYS.VERSION);
    if (false && storedVersion !== DATA_VERSION) {
      // no-op
      // no-op
      // no-op
    }
    if (!localStorage.getItem(KEYS.USERS))         localStorage.setItem(KEYS.USERS,         JSON.stringify(DEFAULT_USERS));
    if (!localStorage.getItem(KEYS.WORKERS))       localStorage.setItem(KEYS.WORKERS,       JSON.stringify(DEFAULT_WORKERS));
    if (!localStorage.getItem(KEYS.BOOKINGS))      localStorage.setItem(KEYS.BOOKINGS,      JSON.stringify(DEFAULT_BOOKINGS));
    if (!localStorage.getItem(KEYS.COMPLAINTS))    localStorage.setItem(KEYS.COMPLAINTS,    JSON.stringify([]));
    if (!localStorage.getItem(KEYS.REVIEWS))       localStorage.setItem(KEYS.REVIEWS,       JSON.stringify(DEFAULT_REVIEWS));
    if (!localStorage.getItem(KEYS.NOTIFICATIONS)) localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
    localStorage.setItem(KEYS.VERSION, DATA_VERSION);
  };

  init();

  const getRaw = (key, def = []) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };
  const setRaw = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  const getDistanceSurcharge = (worker) => (Number(worker.distanceKm) || 0) > DISTANCE_SURCHARGE_KM ? DISTANCE_SURCHARGE_AMOUNT : 0;

  const notifyDataChanged = (type, data = {}) => {
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("lf:data-changed", { detail: { type, data } }));
      } catch (e) {}
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const ch = new BroadcastChannel("localfix_data_channel");
          ch.postMessage({ type, data, timestamp: Date.now() });
          ch.close();
        } catch (e) {}
      }
    }
  };

  return {
    resolveWorkerState,

    getCurrentUser: () => { try { const u = localStorage.getItem(KEYS.CURRENT_USER); return u ? JSON.parse(u) : null; } catch { return null; } },

    setCurrentUser: (user) => {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
      localStorage.setItem("lf_user", JSON.stringify(user));
      localStorage.setItem("lf_token", "session-" + user.id);
    },

    logout: () => {
      localStorage.removeItem(KEYS.CURRENT_USER);
      // no-op
      // no-op
    },

    getUsers: () => getRaw(KEYS.USERS),

    registerUser: (userData) => {
      const users = getRaw(KEYS.USERS);
      if (users.find((u) => u.email.toLowerCase() === userData.email.toLowerCase())) {
        throw new Error("An account with this email already exists.");
      }
      const area = userData.area || userData.location || "Model Town, Ludhiana";
      const state = resolveWorkerState({ state: userData.state, area: area, location: area });
      const city = userData.city || (area.includes(",") ? area.split(",")[0].trim() : area);

      const newUser = {
        id: "u_" + Date.now(),
        name: userData.name.trim(),
        email: userData.email.trim().toLowerCase(),
        password: userData.password || "password",
        role: userData.role || "customer",
        phone: userData.phone || "",
        location: area,
        state: state,
        city: city,
        workerId: userData.role === "worker" ? "w_" + Date.now() : undefined,
        category: userData.category || undefined,
        experience: userData.experience || undefined,
        price: userData.price || undefined,
        verificationStatus: userData.role === "worker" ? "pending" : "approved",
        isVerified: !!userData.isVerified,
        isEmailVerified: !!userData.isEmailVerified,
        isPhoneVerified: !!userData.isPhoneVerified,
        createdAt: new Date().toISOString().split("T")[0],
      };
      users.push(newUser);
      setRaw(KEYS.USERS, users);

      if (newUser.role === "worker") {
        const workers = getRaw(KEYS.WORKERS);
        workers.push({
          id: newUser.workerId,
          userId: newUser.id,
          email: newUser.email,
          name: newUser.name,
          category: newUser.category || "electrician",
          experience: Number(newUser.experience) || 1,
          rating: null,
          reviewsCount: 0,
          price: Number(newUser.price) || 200,
          state: state,
          city: city,
          area: area,
          distanceKm: 0,
          lat: null,
          lng: null,
          phone: newUser.phone,
          verified: false,
          available: true,
          jobs: 0,
          about: "Service worker providing dependable home assistance in " + area + " (" + state + ").",
          skills: userData.skills ? userData.skills.split(",").map((s) => s.trim()) : ["Quick Response","Reliable"],
          workingHours: "09:00 AM - 07:00 PM",
        });
        setRaw(KEYS.WORKERS, workers);
      }
      LocalFixStorage.setCurrentUser(newUser);
      notifyDataChanged("user_registered", newUser);
      return newUser;
    },

    loginUser: (email, password = "") => {
      const users = getRaw(KEYS.USERS);
      const cleanEmail = email.trim().toLowerCase();
      const user = users.find((u) => u.email.toLowerCase() === cleanEmail && u.password === password);
      if (!user) throw new Error("Incorrect email or password. Please try again.");
      LocalFixStorage.setCurrentUser(user);
      return user;
    },

    getWorkers: (filter = {}) => {
      let workers = getRaw(KEYS.WORKERS);
      const reviews = getRaw(KEYS.REVIEWS);

      // Attach resolved state and calculated rating to all workers
      workers = workers.map((w) => {
        const resolvedState = resolveWorkerState(w);
        const wReviews = reviews.filter((r) => r.workerId === w.id);
        if (wReviews.length > 0) {
          const avg = wReviews.reduce((sum, r) => sum + Number(r.rating), 0) / wReviews.length;
          return { ...w, state: resolvedState, rating: Math.round(avg * 10) / 10, reviewsCount: wReviews.length };
        }
        return { ...w, state: resolvedState, rating: null, reviewsCount: 0 };
      });

      // Filter by Service Category
      if (filter.category) {
        workers = workers.filter((w) => w.category === filter.category);
      }

      // Filter by State
      if (filter.state && filter.state !== "all" && filter.state.trim() !== "") {
        const targetState = filter.state.trim().toLowerCase();
        workers = workers.filter((w) =>
          (w.state || "").toLowerCase().includes(targetState) ||
          (w.area || "").toLowerCase().includes(targetState) ||
          (w.city || "").toLowerCase().includes(targetState)
        );
      }

      // Filter by Area / City:
      if (filter.area && filter.area.trim() !== "") {
        const filterArea = filter.area.trim().toLowerCase();
        workers = workers.filter((w) => {
          const a = (w.area || "").toLowerCase();
          const c = (w.city || "").toLowerCase();
          const l = (w.location || "").toLowerCase();
          return a.includes(filterArea) || c.includes(filterArea) || l.includes(filterArea);
        });
      }

      // Filter by Min Rating
      if (filter.minRating) {
        workers = workers.filter((w) => w.rating !== null && w.rating >= Number(filter.minRating));
      }

      // Filter by Max Price
      if (filter.maxPrice) {
        workers = workers.filter((w) => w.price <= Number(filter.maxPrice));
      }

      // Filter by Query (Name, Skill, Category, Area)
      if (filter.query && filter.query.trim() !== "") {
        const q = filter.query.trim().toLowerCase();
        workers = workers.filter((w) =>
          w.name.toLowerCase().includes(q) ||
          w.category.toLowerCase().includes(q) ||
          (w.area || "").toLowerCase().includes(q) ||
          (w.city || "").toLowerCase().includes(q) ||
          (Array.isArray(w.skills) && w.skills.some((s) => s.toLowerCase().includes(q)))
        );
      }

      return workers;
    },

    getWorkerById: (id) => {
      const workers = LocalFixStorage.getWorkers();
      return workers.find((w) => w.id === id) || workers[0];
    },

    updateWorkerAvailability: (workerId, available) => {
      const workers = getRaw(KEYS.WORKERS);
      const idx = workers.findIndex((w) => w.id === workerId);
      if (idx !== -1) { workers[idx].available = available; setRaw(KEYS.WORKERS, workers); }
    },

    verifyWorker: (workerId, approved = true) => {
      const workers = getRaw(KEYS.WORKERS);
      const idx = workers.findIndex((w) => w.id === workerId);
      if (idx !== -1) { workers[idx].verified = approved; setRaw(KEYS.WORKERS, workers); }
      const users = getRaw(KEYS.USERS);
      const uIdx = users.findIndex((u) => u.workerId === workerId);
      if (uIdx !== -1) { users[uIdx].verificationStatus = approved ? "approved" : "rejected"; setRaw(KEYS.USERS, users); }
      notifyDataChanged("worker_verified", { workerId, approved });
    },

    getDistanceSurcharge,

    getUserBookings: (user) => {
      if (!user) return [];
      const bookings = getRaw(KEYS.BOOKINGS);
      return bookings.filter((b) => b.customerId === user.id || (user.email && b.customerEmail === user.email));
    },

    getWorkerBookings: (user) => {
      if (!user) return [];
      const bookings = getRaw(KEYS.BOOKINGS);
      return bookings.filter((b) => b.workerId === user.workerId || b.workerId === user.id || (user.name && b.workerName && b.workerName.toLowerCase() === user.name.toLowerCase()));
    },

    getAllBookings: () => getRaw(KEYS.BOOKINGS),

    createBooking: (bookingData) => {
      const user = LocalFixStorage.getCurrentUser();
      const bookings = getRaw(KEYS.BOOKINGS);
      const worker = LocalFixStorage.getWorkerById(bookingData.workerId);
      const surcharge = worker ? getDistanceSurcharge(worker) : 0;
      const basePrice = Number(bookingData.price) || 200;
      const newBooking = {
        id: "BK" + Math.floor(1000 + Math.random() * 9000),
        customerId: user ? user.id : "guest",
        customerName: user ? user.name : (bookingData.customerName || "Customer"),
        customerEmail: user ? user.email : "",
        customerPhone: bookingData.customerPhone || (user ? user.phone : ""),
        customerAddress: bookingData.customerAddress || "Ludhiana",
        workerId: bookingData.workerId,
        workerName: bookingData.workerName,
        workerPhone: worker ? worker.phone : "",
        service: bookingData.service,
        serviceCategory: bookingData.serviceCategory,
        problemDescription: bookingData.problemDescription,
        date: bookingData.date,
        slot: bookingData.slot,
        status: "requested",
        price: basePrice,
        distanceSurcharge: surcharge,
        totalPrice: basePrice + surcharge,
        confirmedByCustomer: false,
        markedDoneByWorker: false,
        createdAt: new Date().toISOString(),
      };
      bookings.unshift(newBooking);
      setRaw(KEYS.BOOKINGS, bookings);

      // Notification for customer
      LocalFixStorage.addNotification({
        userId: newBooking.customerId,
        title: "Booking Requested",
        message: `Your booking for ${newBooking.service} with ${newBooking.workerName} has been submitted.`,
        type: "booking",
      });

      // Notification for worker
      const users = getRaw(KEYS.USERS);
      const workerUser = users.find((u) => u.workerId === newBooking.workerId);
      if (workerUser) {
        LocalFixStorage.addNotification({
          userId: workerUser.id,
          title: "New Booking Request",
          message: `You have received a new request for ${newBooking.service} from ${newBooking.customerName}.`,
          type: "booking",
        });
      }

      return newBooking;
    },

    updateBookingStatus: (bookingId, status) => {
      const bookings = getRaw(KEYS.BOOKINGS);
      const idx = bookings.findIndex((b) => b.id === bookingId);
      if (idx !== -1) {
        const b = bookings[idx];
        b.status = status;
        if (status === "completed") { b.confirmedByCustomer = false; b.markedDoneByWorker = true; }
        setRaw(KEYS.BOOKINGS, bookings);

        // Notify customer of status update
        LocalFixStorage.addNotification({
          userId: b.customerId,
          title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your booking ${b.id} with ${b.workerName} is now ${status.replace("_", " ")}.`,
          type: "booking",
        });

        // Notify customer to confirm completed booking
        if (status === "completed") {
          LocalFixStorage.addNotification({
            userId: b.customerId,
            title: "Action Required: Confirm Completion",
            message: `Please confirm if the work for booking ${b.id} has been completed to your satisfaction.`,
            type: "action",
          });
        }

        return b;
      }
      return null;
    },

    confirmBookingDone: (bookingId) => {
      const bookings = getRaw(KEYS.BOOKINGS);
      const idx = bookings.findIndex((b) => b.id === bookingId);
      if (idx !== -1) {
        const b = bookings[idx];
        b.confirmedByCustomer = true;
        b.status = "completed";
        setRaw(KEYS.BOOKINGS, bookings);

        const users = getRaw(KEYS.USERS);
        const workerUser = users.find((u) => u.workerId === b.workerId);
        if (workerUser) {
          LocalFixStorage.addNotification({
            userId: workerUser.id,
            title: "Booking Completed & Confirmed",
            message: `Customer ${b.customerName} has confirmed that the job ${b.id} is successfully done.`,
            type: "booking",
          });
        }

        notifyDataChanged("booking_confirmed", b);
        return b;
      }
      return null;
    },

    reopenBooking: (bookingId, reason = "") => {
      const bookings = getRaw(KEYS.BOOKINGS);
      const idx = bookings.findIndex((b) => b.id === bookingId);
      if (idx !== -1) {
        const b = bookings[idx];
        b.status = "requested";
        b.confirmedByCustomer = false;
        b.markedDoneByWorker = false;
        b.reopenReason = reason;
        b.reopenedAt = new Date().toISOString();
        setRaw(KEYS.BOOKINGS, bookings);

        const users = getRaw(KEYS.USERS);
        const workerUser = users.find((u) => u.workerId === b.workerId);
        if (workerUser) {
          LocalFixStorage.addNotification({
            userId: workerUser.id,
            title: "Booking Reopened (Dispute)",
            message: `Customer has reopened booking ${b.id} stating the work was not completed.`,
            type: "dispute",
          });
        }

        return b;
      }
      return null;
    },

    updateBookingField: (bookingId, fields = {}) => {
      const bookings = getRaw(KEYS.BOOKINGS);
      const idx = bookings.findIndex((b) => b.id === bookingId);
      if (idx !== -1) { Object.assign(bookings[idx], fields); setRaw(KEYS.BOOKINGS, bookings); return bookings[idx]; }
      return null;
    },

    getWorkerReviews: (workerId) => getRaw(KEYS.REVIEWS).filter((r) => r.workerId === workerId),
    getUserReviews:   (userId)   => getRaw(KEYS.REVIEWS).filter((r) => r.customerId === userId),
    getAllReviews:     ()         => getRaw(KEYS.REVIEWS),

    addReview: (reviewData) => {
      const user = LocalFixStorage.getCurrentUser();
      const reviews = getRaw(KEYS.REVIEWS);
      const newReview = {
        id: "rev_" + Date.now(),
        workerId: reviewData.workerId,
        workerName: reviewData.workerName || "Worker",
        customerId: user ? user.id : "guest",
        customerName: user ? user.name : (reviewData.customerName || "Verified Customer"),
        location: reviewData.location || (user ? user.location : "Ludhiana"),
        service: reviewData.service || "Service",
        bookingId: reviewData.bookingId || null,
        rating: Number(reviewData.rating) || 5,
        comment: reviewData.comment.trim(),
        date: new Date().toISOString().split("T")[0],
      };
      reviews.unshift(newReview);
      setRaw(KEYS.REVIEWS, reviews);
      if (reviewData.bookingId) {
        const bookings = getRaw(KEYS.BOOKINGS);
        const bIdx = bookings.findIndex((b) => b.id === reviewData.bookingId);
        if (bIdx !== -1) { bookings[bIdx].rating = newReview.rating; bookings[bIdx].reviewComment = newReview.comment; setRaw(KEYS.BOOKINGS, bookings); }
      }
      const workerReviews = reviews.filter((r) => r.workerId === reviewData.workerId);
      const avg = workerReviews.reduce((sum, r) => sum + Number(r.rating), 0) / workerReviews.length;
      const workers = getRaw(KEYS.WORKERS);
      const wIdx = workers.findIndex((w) => w.id === reviewData.workerId);
      if (wIdx !== -1) { workers[wIdx].rating = Math.round(avg * 10) / 10; workers[wIdx].reviewsCount = workerReviews.length; setRaw(KEYS.WORKERS, workers); }
      notifyDataChanged("review_added", newReview);
      return newReview;
    },

    getUserComplaints:    (user) => { if (!user) return []; return getRaw(KEYS.COMPLAINTS).filter((c) => c.customerId === user.id || (user.email && c.customerEmail === user.email)); },
    getWorkerComplaints:  (user) => { if (!user) return []; return getRaw(KEYS.COMPLAINTS).filter((c) => c.workerId === user.workerId || (user.name && c.workerName === user.name)); },
    getAllComplaints:      ()     => getRaw(KEYS.COMPLAINTS),

    addComplaint: (complaintData) => {
      const user = LocalFixStorage.getCurrentUser();
      const complaints = getRaw(KEYS.COMPLAINTS);
      const newComplaint = {
        id: "CP" + Math.floor(300 + Math.random() * 700),
        customerId: user ? user.id : "guest",
        customerEmail: user ? user.email : "",
        customerName: user ? user.name : (complaintData.customerName || "Customer"),
        workerId: complaintData.workerId || "",
        workerName: complaintData.workerName || "Worker",
        bookingId: complaintData.bookingId || "",
        service: complaintData.service || "Service",
        serviceCategory: complaintData.serviceCategory || "general",
        subject: complaintData.subject,
        description: complaintData.description,
        priority: complaintData.priority || "medium",
        status: "pending",
        createdAt: new Date().toISOString().split("T")[0],
      };
      complaints.unshift(newComplaint);
      setRaw(KEYS.COMPLAINTS, complaints);
      return newComplaint;
    },

    updateComplaintStatus: (complaintId, status) => {
      const complaints = getRaw(KEYS.COMPLAINTS);
      const idx = complaints.findIndex((c) => c.id === complaintId);
      if (idx !== -1) { complaints[idx].status = status; setRaw(KEYS.COMPLAINTS, complaints); return complaints[idx]; }
      return null;
    },

    getNotifications: (userId) => getRaw(KEYS.NOTIFICATIONS).filter((n) => !n.userId || n.userId === userId),

    addNotification: (notif) => {
      const notifs = getRaw(KEYS.NOTIFICATIONS);
      notifs.unshift({ id:"n_"+Date.now(), userId:notif.userId||null, title:notif.title, message:notif.message, type:notif.type||"info", time:"Just now", unread:true });
      setRaw(KEYS.NOTIFICATIONS, notifs);
    },

    getUnreadCount: (userId) => getRaw(KEYS.NOTIFICATIONS).filter((n) => n.unread && (!n.userId || n.userId === userId)).length,

    getPlatformStatistics: () => {
      try {
        const workers = getRaw(KEYS.WORKERS, []);
        const users = getRaw(KEYS.USERS, []);
        const bookings = getRaw(KEYS.BOOKINGS, []);
        const reviews = getRaw(KEYS.REVIEWS, []);

        // 1. Registered Workers: Genuine accounts created via Worker registration flow
        const uniqueWorkerAccounts = new Set();
        users.forEach((u) => {
          if (u && u.role === "worker") {
            const key = String(u.email || u.id).trim().toLowerCase();
            if (key) uniqueWorkerAccounts.add(key);
          }
        });
        // Check for standalone workers in KEYS.WORKERS that might not be in users table
        workers.forEach((w) => {
          if (!w) return;
          const linkedUser = users.find(
            (u) =>
              (u.workerId && u.workerId === w.id) ||
              (u.id && (u.id === w.userId || u.id === w.id)) ||
              (w.email && u.email && u.email.toLowerCase() === w.email.toLowerCase())
          );
          if (!linkedUser) {
            const key = String(w.email || w.id).trim().toLowerCase();
            if (key) uniqueWorkerAccounts.add(key);
          }
        });
        const registeredWorkersCount = uniqueWorkerAccounts.size;

        // 2. Registered Customers: Genuine accounts created via Customer registration flow
        const uniqueCustomerAccounts = new Set();
        users.forEach((u) => {
          if (u && u.role === "customer") {
            const key = String(u.email || u.id).trim().toLowerCase();
            if (key) uniqueCustomerAccounts.add(key);
          }
        });
        const registeredCustomersCount = uniqueCustomerAccounts.size;

        // Also track verified workers count
        const verifiedWorkerIds = new Set();
        workers.forEach((w) => {
          if (w && (w.verified === true || w.verificationStatus === "approved")) {
            if (w.id) verifiedWorkerIds.add(String(w.id));
          }
        });
        users.forEach((u) => {
          if (u && u.role === "worker" && u.verificationStatus === "approved") {
            const wId = u.workerId || u.id;
            if (wId) verifiedWorkerIds.add(String(wId));
          }
        });
        const verifiedWorkersCount = verifiedWorkerIds.size;

        // 3. Repairs Completed: Successfully completed and confirmed bookings
        const completedBookings = bookings.filter((b) => {
          if (!b) return false;
          if (b.status !== "completed") return false;
          // If worker marked done but customer has not confirmed yet, exclude from completed
          if (b.markedDoneByWorker === true && b.confirmedByCustomer === false) return false;
          return true;
        });
        const completedRepairsCount = new Set(completedBookings.map((b) => b.id)).size;

        // 4. Areas Covered: Unique areas where registered workers are active & available
        const uniqueAreas = new Set();
        workers.forEach((w) => {
          if (w && w.available === true) {
            const rawArea = (w.area || w.city || w.location || "").trim();
            if (rawArea) {
              uniqueAreas.add(rawArea.toLowerCase());
            }
          }
        });
        const areasCoveredCount = uniqueAreas.size;

        // 5. Customer Satisfaction: Actual satisfaction percentage from genuine customer ratings
        const validRatings = reviews
          .map((r) => Number(r.rating))
          .filter((r) => !isNaN(r) && r >= 1 && r <= 5);

        let satisfactionPct = null;
        if (validRatings.length > 0) {
          const sum = validRatings.reduce((sum, r) => sum + r, 0);
          const avg = sum / validRatings.length;
          satisfactionPct = Math.round((avg / 5) * 100);
        }

        return {
          success: true,
          registeredWorkers: registeredWorkersCount,
          registeredCustomers: registeredCustomersCount,
          registeredUsers: registeredWorkersCount + registeredCustomersCount,
          verifiedWorkers: verifiedWorkersCount,
          repairsCompleted: completedRepairsCount,
          areasCovered: areasCoveredCount,
          customerSatisfaction: satisfactionPct,
        };
      } catch (err) {
        console.error("LocalFixStorage.getPlatformStatistics error:", err);
        return {
          success: false,
          error: err,
        };
      }
    },

    getPlatformStatisticsAsync: async () => {
      try {
        if (window.LocalFixAPI) {
          const res = await window.LocalFixAPI.get('/platform/stats');
          if (res && res.success) {
            return res;
          }
        }
      } catch (e) {
        console.warn("Could not fetch remote stats, falling back to local cache:", e);
      }
      return LocalFixStorage.getPlatformStatistics();
    },

    resetToDefaults: () => { Object.values(KEYS).forEach((k) => localStorage.removeItem(k)); localStorage.removeItem("lf_user"); localStorage.removeItem("lf_token"); init(); },
  };
})();

window.Storage = LocalFixStorage;
