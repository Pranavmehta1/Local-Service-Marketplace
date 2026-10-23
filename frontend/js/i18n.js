/**
 * LocalFix Central Internationalization (i18n) Engine
 * Full bilingual support: English & Hindi (हिंदी)
 * - Persistent language storage in localStorage ('lf_lang')
 * - First-visit interactive language selection modal
 * - Dynamic language switcher in navbar / topbar
 * - Real-time in-place DOM translation without page reload
 * - Reactive event emission ('lf:lang-changed')
 */

(function (window, document) {
  "use strict";

  const STORAGE_KEY = "lf_lang";
  const SELECTED_FLAG_KEY = "lf_lang_selected";

  const TRANSLATIONS = {
    en: {
      // Brand
      "brand.name": "LocalFix",
      "brand.tagline": "Verified Services",

      // Navigation
      "nav.services": "Services",
      "nav.how_it_works": "How It Works",
      "nav.reviews": "Reviews",
      "nav.contact": "Contact",
      "nav.signin": "Sign In",
      "nav.get_started": "Get Started",
      "nav.back": "Back",
      "nav.back_to_home": "Back to Home",
      "nav.back_to_workers": "Back to Workers",
      "nav.my_account": "My Account",
      "nav.my_bookings": "My Bookings",
      "nav.dashboard": "Dashboard",
      "nav.logout": "Logout",
      "nav.theme_toggle": "Toggle Light / Dark Mode",
      "nav.home_page": "Home Page",

      // Language Modal & Switcher
      "lang.choose_title": "Choose Your Preferred Language",
      "lang.choose_subtitle": "अपनी पसंदीदा भाषा चुनें · Select your language to continue",
      "lang.hi_title": "हिंदी (Hindi)",
      "lang.hi_sub": "घरेलू मरम्मत और सेवाओं के लिए हिंदी चुनें",
      "lang.en_title": "English",
      "lang.en_sub": "Explore trusted local home repair services in English",
      "lang.continue": "Continue",
      "lang.change_language": "Change Language",
      "lang.selected": "Selected",

      // Hero Section
      "hero.eyebrow": "Verified Local Technicians & On-Demand Home Services",
      "hero.title_p1": "Trusted home repairs,",
      "hero.title_accent": "right at your door.",
      "hero.sub": "Book background-checked electricians, plumbers, AC technicians, and cleaners with transparent upfront pricing and genuine verified reviews.",
      "hero.trust_id": "ID Verified",
      "hero.trust_reviews": "Real Reviews",
      "hero.trust_safe": "Safe & Insured",
      "hero.trust_ontime": "On-Time",
      "hero.all_services": "All Services",
      "hero.search_placeholder": "Area e.g. Model Town",
      "hero.find_workers": "Find Workers",
      "hero.arrival_badge": "Usually arrives within 30-45 minutes at your location",

      // Services
      "service.core_title": "Our Core Services",
      "service.core_sub": "Every technician is background checked, identity verified, and skill tested.",
      "service.electrician": "Electrician",
      "service.electrician_desc": "Switchboards, wiring, fan installations & MCB repairs",
      "service.electrician_sub": "Wiring · Fans · MCB",
      "service.plumber": "Plumber",
      "service.plumber_desc": "Leakages, taps, pipelines & water tank fixes",
      "service.plumber_sub": "Pipes · Taps · Tanks",
      "service.ac_repair": "AC Repair & Service",
      "service.ac_repair_desc": "Deep jet-pump cleaning, gas refilling & cooling repairs",
      "service.ac_repair_sub": "Jet Pump · Gas · PCB",
      "service.ro_repair": "RO / Water Purifier",
      "service.ro_repair_desc": "Filter change, membrane, TDS test, booster pump",
      "service.carpenter": "Carpenter",
      "service.carpenter_desc": "Furniture repair, locks, doors, hinges & modular setup",
      "service.cleaning": "Home Cleaning",
      "service.cleaning_desc": "Deep home, bathroom, kitchen cleaning & sanitization",
      "service.appliance_repair": "Appliance Repair",
      "service.appliance_repair_desc": "Washing machine, fridge, microwave, geyser",
      "service.browse_all": "Browse All Services",
      "service.browse_all_desc": "See all workers by category, rating & price",
      "service.available_now": "Available Now",
      "service.all_services_tag": "All Services",

      // How It Works
      "hiw.eyebrow": "Simple Process",
      "hiw.title": "From problem to fixed in 4 easy steps",
      "hiw.step1_title": "Pick a Service",
      "hiw.step1_desc": "Choose from electrician, plumber, AC, cleaning, and more.",
      "hiw.step2_title": "Compare Workers",
      "hiw.step2_desc": "View real ratings, prices, experience, and verified reviews side by side.",
      "hiw.step3_title": "Book a Slot",
      "hiw.step3_desc": "Select a date and time. Worker arrives with tools, on schedule.",
      "hiw.step4_title": "Confirm & Rate",
      "hiw.step4_desc": "Pay the worker directly. Confirm completion and leave a star review.",

      // Statistics Section
      "stats.workers": "Registered Workers",
      "stats.customers": "Registered Customers",
      "stats.repairs": "Repairs Completed",
      "stats.areas": "Areas Covered",
      "stats.satisfaction": "Customer Satisfaction",
      "stats.no_workers": "No registered workers yet",
      "stats.no_customers": "No registered customers yet",
      "stats.no_repairs": "No completed repairs yet",
      "stats.areas_coming_soon": "Areas coming soon",
      "stats.not_rated_yet": "Not rated yet",

      // Reviews / Testimonials
      "reviews.eyebrow": "Real Verified Reviews",
      "reviews.title": "Homeowners love LocalFix",
      "reviews.sub": "Actual verified feedback from customers following completed and confirmed doorstep repairs.",
      "reviews.verified_job": "Verified Job",
      "reviews.no_reviews": "No reviews recorded yet.",

      // Footer
      "footer.tagline": "Connecting homeowners with verified, background-checked service professionals across Punjab and North India with transparent pricing.",
      "footer.quick_links": "Quick Links",
      "footer.services_heading": "Services",
      "footer.for_workers": "For Workers",
      "footer.join_worker": "Join as a Service Worker",
      "footer.worker_login": "Worker Login",
      "footer.admin_portal": "Admin Portal",
      "footer.rights": "All rights reserved. Built for reliable doorstep repairs.",
      "footer.helpline": "24/7 Helpline",
      "footer.official_email": "Official Support Email: fixxlocal@gmail.com",
      "footer.need_help": "Need immediate assistance with a booking?",

      // Auth Page
      "auth.side_title": "Verified home repairs, right at your doorstep.",
      "auth.side_sub": "Connect with background-checked electricians, plumbers, AC technicians, and cleaners in your city.",
      "auth.net_title": "Verified Network",
      "auth.net_desc": "Every technician is verified with identity verification and verified skills before receiving jobs.",
      "auth.feat_1": "Multi-role secure sessions",
      "auth.feat_2": "Double-tick WhatsApp style job confirmation",
      "auth.feat_3": "Direct upfront pricing with 0 commission",
      "auth.role_cust_title": "I am a Customer",
      "auth.role_cust_desc": "Book repair services for my home",
      "auth.role_worker_title": "I am a Worker",
      "auth.role_worker_desc": "Provide skilled repair services & earn",
      "auth.tab_signin": "Sign In",
      "auth.tab_register": "Register / Sign Up",
      "auth.login_cust_title": "👤 Customer Sign In",
      "auth.login_cust_desc": "Access your home service bookings, track technician arrival, and view bills.",
      "auth.login_worker_title": "🛠️ Service Worker Sign In",
      "auth.login_worker_desc": "Log in to manage customer bookings, accept repair jobs, and check earnings.",
      "auth.reg_cust_title": "👤 Create Customer Account",
      "auth.reg_cust_desc": "Register to book verified electricians, plumbers, and technicians.",
      "auth.reg_worker_title": "🛠️ Join as Service Worker",
      "auth.reg_worker_desc": "Apply to join LocalFix's verified worker network across your state and area.",
      "auth.btn_signin_cust": "Sign In as Customer",
      "auth.btn_signin_worker": "Sign In as Service Worker",
      "auth.btn_create_cust": "Create Customer Account",
      "auth.btn_register_worker": "Register as Worker",
      "auth.lbl_fullname": "Full Name",
      "auth.lbl_email": "Email Address",
      "auth.lbl_phone": "Phone Number",
      "auth.lbl_password": "Password",
      "auth.lbl_state": "Select State",
      "auth.lbl_city_area": "City & Area",
      "auth.lbl_service_trade": "Service Category",
      "auth.lbl_experience": "Years of Experience",
      "auth.lbl_price": "Standard Visiting Fee (₹)",
      "auth.lbl_skills": "Skills (comma separated)",
      "auth.ph_name": "e.g. Ramesh Kumar",
      "auth.ph_email": "name@example.com",
      "auth.ph_phone": "10-digit mobile number",
      "auth.ph_password": "At least 6 characters",
      "auth.ph_area": "e.g. Model Town, Ludhiana",
      "auth.ph_price": "e.g. 250",
      "auth.ph_skills": "e.g. Wiring, MCB, Fan Repair",
      "auth.err_req_email": "Please enter your email address.",
      "auth.err_req_password": "Please enter your password.",
      "auth.err_req_name": "Full name is required.",
      "auth.err_req_phone": "Phone number is required.",
      "auth.err_req_area": "Please enter your city and service area.",
      "auth.err_req_price": "Please enter your visit charge (₹).",
      "auth.err_pwd_len": "Password must be at least 6 characters.",
      "auth.err_cust_switched": "This email belongs to a Customer account. Please switch to 'Customer Account' above.",
      "auth.err_worker_switched": "This email belongs to a Service Worker account. Please switch to 'Service Worker' above.",
      "auth.no_account": "Don't have an account?",
      "auth.create_one": "Create one now",
      "auth.already_account": "Already registered?",
      "auth.signin_here": "Sign in here",

      // OTP Verification
      "otp.title": "Two-Step Verification",
      "otp.subtitle": "Enter the 6-digit code sent to",
      "otp.sent_to_email": "We sent a 6-digit verification code to your email",
      "otp.sent_to_phone": "We sent a 6-digit SMS verification code to your phone",
      "otp.code_expires": "Code expires in",
      "otp.resend_in": "Resend in",
      "otp.resend_code": "Resend Code",
      "otp.resending": "Sending code...",
      "otp.verify_btn": "Verify & Continue",
      "otp.verifying": "Verifying code...",
      "otp.switch_to_phone": "Send code via SMS to phone instead",
      "otp.switch_to_email": "Send code to email instead",
      "otp.change_target": "Change email / phone",
      "otp.back_to_login": "Back to Sign In",
      "otp.err_incomplete": "Please enter all 6 digits of your verification code.",
      "otp.err_invalid": "Incorrect verification code. Please check and try again.",
      "otp.err_expired": "This verification code has expired. Please request a new code.",
      "otp.err_too_many": "Too many incorrect attempts. Please request a new code.",
      "otp.security_note": "Never share your LocalFix OTP with anyone, including technicians or support.",

      // Worker Search & Cards
      "search.title": "Verified Service Workers Near You",
      "search.subtitle": "Showing verified electricians, plumbers, and technicians available for instant home service.",
      "search.grid_view": "Grid View",
      "search.map_view": "Map View",
      "search.filter_workers": "Filter Workers",
      "search.reset": "Reset",
      "search.search_keywords": "Search Keywords",
      "search.ph_keywords": "Name, skill, keyword...",
      "search.ph_city_area": "e.g. Ludhiana, Model Town, Rohini...",
      "search.all_states": "All States",
      "search.any_rating": "Any Star Rating",
      "search.filter_service": "Service Category",
      "search.filter_state": "State",
      "search.filter_area": "Area / Locality",
      "search.filter_rating": "Minimum Rating",
      "search.filter_max_price": "Max Visit Fee",
      "search.filter_sort": "Sort By",
      "search.sort_recommended": "Recommended",
      "search.sort_price_asc": "Price: Low to High",
      "search.sort_rating": "Highest Rated",
      "search.no_workers_title": "No verified workers found",
      "search.reset_filters": "Reset All Filters",
      "search.view_punjab": "View Punjab Workers",
      "search.map_hint": "Click on any price marker pin on the map to view the worker card and book immediately.",

      // Worker Badges & Card
      "worker.verified": "Verified",
      "worker.available": "Available",
      "worker.busy": "Busy",
      "worker.yrs_exp": "yrs exp",
      "worker.visiting_fee": "Visiting Fee",
      "worker.per_visit": "/visit",
      "worker.book_now": "Book Now",
      "worker.book_worker": "Book This Worker",
      "worker.view_profile": "View Profile",
      "worker.travel": "travel",
      "worker.travel_charge_applies": "+₹100 travel charge applies",
      "worker.tick_worker": "Worker",
      "worker.tick_customer": "Customer",
      "worker.tick_verified": "Verified",
      "worker.about_heading": "About the Professional",
      "worker.skills_heading": "Skills & Expertise",
      "worker.details_heading": "Worker Details",
      "worker.service_area": "Service Area",
      "worker.working_hours": "Working Hours",
      "worker.phone": "Phone",
      "worker.write_review": "Write a Review & Rate",
      "worker.report_issue": "Report an Issue",
      "worker.rate_worker": "Rate Worker",
      "worker.reviews_heading": "Customer Ratings & Breakdown",
      "worker.verified_reviews_title": "Verified Customer Reviews",
      "worker.no_reviews_yet": "No reviews written yet.",
      "worker.back_to_workers": "Back to Workers",
      "worker.verified_worker": "Verified Service Worker",
      "worker.verif_pending": "Verification Pending",
      "worker.rate_and_review": "Rate & Review Worker",
      "worker.select_star_rating": "Select Your Star Rating",
      "worker.your_review_exp": "Your Review & Experience",
      "worker.ph_review": "Describe the service quality, punctuality, and work done...",
      "worker.submit_review": "Submit Review",
      "worker.report_subject": "Subject / Reason",
      "worker.priority": "Priority",
      "worker.description": "Description",
      "worker.submit_complaint": "Submit Complaint",
      "worker.coverage_map": "Service Coverage Map",

      // Booking Wizard
      "booking.title": "Book a Home Service",
      "booking.subtitle": "Choose your service details and schedule a verified worker.",
      "booking.step_service": "Service",
      "booking.step_problem": "Problem",
      "booking.step_date": "Date",
      "booking.step_time": "Time",
      "booking.step_address": "Address",
      "booking.step_review": "Review",
      "booking.step_done": "Done",
      "booking.select_service": "Select Required Service",
      "booking.describe_problem": "Describe the Issue",
      "booking.ph_problem": "e.g. Switchboard sparking, fan not spinning...",
      "booking.select_date": "Select Date",
      "booking.select_slot": "Select Time Slot",
      "booking.enter_address": "Service Address",
      "booking.ph_address": "House / Flat No, Street, Landmark, Area",
      "booking.locate_gps": "Locate with GPS",
      "booking.summary_title": "Booking Summary",
      "booking.base_charge": "Base Charge",
      "booking.travel_charge": "Travel Charge (>10 km)",
      "booking.total_payable": "Total Payable",
      "booking.pay_note": "Pay directly to the worker in Cash or via UPI upon completion.",
      "booking.confirm_and_book": "Confirm & Book Now",
      "booking.success_title": "Booking Confirmed!",
      "booking.success_msg": "Your service request has been sent to the worker.",
      "booking.view_bookings": "Go to My Bookings",
      "booking.status_requested": "Requested",
      "booking.status_accepted": "Accepted",
      "booking.status_in_progress": "In Progress",
      "booking.status_completed": "Completed",
      "booking.status_cancelled": "Cancelled",

      // Dashboards
      "dash.dashboard": "Dashboard",
      "dash.my_bookings": "My Bookings",
      "dash.find_workers": "Find Workers",
      "dash.complaints": "Complaints",
      "dash.my_reviews": "My Reviews",
      "dash.my_profile": "My Profile",
      "dash.logout": "Logout",
      "dash.confirm_logout": "Are you sure you want to log out?",
      "dash.active_bookings": "Active Bookings",
      "dash.completed_repairs": "Completed Repairs",
      "dash.total_spent": "Total Spent",
      "dash.file_complaint": "File a Complaint",
      "dash.rate_worker": "Rate & Review",
      "dash.confirm_done": "Confirm Work Done",
      "dash.cancel_booking": "Cancel Booking",
      "dash.online_accepting": "Online (Accepting Jobs)",
      "dash.offline_busy": "Offline (Busy)",
      "dash.booking_requests": "Booking Requests",
      "dash.active_jobs": "Active Jobs",
      "dash.completed_jobs": "Completed Jobs",
      "dash.total_earnings": "Total Earnings",
      "dash.accept": "Accept",
      "dash.decline": "Decline",
      "dash.mark_in_progress": "Start Job",
      "dash.mark_completed": "Mark Completed",
      "dash.call_customer": "Call Customer",

      // Admin Portal
      "admin.portal_title": "Platform Overview & Control",
      "admin.portal_subtitle": "LocalFix Administration Panel",
      "admin.worker_verif": "Worker Verification",
      "admin.all_bookings": "All Bookings",
      "admin.all_complaints": "All Complaints",
      "admin.verified_workers": "Verified Workers",
      "admin.customers": "Customers",
      "admin.reviews": "Reviews",
      "admin.approve": "Approve",
      "admin.reject": "Reject",

      // Buttons & Common
      "btn.back": "Back",
      "btn.continue": "Continue",
      "btn.cancel": "Cancel",
      "btn.submit": "Submit",
      "btn.save": "Save Changes",
      "btn.close": "Close",

      // Greetings & Stars
      "greeting.morning": "Good morning",
      "greeting.afternoon": "Good afternoon",
      "greeting.evening": "Good evening",
      "stars.no_ratings": "No ratings yet",

      // Error / System Pages
      "error.page_not_found": "Page Not Found",
      "error.page_not_found_desc": "The page you are looking for does not exist or may have been moved.",
      "error.access_denied": "Access Denied",
      "error.access_denied_desc": "You don't have permission to view this page with your current account role.",
      "error.signin_another": "Sign In With Another Account",
    },

    hi: {
      // Brand
      "brand.name": "LocalFix",
      "brand.tagline": "सत्यापित सेवाएं",

      // Navigation
      "nav.services": "सेवाएं",
      "nav.how_it_works": "यह कैसे काम करता है",
      "nav.reviews": "समीक्षाएं",
      "nav.contact": "संपर्क",
      "nav.signin": "साइन इन",
      "nav.get_started": "शुरू करें",
      "nav.back": "पीछे",
      "nav.back_to_home": "होम पेज पर वापस",
      "nav.back_to_workers": "कारीगरों पर वापस",
      "nav.my_account": "मेरा खाता",
      "nav.my_bookings": "मेरी बुकिंग",
      "nav.dashboard": "डैशबोर्ड",
      "nav.logout": "लॉग आउट",
      "nav.theme_toggle": "लाइट / डार्क मोड बदलें",
      "nav.home_page": "होम पेज",

      // Language Modal & Switcher
      "lang.choose_title": "अपनी पसंदीदा भाषा चुनें",
      "lang.choose_subtitle": "Choose Your Preferred Language · Select your language to continue",
      "lang.hi_title": "हिंदी (Hindi)",
      "lang.hi_sub": "घरेलू मरम्मत और सेवाओं के लिए हिंदी चुनें",
      "lang.en_title": "English",
      "lang.en_sub": "Explore trusted local home repair services in English",
      "lang.continue": "जारी रखें",
      "lang.change_language": "भाषा बदलें",
      "lang.selected": "चयनित",

      // Hero Section
      "hero.eyebrow": "सत्यापित स्थानीय तकनीशियन और ऑन-डिमांड घरेलू सेवाएं",
      "hero.title_p1": "विश्वसनीय घरेलू मरम्मत,",
      "hero.title_accent": "सीधे आपके द्वार पर।",
      "hero.sub": "पारदर्शी अग्रिम दरों और असली सत्यापित समीक्षाओं के साथ पृष्ठभूमि-सत्यापित इलेक्ट्रीशियन, प्लंबर, एसी और सफाई तकनीशियन बुक करें।",
      "hero.trust_id": "पहचान सत्यापित",
      "hero.trust_reviews": "असली समीक्षाएं",
      "hero.trust_safe": "सुरक्षित और संरक्षित",
      "hero.trust_ontime": "समय पर सेवा",
      "hero.all_services": "सभी सेवाएं",
      "hero.search_placeholder": "इलाका जैसे मॉडल टाउन",
      "hero.find_workers": "कारीगर खोजें",
      "hero.arrival_badge": "आमतौर पर आपकी लोकेशन पर 30-45 मिनट के भीतर आगमन",

      // Services
      "service.core_title": "हमारी मुख्य सेवाएं",
      "service.core_sub": "प्रत्येक तकनीशियन की पृष्ठभूमि जांची गई है, पहचान सत्यापित है और कार्यकुशलता परखी गई है।",
      "service.electrician": "इलेक्ट्रीशियन",
      "service.electrician_desc": "स्विचबोर्ड, वायरिंग, पंखे की मरम्मत और एमसीबी फिटिंग",
      "service.electrician_sub": "वायरिंग · पंखे · एमसीबी",
      "service.plumber": "प्लंबर",
      "service.plumber_desc": "पाइप लीकेज, नल, सेनेटरी और पानी की टंकी का काम",
      "service.plumber_sub": "पाइप · नल · टंकियां",
      "service.ac_repair": "एसी मरम्मत एवं सर्विस",
      "service.ac_repair_desc": "जेट-पंप सफाई, गैस रीफिल और कूलिंग मरम्मत",
      "service.ac_repair_sub": "जेट पंप · गैस · पीसीबी",
      "service.ro_repair": "आरओ वाटर प्यूरीफायर",
      "service.ro_repair_desc": "फ़िल्टर बदलाव, मेम्ब्रेन, टीडीएस जांच, बूस्टर पंप",
      "service.carpenter": "बढ़ई (कारपेंटर)",
      "service.carpenter_desc": "फर्नीचर मरम्मत, ताले, दरवाजे, कब्जे और फिटिंग",
      "service.cleaning": "घर की सफाई",
      "service.cleaning_desc": "गहन सफाई, रसोई और बाथरूम की स्वच्छता व सैनिटाइजेशन",
      "service.appliance_repair": "उपकरण मरम्मत",
      "service.appliance_repair_desc": "वाशिंग मशीन, फ्रिज, माइक्रोवेव, गीजर मरम्मत",
      "service.browse_all": "सभी सेवाएं देखें",
      "service.browse_all_desc": "श्रेणी, रेटिंग और दर के अनुसार सभी कारीगर देखें",
      "service.available_now": "अभी उपलब्ध",
      "service.all_services_tag": "सभी सेवाएं",

      // How It Works
      "hiw.eyebrow": "सरल प्रक्रिया",
      "hiw.title": "समस्या से समाधान तक केवल 4 आसान चरणों में",
      "hiw.step1_title": "सेवा चुनें",
      "hiw.step1_desc": "इलेक्ट्रीशियन, प्लंबर, एसी, सफाई आदि में से अपनी आवश्यकता चुनें।",
      "hiw.step2_title": "कारीगरों की तुलना करें",
      "hiw.step2_desc": "असली रेटिंग, दरें, अनुभव और सत्यापित समीक्षाएं साथ-साथ देखें।",
      "hiw.step3_title": "समय स्लॉट बुक करें",
      "hiw.step3_desc": "तारीख और समय चुनें। कारीगर समय पर उपकरणों के साथ पहुंचेगा।",
      "hiw.step4_title": "पुष्टि करें और रेटिंग दें",
      "hiw.step4_desc": "कारीगर को सीधे भुगतान करें। कार्य पूर्ण होने की पुष्टि करें और रेटिंग दें।",

      // Statistics Section
      "stats.workers": "पंजीकृत कारीगर",
      "stats.customers": "पंजीकृत ग्राहक",
      "stats.repairs": "पूर्ण की गई मरम्मतें",
      "stats.areas": "कवर किए गए क्षेत्र",
      "stats.satisfaction": "ग्राहक संतुष्टि",
      "stats.no_workers": "अभी कोई पंजीकृत कारीगर नहीं",
      "stats.no_customers": "अभी कोई पंजीकृत ग्राहक नहीं",
      "stats.no_repairs": "अभी कोई पूर्ण मरम्मत नहीं",
      "stats.areas_coming_soon": "क्षेत्र जल्द आ रहे हैं",
      "stats.not_rated_yet": "अभी तक कोई रेटिंग नहीं",

      // Reviews / Testimonials
      "reviews.eyebrow": "असली सत्यापित समीक्षाएं",
      "reviews.title": "ग्राहक लोकलफिक्स को पसंद करते हैं",
      "reviews.sub": "घर पर पूर्ण और पुष्ट मरम्मत के बाद ग्राहकों की वास्तविक प्रतिक्रिया।",
      "reviews.verified_job": "सत्यापित कार्य",
      "reviews.no_reviews": "अभी कोई समीक्षा दर्ज नहीं है।",

      // Footer
      "footer.tagline": "पारदर्शी अग्रिम दरों के साथ पंजाब और उत्तर भारत में सत्यापित कारीगरों को ग्राहकों से जोड़ना।",
      "footer.quick_links": "त्वरित लिंक",
      "footer.services_heading": "सेवाएं",
      "footer.for_workers": "कारीगरों के लिए",
      "footer.join_worker": "कारीगर के रूप में जुड़ें",
      "footer.worker_login": "कारीगर लॉगिन",
      "footer.admin_portal": "एडमिन पोर्टल",
      "footer.rights": "सर्वाधिकार सुरक्षित। विश्वसनीय घरेलू मरम्मत के लिए निर्मित।",
      "footer.helpline": "24/7 हेल्पलाइन",
      "footer.official_email": "आधिकारिक सहायता ईमेल: fixxlocal@gmail.com",
      "footer.need_help": "क्या आपको किसी बुकिंग में तत्काल सहायता चाहिए?",

      // Auth Page
      "auth.side_title": "सत्यापित घरेलू मरम्मत, सीधे आपके द्वार पर।",
      "auth.side_sub": "अपने शहर में पृष्ठभूमि-सत्यापित इलेक्ट्रीशियन, प्लंबर, एसी और सफाई तकनीशियन से जुड़ें।",
      "auth.net_title": "सत्यापित नेटवर्क",
      "auth.net_desc": "काम शुरू करने से पहले प्रत्येक तकनीशियन की पहचान और कौशल का सत्यापन किया जाता है।",
      "auth.feat_1": "सुरक्षित बहु-भूमिका लॉगिन सत्र",
      "auth.feat_2": "व्हाट्सएप शैली में डबल-टिक कार्य पुष्टि",
      "auth.feat_3": "बिना किसी कमीशन के स्पष्ट अग्रिम दरें",
      "auth.role_cust_title": "मैं एक ग्राहक हूँ",
      "auth.role_cust_desc": "घर के लिए मरम्मत सेवाएं बुक करें",
      "auth.role_worker_title": "मैं एक कारीगर हूँ",
      "auth.role_worker_desc": "कौशल सेवाएं प्रदान करें और कमाई करें",
      "auth.tab_signin": "साइन इन",
      "auth.tab_register": "पंजीकरण / साइन अप",
      "auth.login_cust_title": "👤 ग्राहक साइन इन",
      "auth.login_cust_desc": "अपनी बुकिंग प्रबंधित करें, कारीगर का आगमन ट्रैक करें और बिल देखें।",
      "auth.login_worker_title": "🛠️ कारीगर साइन इन",
      "auth.login_worker_desc": "ग्राहक बुकिंग प्रबंधित करें, नए काम स्वीकार करें और कमाई देखें।",
      "auth.reg_cust_title": "👤 ग्राहक खाता बनाएं",
      "auth.reg_cust_desc": "सत्यापित इलेक्ट्रीशियन, प्लंबर और तकनीशियन बुक करने के लिए पंजीकरण करें।",
      "auth.reg_worker_title": "🛠️ कारीगर के रूप में जुड़ें",
      "auth.reg_worker_desc": "अपने इलाके में लोकलफिक्स के सत्यापित नेटवर्क में शामिल हों।",
      "auth.btn_signin_cust": "ग्राहक के रूप में साइन इन करें",
      "auth.btn_signin_worker": "कारीगर के रूप में साइन इन करें",
      "auth.btn_create_cust": "ग्राहक खाता बनाएं",
      "auth.btn_register_worker": "कारीगर के रूप में पंजीकरण करें",
      "auth.lbl_fullname": "पूरा नाम",
      "auth.lbl_email": "ईमेल पता",
      "auth.lbl_phone": "फ़ोन नंबर",
      "auth.lbl_password": "पासवर्ड",
      "auth.lbl_state": "राज्य चुनें",
      "auth.lbl_city_area": "शहर और इलाका",
      "auth.lbl_service_trade": "सेवा श्रेणी",
      "auth.lbl_experience": "कार्य अनुभव (वर्ष)",
      "auth.lbl_price": "मानक विजिट शुल्क (₹)",
      "auth.lbl_skills": "कौशल (अल्पविराम से अलग)",
      "auth.ph_name": "जैसे रमेश कुमार",
      "auth.ph_email": "name@example.com",
      "auth.ph_phone": "10-अंकों का मोबाइल नंबर",
      "auth.ph_password": "कम से कम 6 अक्षर",
      "auth.ph_area": "जैसे मॉडल टाउन, लुधियाना",
      "auth.ph_price": "जैसे 250",
      "auth.ph_skills": "जैसे वायरिंग, एमसीबी, पंखा मरम्मत",
      "auth.err_req_email": "कृपया अपना ईमेल पता दर्ज करें।",
      "auth.err_req_password": "कृपया अपना पासवर्ड दर्ज करें।",
      "auth.err_req_name": "पूरा नाम आवश्यक है।",
      "auth.err_req_phone": "फ़ोन नंबर आवश्यक है।",
      "auth.err_req_area": "कृपया अपना शहर और सेवा इलाका दर्ज करें।",
      "auth.err_req_price": "कृपया अपना विजिट शुल्क दर्ज करें।",
      "auth.err_pwd_len": "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।",
      "auth.err_cust_switched": "यह ईमेल ग्राहक खाते से संबंधित है। कृपया ऊपर 'ग्राहक खाता' चुनें।",
      "auth.err_worker_switched": "यह ईमेल कारीगर खाते से संबंधित है। कृपया ऊपर 'कारीगर खाता' चुनें।",
      "auth.no_account": "क्या आपका खाता नहीं है?",
      "auth.create_one": "अभी नया खाता बनाएं",
      "auth.already_account": "पहले से पंजीकृत हैं?",
      "auth.signin_here": "यहाँ साइन इन करें",

      // OTP Verification
      "otp.title": "दो-चरणीय सत्यापन",
      "otp.subtitle": "पर भेजा गया 6-अंकों का सत्यापन कोड दर्ज करें",
      "otp.sent_to_email": "हमने आपके ईमेल पर 6-अंकों का सत्यापन कोड भेजा है",
      "otp.sent_to_phone": "हमने आपके फ़ोन पर 6-अंकों का एसएमएस कोड भेजा है",
      "otp.code_expires": "कोड समाप्त होने में शेष समय",
      "otp.resend_in": "पुनः भेजें",
      "otp.resend_code": "नया कोड पुनः भेजें",
      "otp.resending": "कोड भेजा जा रहा है...",
      "otp.verify_btn": "सत्यापित करें और आगे बढ़ें",
      "otp.verifying": "सत्यापन किया जा रहा है...",
      "otp.switch_to_phone": "इसके बजाय फ़ोन पर एसएमएस द्वारा कोड भेजें",
      "otp.switch_to_email": "इसके बजाय ईमेल पर कोड भेजें",
      "otp.change_target": "ईमेल या फ़ोन बदलें",
      "otp.back_to_login": "साइन इन पर वापस जाएं",
      "otp.err_incomplete": "कृपया पूरे 6 अंक दर्ज करें।",
      "otp.err_invalid": "गलत सत्यापन कोड। कृपया जांचें और पुनः प्रयास करें।",
      "otp.err_expired": "यह सत्यापन कोड समाप्त हो गया है। कृपया नया कोड मांगें।",
      "otp.err_too_many": "बहुत अधिक गलत प्रयास। कृपया नया कोड मांगें।",
      "otp.security_note": "अपना लोकलफिक्स ओटीपी किसी के साथ भी साझा न करें, तकनीशियन या सपोर्ट सहित।",

      // Worker Search & Cards
      "search.title": "आपके निकट सत्यापित सेवा कारीगर",
      "search.subtitle": "त्वरित घरेलू सेवा के लिए उपलब्ध सत्यापित इलेक्ट्रीशियन, प्लंबर और तकनीशियन दिखाए जा रहे हैं।",
      "search.grid_view": "ग्रिड दृश्य",
      "search.map_view": "मानचित्र दृश्य",
      "search.filter_workers": "कारीगर फ़िल्टर करें",
      "search.reset": "रीसेट",
      "search.search_keywords": "कीवर्ड खोजें",
      "search.ph_keywords": "नाम, कौशल, कीवर्ड...",
      "search.ph_city_area": "जैसे लुधियाना, मॉडल टाउन, रोहिणी...",
      "search.all_states": "सभी राज्य",
      "search.any_rating": "कोई भी स्टार रेटिंग",
      "search.filter_service": "सेवा श्रेणी",
      "search.filter_state": "राज्य",
      "search.filter_area": "इलाका / क्षेत्र",
      "search.filter_rating": "न्यूनतम रेटिंग",
      "search.filter_max_price": "अधिकतम विजिट शुल्क",
      "search.filter_sort": "क्रमबद्ध करें",
      "search.sort_recommended": "अनुशंसित",
      "search.sort_price_asc": "दर: कम से अधिक",
      "search.sort_rating": "उच्चतम रेटिंग",
      "search.no_workers_title": "कोई सत्यापित कारीगर नहीं मिला",
      "search.reset_filters": "सभी फ़िल्टर रीसेट करें",
      "search.view_punjab": "पंजाब के कारीगर देखें",
      "search.map_hint": "कारीगर कार्ड देखने और तुरंत बुक करने के लिए मानचित्र पर किसी भी मूल्य पिन पर क्लिक करें।",

      // Worker Badges & Card
      "worker.verified": "सत्यापित",
      "worker.available": "उपलब्ध",
      "worker.busy": "व्यस्त",
      "worker.yrs_exp": "वर्ष का अनुभव",
      "worker.visiting_fee": "विजिट शुल्क",
      "worker.per_visit": "/विजिट",
      "worker.book_now": "अभी बुक करें",
      "worker.book_worker": "इस कारीगर को बुक करें",
      "worker.view_profile": "प्रोफ़ाइल देखें",
      "worker.travel": "यात्रा शुल्क",
      "worker.travel_charge_applies": "+₹100 अतिरिक्त यात्रा शुल्क लागू",
      "worker.tick_worker": "कारीगर",
      "worker.tick_customer": "ग्राहक",
      "worker.tick_verified": "सत्यापित",
      "worker.about_heading": "कारीगर के बारे में",
      "worker.skills_heading": "कौशल एवं विशेषज्ञता",
      "worker.details_heading": "कारीगर विवरण",
      "worker.service_area": "सेवा क्षेत्र",
      "worker.working_hours": "कार्य समय",
      "worker.phone": "फ़ोन",
      "worker.write_review": "समीक्षा लिखें और रेटिंग दें",
      "worker.report_issue": "समस्या की रिपोर्ट करें",
      "worker.rate_worker": "कारीगर को रेटिंग दें",
      "worker.reviews_heading": "ग्राहक रेटिंग व विवरण",
      "worker.verified_reviews_title": "सत्यापित ग्राहक समीक्षाएं",
      "worker.no_reviews_yet": "अभी कोई समीक्षा नहीं लिखी गई है।",
      "worker.back_to_workers": "कारीगर सूची पर वापस",
      "worker.verified_worker": "सत्यापित सेवा कारीगर",
      "worker.verif_pending": "सत्यापन लंबित",
      "worker.rate_and_review": "कारीगर को रेटिंग और समीक्षा दें",
      "worker.select_star_rating": "अपनी स्टार रेटिंग चुनें",
      "worker.your_review_exp": "आपकी समीक्षा और अनुभव",
      "worker.ph_review": "सेवा गुणवत्ता, समय की पाबंदी और किए गए कार्य का विवरण दें...",
      "worker.submit_review": "समीक्षा जमा करें",
      "worker.report_subject": "विषय / कारण",
      "worker.priority": "प्राथमिकता",
      "worker.description": "विवरण",
      "worker.submit_complaint": "शिकायत दर्ज करें",
      "worker.coverage_map": "सेवा क्षेत्र मानचित्र",

      // Booking Wizard
      "booking.title": "घरेलू सेवा बुक करें",
      "booking.subtitle": "अपनी सेवा का विवरण चुनें और एक सत्यापित कारीगर तय करें।",
      "booking.step_service": "सेवा",
      "booking.step_problem": "समस्या",
      "booking.step_date": "तारीख",
      "booking.step_time": "समय",
      "booking.step_address": "पता",
      "booking.step_review": "समीक्षा",
      "booking.step_done": "पूर्ण",
      "booking.select_service": "आवश्यक सेवा चुनें",
      "booking.describe_problem": "समस्या का विवरण दें",
      "booking.ph_problem": "जैसे स्विचबोर्ड में स्पार्किंग, पंखा नहीं चल रहा...",
      "booking.select_date": "तारीख चुनें",
      "booking.select_slot": "समय स्लॉट चुनें",
      "booking.enter_address": "सेवा का पता",
      "booking.ph_address": "मकान / फ्लैट नंबर, गली, लैंडमार्क, इलाका",
      "booking.locate_gps": "जीपीएस से स्थान चुनें",
      "booking.summary_title": "बुकिंग सारांश",
      "booking.base_charge": "मूल शुल्क",
      "booking.travel_charge": "यात्रा शुल्क (>10 किमी)",
      "booking.total_payable": "कुल देय राशि",
      "booking.pay_note": "कार्य पूर्ण होने पर कारीगर को सीधे नकद या यूपीआई द्वारा भुगतान करें।",
      "booking.confirm_and_book": "पुष्टि करें और बुक करें",
      "booking.success_title": "बुकिंग की पुष्टि हो गई!",
      "booking.success_msg": "आपका सेवा अनुरोध कारीगर को भेज दिया गया है।",
      "booking.view_bookings": "मेरी बुकिंग देखें",
      "booking.status_requested": "अनुरोध भेजा",
      "booking.status_accepted": "स्वीकृत",
      "booking.status_in_progress": "प्रगति में",
      "booking.status_completed": "पूर्ण",
      "booking.status_cancelled": "रद्द",

      // Dashboards
      "dash.dashboard": "डैशबोर्ड",
      "dash.my_bookings": "मेरी बुकिंग",
      "dash.find_workers": "कारीगर खोजें",
      "dash.complaints": "शिकायतें",
      "dash.my_reviews": "मेरी समीक्षाएं",
      "dash.my_profile": "मेरी प्रोफ़ाइल",
      "dash.logout": "लॉग आउट",
      "dash.confirm_logout": "क्या आप वाकई लॉग आउट करना चाहते हैं?",
      "dash.active_bookings": "सक्रिय बुकिंग",
      "dash.completed_repairs": "पूर्ण की गई मरम्मतें",
      "dash.total_spent": "कुल खर्च",
      "dash.file_complaint": "शिकायत दर्ज करें",
      "dash.rate_worker": "रेटिंग व समीक्षा दें",
      "dash.confirm_done": "कार्य पूर्ण होने की पुष्टि करें",
      "dash.cancel_booking": "बुकिंग रद्द करें",
      "dash.online_accepting": "ऑनलाइन (काम स्वीकार कर रहे हैं)",
      "dash.offline_busy": "ऑफलाइन (व्यस्त)",
      "dash.booking_requests": "बुकिंग अनुरोध",
      "dash.active_jobs": "सक्रिय कार्य",
      "dash.completed_jobs": "पूर्ण किए गए कार्य",
      "dash.total_earnings": "कुल कमाई",
      "dash.accept": "स्वीकार करें",
      "dash.decline": "अस्वीकार करें",
      "dash.mark_in_progress": "काम शुरू करें",
      "dash.mark_completed": "पूर्ण चिह्नित करें",
      "dash.call_customer": "ग्राहक को कॉल करें",

      // Admin Portal
      "admin.portal_title": "प्लेटफ़ॉर्म अवलोकन और नियंत्रण",
      "admin.portal_subtitle": "लोकलफिक्स एडमिन पैनल",
      "admin.worker_verif": "कारीगर सत्यापन",
      "admin.all_bookings": "सभी बुकिंग",
      "admin.all_complaints": "सभी शिकायतें",
      "admin.verified_workers": "सत्यापित कारीगर",
      "admin.customers": "ग्राहक",
      "admin.reviews": "समीक्षाएं",
      "admin.approve": "स्वीकृत करें",
      "admin.reject": "अस्वीकार करें",

      // Buttons & Common
      "btn.back": "पीछे",
      "btn.continue": "जारी रखें",
      "btn.cancel": "रद्द करें",
      "btn.submit": "जमा करें",
      "btn.save": "बदलाव सहेजें",
      "btn.close": "बंद करें",

      // Greetings & Stars
      "greeting.morning": "सुप्रभात",
      "greeting.afternoon": "शुभ दोपहर",
      "greeting.evening": "शुभ संध्या",
      "stars.no_ratings": "अभी कोई रेटिंग नहीं",

      // Error / System Pages
      "error.page_not_found": "पृष्ठ नहीं मिला",
      "error.page_not_found_desc": "आप जिस पृष्ठ की तलाश कर रहे हैं वह मौजूद नहीं है या हटा दिया गया है।",
      "error.access_denied": "पहुंच अस्वीकृत",
      "error.access_denied_desc": "आपको अपनी वर्तमान खाता भूमिका के साथ इस पृष्ठ को देखने की अनुमति नहीं है।",
      "error.signin_another": "अन्य खाते से साइन इन करें",
    },
  };

  const i18n = {
    currentLang: "en",

    getLanguage: function () {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "hi" || stored === "en") return stored;
      } catch (e) {}
      return "en";
    },

    isLanguageSelected: function () {
      try {
        return localStorage.getItem(SELECTED_FLAG_KEY) === "true";
      } catch (e) {
        return false;
      }
    },

    t: function (key, defaultVal, params) {
      const lang = this.currentLang || this.getLanguage();
      const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
      let text = dict[key];
      if (text === undefined) {
        text = TRANSLATIONS.en[key] !== undefined ? TRANSLATIONS.en[key] : (defaultVal !== undefined ? defaultVal : key);
      }
      if (params && typeof params === "object") {
        Object.keys(params).forEach(function (p) {
          text = text.replace(new RegExp("\\{" + p + "\\}", "g"), params[p]);
        });
      }
      return text;
    },

    setLanguage: function (lang, options) {
      if (lang !== "en" && lang !== "hi") lang = "en";
      this.currentLang = lang;

      try {
        localStorage.setItem(STORAGE_KEY, lang);
        localStorage.setItem(SELECTED_FLAG_KEY, "true");
      } catch (e) {}

      // Synchronize with logged-in user profile if available
      try {
        if (window.Storage && typeof window.Storage.getCurrentUser === "function") {
          const user = window.Storage.getCurrentUser();
          if (user && user.language !== lang) {
            user.language = lang;
            window.Storage.setCurrentUser(user);
          }
        }
      } catch (e) {}

      document.documentElement.lang = lang;
      document.documentElement.setAttribute("data-lang", lang);

      // Translate all DOM elements
      this.translateDOM();

      // Update Switcher UI
      this.updateSwitcherUI();

      // Dispatch custom reactive event
      const event = new CustomEvent("lf:lang-changed", { detail: { lang: lang } });
      window.dispatchEvent(event);

      // Broadcast across tabs
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const bc = new BroadcastChannel("localfix_data_channel");
          bc.postMessage({ type: "lang_changed", lang: lang });
        } catch (e) {}
      }
    },

    translateDOM: function (root) {
      const base = root || document;
      const self = this;

      // Text elements
      base.querySelectorAll("[data-i18n]").forEach(function (el) {
        const key = el.getAttribute("data-i18n");
        if (key) {
          const val = self.t(key);
          if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            el.value = val;
          } else {
            el.textContent = val;
          }
        }
      });

      // HTML elements
      base.querySelectorAll("[data-i18n-html]").forEach(function (el) {
        const key = el.getAttribute("data-i18n-html");
        if (key) {
          el.innerHTML = self.t(key);
        }
      });

      // Placeholders
      base.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
        const key = el.getAttribute("data-i18n-placeholder");
        if (key) {
          el.setAttribute("placeholder", self.t(key));
        }
      });

      // Titles
      base.querySelectorAll("[data-i18n-title]").forEach(function (el) {
        const key = el.getAttribute("data-i18n-title");
        if (key) {
          el.setAttribute("title", self.t(key));
        }
      });

      // Aria labels
      base.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
        const key = el.getAttribute("data-i18n-aria");
        if (key) {
          el.setAttribute("aria-label", self.t(key));
        }
      });
    },

    updateSwitcherUI: function () {
      const lang = this.currentLang;
      const label = lang === "hi" ? "हिंदी" : "English";
      const flag = lang === "hi" ? "🇮🇳" : "🇬🇧";

      document.querySelectorAll(".lf-lang-current-label").forEach(function (el) {
        el.textContent = label;
      });
      document.querySelectorAll(".lf-lang-current-flag").forEach(function (el) {
        el.textContent = flag;
      });

      document.querySelectorAll(".lf-lang-option").forEach(function (el) {
        const optLang = el.getAttribute("data-lang");
        const isActive = optLang === lang;
        el.classList.toggle("active", isActive);
        const checkIcon = el.querySelector(".lf-lang-check");
        if (checkIcon) {
          checkIcon.style.display = isActive ? "inline-block" : "none";
        }
      });
    },

    // ── First-Visit Language Selection Modal ────────────────────────────────
    initFirstVisitModal: function () {
      if (this.isLanguageSelected()) {
        return; // Already selected, do not show
      }

      this.showLanguageModal(true);
    },

    showLanguageModal: function (isFirstVisit) {
      let modal = document.getElementById("lfLanguageModal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "lfLanguageModal";
        modal.className = "lf-lang-modal-backdrop";
        modal.innerHTML = `
          <div class="lf-lang-modal-dialog">
            <div class="lf-lang-modal-content">
              <div class="lf-lang-modal-header text-center">
                <div class="lf-lang-modal-icon-badge mb-3">
                  <i class="bi bi-translate"></i>
                </div>
                <h3 class="lf-lang-modal-title mb-2" data-i18n="lang.choose_title">Choose Your Preferred Language</h3>
                <p class="lf-lang-modal-sub text-muted small mb-0" data-i18n="lang.choose_subtitle">अपनी पसंदीदा भाषा चुनें · Select your language to continue</p>
              </div>

              <div class="lf-lang-options-grid my-4">
                <!-- Hindi Option -->
                <div class="lf-lang-card" data-lang="hi" role="button" tabindex="0">
                  <div class="d-flex align-items-center gap-3">
                    <span class="lf-lang-card-flag">🇮🇳</span>
                    <div class="flex-grow-1">
                      <div class="lf-lang-card-title">हिंदी (Hindi)</div>
                      <div class="lf-lang-card-desc">घरेलू मरम्मत और सेवाओं के लिए हिंदी चुनें</div>
                    </div>
                    <div class="lf-lang-radio-check"><i class="bi bi-check2"></i></div>
                  </div>
                </div>

                <!-- English Option -->
                <div class="lf-lang-card" data-lang="en" role="button" tabindex="0">
                  <div class="d-flex align-items-center gap-3">
                    <span class="lf-lang-card-flag">🇬🇧</span>
                    <div class="flex-grow-1">
                      <div class="lf-lang-card-title">English</div>
                      <div class="lf-lang-card-desc">Explore trusted local home repair services in English</div>
                    </div>
                    <div class="lf-lang-radio-check"><i class="bi bi-check2"></i></div>
                  </div>
                </div>
              </div>

              <div class="lf-lang-modal-footer text-center">
                <button type="button" class="btn btn-lf-primary w-100 py-3 fw-bold lf-lang-continue-btn" id="lfLangContinueBtn">
                  <span id="lfLangContinueBtnText">Continue / जारी रखें</span>
                  <i class="bi bi-arrow-right ms-2"></i>
                </button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      const self = this;
      let tempSelectedLang = this.getLanguage() || "en";

      const cards = modal.querySelectorAll(".lf-lang-card");
      const continueBtn = modal.querySelector("#lfLangContinueBtn");
      const continueBtnText = modal.querySelector("#lfLangContinueBtnText");

      const updateSelectedCardUI = function (lang) {
        tempSelectedLang = lang;
        cards.forEach(function (c) {
          const cLang = c.getAttribute("data-lang");
          c.classList.toggle("selected", cLang === lang);
        });
        if (continueBtnText) {
          continueBtnText.textContent = lang === "hi" ? "जारी रखें / Continue" : "Continue / जारी रखें";
        }
      };

      cards.forEach(function (card) {
        card.addEventListener("click", function () {
          const l = card.getAttribute("data-lang");
          updateSelectedCardUI(l);
        });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const l = card.getAttribute("data-lang");
            updateSelectedCardUI(l);
          }
        });
      });

      updateSelectedCardUI(tempSelectedLang);

      if (continueBtn) {
        continueBtn.onclick = function () {
          self.setLanguage(tempSelectedLang);
          modal.classList.remove("show");
          setTimeout(function () {
            if (modal.parentNode) modal.parentNode.removeChild(modal);
          }, 300);
        };
      }

      // Smooth entrance
      requestAnimationFrame(function () {
        modal.classList.add("show");
      });
    },

    // ── Inject Navbar Language Switcher ──────────────────────────────────────
    mountNavbarSwitcher: function () {
      if (document.querySelector(".lf-lang-dropdown")) return;

      const themeToggle = document.getElementById("themeToggleBtn");
      let container = null;

      if (themeToggle && themeToggle.parentNode) {
        container = themeToggle.parentNode;
      } else {
        const topbar = document.querySelector(".lf-topbar") || document.querySelector(".navbar .collapse") || document.querySelector(".navbar");
        if (topbar) container = topbar;
      }

      if (!container) return;

      const currentLang = this.currentLang;
      const label = currentLang === "hi" ? "हिंदी" : "English";
      const flag = currentLang === "hi" ? "🇮🇳" : "🇬🇧";

      const switcherWrapper = document.createElement("div");
      switcherWrapper.className = "dropdown lf-lang-dropdown d-inline-block";
      switcherWrapper.innerHTML = `
        <button class="btn btn-sm lf-lang-btn dropdown-toggle d-flex align-items-center gap-1" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Change Language / भाषा बदलें">
          <i class="bi bi-translate text-primary"></i>
          <span class="lf-lang-current-label">${label}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end lf-lang-menu shadow-lg">
          <li>
            <button class="dropdown-item lf-lang-option d-flex align-items-center justify-content-between ${currentLang === "en" ? "active" : ""}" type="button" data-lang="en">
              <span class="d-flex align-items-center gap-2">
                <span class="lf-lang-flag">🇬🇧</span>
                <span class="lf-lang-name">English</span>
              </span>
              <i class="bi bi-check2 lf-lang-check" style="${currentLang === "en" ? "display:inline-block;" : "display:none;"}"></i>
            </button>
          </li>
          <li>
            <button class="dropdown-item lf-lang-option d-flex align-items-center justify-content-between ${currentLang === "hi" ? "active" : ""}" type="button" data-lang="hi">
              <span class="d-flex align-items-center gap-2">
                <span class="lf-lang-flag">🇮🇳</span>
                <span class="lf-lang-name">हिंदी (Hindi)</span>
              </span>
              <i class="bi bi-check2 lf-lang-check" style="${currentLang === "hi" ? "display:inline-block;" : "display:none;"}"></i>
            </button>
          </li>
          <li><hr class="dropdown-divider my-1"></li>
          <li>
            <button class="dropdown-item small text-muted d-flex align-items-center gap-2" type="button" id="lfOpenLangModalBtn">
              <i class="bi bi-gear"></i>
              <span data-i18n="lang.change_language">Select Preference</span>
            </button>
          </li>
        </ul>
      `;

      if (themeToggle) {
        container.insertBefore(switcherWrapper, themeToggle);
      } else {
        container.appendChild(switcherWrapper);
      }

      const self = this;
      switcherWrapper.querySelectorAll(".lf-lang-option").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          const targetLang = btn.getAttribute("data-lang");
          self.setLanguage(targetLang);
        });
      });

      const openModalBtn = switcherWrapper.querySelector("#lfOpenLangModalBtn");
      if (openModalBtn) {
        openModalBtn.addEventListener("click", function (e) {
          e.preventDefault();
          self.showLanguageModal(false);
        });
      }
    },

    init: function () {
      const lang = this.getLanguage();
      this.currentLang = lang;
      document.documentElement.lang = lang;
      document.documentElement.setAttribute("data-lang", lang);

      const self = this;
      document.addEventListener("DOMContentLoaded", function () {
        self.mountNavbarSwitcher();
        self.translateDOM();
        self.updateSwitcherUI();
        self.initFirstVisitModal();
      });

      // Cross-tab sync
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const bc = new BroadcastChannel("localfix_data_channel");
          bc.onmessage = function (e) {
            if (e.data && e.data.type === "lang_changed" && e.data.lang) {
              if (e.data.lang !== self.currentLang) {
                self.currentLang = e.data.lang;
                document.documentElement.lang = e.data.lang;
                document.documentElement.setAttribute("data-lang", e.data.lang);
                self.translateDOM();
                self.updateSwitcherUI();
                window.dispatchEvent(new CustomEvent("lf:lang-changed", { detail: { lang: e.data.lang } }));
              }
            }
          };
        } catch (e) {}
      }
    },
  };

  i18n.init();
  window.i18n = i18n;
  window.t = function (key, def, p) { return i18n.t(key, def, p); };

})(window, document);
