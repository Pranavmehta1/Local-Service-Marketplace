/**
 * LocalFix Central Storage & Data Engine — v4
 * - Auto-wipes stale data on version mismatch
 * - Strict multi-user isolation (by ID + email)
 * - New workers start with no ratings (null/0)
 * - Clean seed: no fake bookings, reviews, or complaints
 */

const LocalFixStorage = (() => {
  const DATA_VERSION = "lf_v5";

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

  const DEFAULT_WORKERS = [];

  const DEFAULT_USERS = [
    { id:"u_admin",    name:"LocalFix Admin", email:"admin@localfix.com",  password:"admin",    role:"admin",    phone:"+91 99999 00000", location:"Civil Lines, Ludhiana",    createdAt: new Date().toISOString().split("T")[0] },
    { id:"u_cust_1",   name:"Neha Gupta",     email:"neha@example.com",    password:"password", role:"customer", phone:"+91 98765 00001", location:"Model Town, Ludhiana",     createdAt: new Date().toISOString().split("T")[0] },
    { id:"u_worker_1", name:"Rahul Sharma",   email:"rahul@localfix.com",  password:"password", role:"worker",   phone:"+91 98765 43210", location:"Model Town, Ludhiana",    workerId:"w1", category:"electrician", verificationStatus:"approved", createdAt: new Date().toISOString().split("T")[0] },
  ];

  const DISTANCE_SURCHARGE_KM = 10;
  const DISTANCE_SURCHARGE_AMOUNT = 100;

  const init = () => {
    const storedVersion = localStorage.getItem(KEYS.VERSION);
    if (storedVersion !== DATA_VERSION) {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem("lf_user");
      localStorage.removeItem("lf_token");
    }
    if (!localStorage.getItem(KEYS.USERS))         localStorage.setItem(KEYS.USERS,         JSON.stringify(DEFAULT_USERS));
    if (!localStorage.getItem(KEYS.WORKERS))       localStorage.setItem(KEYS.WORKERS,       JSON.stringify(DEFAULT_WORKERS));
    if (!localStorage.getItem(KEYS.BOOKINGS))      localStorage.setItem(KEYS.BOOKINGS,      JSON.stringify([]));
    if (!localStorage.getItem(KEYS.COMPLAINTS))    localStorage.setItem(KEYS.COMPLAINTS,    JSON.stringify([]));
    if (!localStorage.getItem(KEYS.REVIEWS))       localStorage.setItem(KEYS.REVIEWS,       JSON.stringify([]));
    if (!localStorage.getItem(KEYS.NOTIFICATIONS)) localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
    localStorage.setItem(KEYS.VERSION, DATA_VERSION);
  };

  init();

  const getRaw = (key, def = []) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };
  const setRaw = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  const getDistanceSurcharge = (worker) => (Number(worker.distanceKm) || 0) > DISTANCE_SURCHARGE_KM ? DISTANCE_SURCHARGE_AMOUNT : 0;

  return {
    getCurrentUser: () => { try { const u = localStorage.getItem(KEYS.CURRENT_USER); return u ? JSON.parse(u) : null; } catch { return null; } },

    setCurrentUser: (user) => {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
      localStorage.setItem("lf_user", JSON.stringify(user));
      localStorage.setItem("lf_token", "session-" + user.id);
    },

    logout: () => {
      localStorage.removeItem(KEYS.CURRENT_USER);
      localStorage.removeItem("lf_user");
      localStorage.removeItem("lf_token");
    },

    getUsers: () => getRaw(KEYS.USERS),

    registerUser: (userData) => {
      const users = getRaw(KEYS.USERS);
      if (users.find((u) => u.email.toLowerCase() === userData.email.toLowerCase())) {
        throw new Error("An account with this email already exists.");
      }
      const newUser = {
        id: "u_" + Date.now(),
        name: userData.name.trim(),
        email: userData.email.trim().toLowerCase(),
        password: userData.password || "password",
        role: userData.role || "customer",
        phone: userData.phone || "",
        location: userData.location || "Ludhiana",
        workerId: userData.role === "worker" ? "w_" + Date.now() : undefined,
        category: userData.category || undefined,
        experience: userData.experience || undefined,
        price: userData.price || undefined,
        verificationStatus: userData.role === "worker" ? "pending" : "approved",
        createdAt: new Date().toISOString().split("T")[0],
      };
      users.push(newUser);
      setRaw(KEYS.USERS, users);

      if (newUser.role === "worker") {
        const workers = getRaw(KEYS.WORKERS);
        workers.push({
          id: newUser.workerId, name: newUser.name,
          category: newUser.category || "electrician",
          experience: Number(newUser.experience) || 1,
          rating: null, reviewsCount: 0,
          price: Number(newUser.price) || 200,
          area: newUser.location, distanceKm: 0, lat: null, lng: null,
          phone: newUser.phone, verified: false, available: true, jobs: 0,
          about: "Service worker providing dependable home assistance in " + newUser.location + ".",
          skills: userData.skills ? userData.skills.split(",").map((s) => s.trim()) : ["Quick Response","Reliable"],
          workingHours: "09:00 AM - 07:00 PM",
        });
        setRaw(KEYS.WORKERS, workers);
      }
      LocalFixStorage.setCurrentUser(newUser);
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
      workers = workers.map((w) => {
        const wReviews = reviews.filter((r) => r.workerId === w.id);
        if (wReviews.length > 0) {
          const avg = wReviews.reduce((sum, r) => sum + Number(r.rating), 0) / wReviews.length;
          return { ...w, rating: Math.round(avg * 10) / 10, reviewsCount: wReviews.length };
        }
        return { ...w, rating: null, reviewsCount: 0 };
      });
      if (filter.category) workers = workers.filter((w) => w.category === filter.category);
      if (filter.minRating) workers = workers.filter((w) => w.rating !== null && w.rating >= Number(filter.minRating));
      if (filter.maxPrice)  workers = workers.filter((w) => w.price <= Number(filter.maxPrice));
      if (filter.query) {
        const q = filter.query.toLowerCase();
        workers = workers.filter((w) => w.name.toLowerCase().includes(q) || w.category.toLowerCase().includes(q) || w.area.toLowerCase().includes(q));
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
      return newBooking;
    },

    updateBookingStatus: (bookingId, status) => {
      const bookings = getRaw(KEYS.BOOKINGS);
      const idx = bookings.findIndex((b) => b.id === bookingId);
      if (idx !== -1) {
        bookings[idx].status = status;
        if (status === "completed") { bookings[idx].confirmedByCustomer = false; bookings[idx].markedDoneByWorker = true; }
        setRaw(KEYS.BOOKINGS, bookings);
        return bookings[idx];
      }
      return null;
    },

    confirmBookingDone: (bookingId) => {
      const bookings = getRaw(KEYS.BOOKINGS);
      const idx = bookings.findIndex((b) => b.id === bookingId);
      if (idx !== -1) { bookings[idx].confirmedByCustomer = true; bookings[idx].status = "completed"; setRaw(KEYS.BOOKINGS, bookings); return bookings[idx]; }
      return null;
    },

    reopenBooking: (bookingId, reason = "") => {
      const bookings = getRaw(KEYS.BOOKINGS);
      const idx = bookings.findIndex((b) => b.id === bookingId);
      if (idx !== -1) {
        bookings[idx].status = "requested";
        bookings[idx].confirmedByCustomer = false;
        bookings[idx].markedDoneByWorker = false;
        bookings[idx].reopenReason = reason;
        bookings[idx].reopenedAt = new Date().toISOString();
        setRaw(KEYS.BOOKINGS, bookings);
        return bookings[idx];
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
        customerId: user ? user.id : "guest",
        customerName: user ? user.name : (reviewData.customerName || "Verified Customer"),
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

    resetToDefaults: () => { Object.values(KEYS).forEach((k) => localStorage.removeItem(k)); localStorage.removeItem("lf_user"); localStorage.removeItem("lf_token"); init(); },
  };
})();

window.Storage = LocalFixStorage;


