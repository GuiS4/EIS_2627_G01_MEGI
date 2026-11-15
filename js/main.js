// Main JavaScript file for the Courier Management System

"use strict";

// =====================================
// COURIERFLOW - DEMO AUTHENTICATION
// Sprint 1 frontend prototype only
// =====================================

(function syncPublicAndLogoutSession() {
    try {
        const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
        if (page === "" || page === "index.html" || page === "login.html" || page === "register.html") {
            sessionStorage.removeItem("cms_current_user");
            sessionStorage.removeItem("courierflow.demo.role");
        }
        document.querySelectorAll('a[href="login.html"], #logoutBtn').forEach(function (link) {
            if (link.id === "logoutBtn" || /logout/i.test(link.textContent || "")) {
                link.addEventListener("click", function () {
                    sessionStorage.removeItem("cms_current_user");
                    sessionStorage.removeItem("courierflow.demo.role");
                });
            }
        });
        if (page === "" || page === "index.html") {
            const homeNavLinks = document.querySelectorAll('.sidebar nav .sidebar-links a');
            homeNavLinks.forEach(function (link) {
                link.addEventListener("click", function () {
                    homeNavLinks.forEach(function (l) { l.classList.remove("active"); });
                    link.classList.add("active");
                });
            });
        }
    } catch (_) {
        // Ignore sessionStorage errors
    }
})();

function getUsers() {
    return JSON.parse(
        localStorage.getItem("cms_users") || "[]"
    );
}

function showError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);

    error.textContent = message;
    input.classList.add("input-error");
}

function resetError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);

    error.textContent = "";
    input.classList.remove("input-error");
}


// =====================================
// REGISTER
// =====================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const fields = [
            ["name", "nameError"],
            ["username", "usernameError"],
            ["registerEmail", "registerEmailError"],
            ["phone", "phoneError"],
            ["nif", "nifError"],
            ["role", "roleError"],
            ["registerPassword", "registerPasswordError"],
            ["confirmPassword", "confirmPasswordError"]
        ];

        let valid = true;

        fields.forEach(function([inputId, errorId]) {
            resetError(inputId, errorId);

            const input = document.getElementById(inputId);

            if (input.value.trim() === "") {
                showError(
                    inputId,
                    errorId,
                    "This field is required."
                );
                valid = false;
            }
        });

        const name = document.getElementById("name").value.trim();
        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("registerEmail").value.trim().toLowerCase();
        const phone = document.getElementById("phone").value.trim();
        const nif = document.getElementById("nif").value.trim();
        const role = document.getElementById("role").value;
        const password = document.getElementById("registerPassword").value;
        const confirmation = document.getElementById("confirmPassword").value;

        if (email !== "" &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

            showError(
                "registerEmail",
                "registerEmailError",
                "Please enter a valid email."
            );
            valid = false;
        }

        if (phone !== "" && !/^[+0-9() .-]{6,30}$/.test(phone)) {
            showError(
                "phone",
                "phoneError",
                "Please enter a valid phone number."
            );
            valid = false;
        }

        if (nif !== "" && !/^\d{9}$/.test(nif)) {
            showError(
                "nif",
                "nifError",
                "NIF must contain 9 digits."
            );
            valid = false;
        }

        if (password !== "" && password.length < 6) {
            showError(
                "registerPassword",
                "registerPasswordError",
                "Password must contain at least 6 characters."
            );
            valid = false;
        }

        if (confirmation !== "" && password !== confirmation) {
            showError(
                "confirmPassword",
                "confirmPasswordError",
                "Passwords do not match."
            );
            valid = false;
        }

        if (role !== "" &&
            role !== "client" &&
            role !== "courier" &&
            role !== "staff") {

            showError(
                "role",
                "roleError",
                "Please select a valid account type."
            );
            valid = false;
        }

        const users = getUsers();

        if (users.some(user => user.email === email)) {
            showError(
                "registerEmail",
                "registerEmailError",
                "This email is already registered."
            );
            valid = false;
        }

        if (users.some(user => user.username === username)) {
            showError(
                "username",
                "usernameError",
                "This username is already taken."
            );
            valid = false;
        }

        if (!valid) {
            return;
        }

        // DEMO ONLY:
        // Passwords are stored locally in plain text.
        // Never use this approach in production.

        const approvalStatus = (role === "courier" || role === "staff")
            ? "Pending"
            : "Approved";

        const nowIso = new Date().toISOString();
        const newUser = {
            id: role === "courier"
                ? `CR-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
                : role === "staff"
                    ? `ST-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
                    : crypto.randomUUID(),
            name: name,
            username: username,
            email: email,
            phone: phone,
            nif: nif,
            role: role,
            approval_status: approvalStatus,
            approved_by: null,
            password: password,
            created_at: nowIso,
            createdAt: nowIso
        };

        users.push(newUser);

        localStorage.setItem(
            "cms_users",
            JSON.stringify(users)
        );

        if (role === "courier") {
            alert("Courier account created! Your account is pending Staff approval before login.");
        } else if (role === "staff") {
            alert("Staff account created! Your account is pending Admin approval before login.");
        } else {
            alert("Account created successfully! Please login.");
        }

        window.location.href = "login.html";
    });
}


// =====================================
// LOGIN
// =====================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function(event) {

        event.preventDefault();

        resetError("email", "emailError");
        resetError("password", "passwordError");

        const email =
            document.getElementById("email").value.trim().toLowerCase();

        const password =
            document.getElementById("password").value;

        let valid = true;

        if (email === "") {
            showError(
                "email",
                "emailError",
                "Email is required."
            );
            valid = false;
        }

        if (password === "") {
            showError(
                "password",
                "passwordError",
                "Password is required."
            );
            valid = false;
        }

        if (!valid) {
            return;
        }

        // Administrator demo access
        if (email === "admin@admin.demo" && password === "Admin123!") {
            sessionStorage.removeItem("cms_current_user");
            sessionStorage.setItem("courierflow.demo.role", "admin");
            window.location.href = "admin.html";
            return;
        }

        // Staff demo access
        if (email === "staff@staff.demo" && password === "Staff123!") {
            sessionStorage.removeItem("cms_current_user");
            sessionStorage.setItem("courierflow.demo.role", "staff");
            window.location.href = "staff.html";
            return;
        }

        // Courier demo access
        if (email === "courier@courier.demo" && password === "Courier123!") {
            sessionStorage.setItem("courierflow.demo.role", "courier");
            sessionStorage.setItem(
                "cms_current_user",
                JSON.stringify({
                    id: "CR-001",
                    name: "Alex Silva",
                    username: "alexsilva",
                    email: "courier@courier.demo",
                    role: "courier"
                })
            );
            window.location.href = "courier.html";
            return;
        }

        // Client demo access
        if (email === "client@client.demo" && password === "Client123!") {
            sessionStorage.setItem("courierflow.demo.role", "client");
            sessionStorage.setItem(
                "cms_current_user",
                JSON.stringify({
                    id: "CL-001",
                    name: "Demo Client",
                    username: "democlient",
                    email: "client@client.demo",
                    role: "client"
                })
            );
            window.location.href = "client.html";
            return;
        }

        // Clear any previous demo role session
        sessionStorage.removeItem("courierflow.demo.role");

        const users = getUsers();

        const user = users.find(function(savedUser) {
            return savedUser.email === email &&
                   savedUser.password === password;
        });

        if (!user) {
            showError(
                "password",
                "passwordError",
                "Incorrect email or password."
            );
            return;
        }

        // Check approval status for Staff and Courier accounts
        if (user.role === "staff") {
            // Check latest status in Admin staff store if available
            try {
                const adminStore = JSON.parse(localStorage.getItem("courierflow.admin.staff.v1") || "null");
                const matchStaff = adminStore?.staff?.find(s => s.id === user.id || (s.email && s.email.toLowerCase() === email));
                if (matchStaff && matchStaff.approval_status) {
                    user.approval_status = matchStaff.approval_status;
                }
            } catch { /* ignore */ }

            if (user.approval_status === "Pending") {
                showError(
                    "password",
                    "passwordError",
                    "Your Staff account is pending Admin approval."
                );
                return;
            }
            if (user.approval_status === "Rejected") {
                showError(
                    "password",
                    "passwordError",
                    "Your Staff account registration was rejected by Admin."
                );
                return;
            }
        } else if (user.role === "courier") {
            // Check latest status in Staff courier store if available
            try {
                const staffStore = JSON.parse(localStorage.getItem("courierflow.staff.demo.v1") || "null");
                const matchCourier = staffStore?.couriers?.find(c => c.id === user.id || (c.email && c.email.toLowerCase() === email));
                if (matchCourier && matchCourier.approval_status) {
                    user.approval_status = matchCourier.approval_status;
                }
            } catch { /* ignore */ }

            if (user.approval_status === "Pending") {
                showError(
                    "password",
                    "passwordError",
                    "Your Courier account is pending Staff approval."
                );
                return;
            }
            if (user.approval_status === "Rejected") {
                showError(
                    "password",
                    "passwordError",
                    "Your Courier account registration was rejected by Staff."
                );
                return;
            }
        }

        // Demo session (not secure authentication)

        sessionStorage.setItem(
            "cms_current_user",
            JSON.stringify({
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role
            })
        );

        // Redirect according to user role

        if (user.role === "client") {
            window.location.href = "client.html";

        } else if (user.role === "courier") {
            window.location.href = "courier.html";

        } else if (user.role === "staff") {
            sessionStorage.setItem("courierflow.demo.role", "staff");
            window.location.href = "staff.html";

        } else if (user.role === "admin") {
            sessionStorage.setItem("courierflow.demo.role", "admin");
            window.location.href = "admin.html";
        }
    });
}

// Password visibility toggle
const togglePasswordBtn = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", function() {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";

        const eyeIcon = togglePasswordBtn.querySelector(".eye-icon");
        const eyeOffIcon = togglePasswordBtn.querySelector(".eye-off-icon");

        if (eyeIcon && eyeOffIcon) {
            eyeIcon.style.display = isPassword ? "none" : "block";
            eyeOffIcon.style.display = isPassword ? "block" : "none";
        }

        const label = isPassword ? "Hide password" : "Show password";
        togglePasswordBtn.setAttribute("aria-label", label);
        togglePasswordBtn.setAttribute("title", label);
        passwordInput.focus();
    });
}


// =====================================
// SHARED UTILITIES & SEED DATA
// Used across Client, Courier, Staff and Admin pages
// =====================================

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, function(ch) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        }[ch];
    });
}

function formatDateDDMMYYYY(value) {
    if (!value) return "—";
    const str = String(value).trim();
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
    if (isoMatch) {
        return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    const dt = new Date(str);
    if (!Number.isFinite(dt.getTime())) return str;
    const pad = function(n) { return String(n).padStart(2, "0"); };
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

function formatCurrencyEUR(value) {
    return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR"
    }).format(Number(value) || 0);
}

function normalizeVehicleType(typeName) {
    const raw = String(typeName || "").trim();
    if (raw === "Motorcycle") return "Moto";
    if (raw === "Bicycle") return "Bike";
    if (raw === "Bike" || raw === "Moto" || raw === "Van" || raw === "Truck") {
        return raw;
    }
    return "Van";
}

function defaultSeedVehicles() {
    return [
        {
            id: "V-001",
            courier_id: "CR-001",
            submitted_by_courier_id: "CR-001",
            submitted_by_courier_name: "Alex Silva",
            type_name: "Van",
            model: "Renault Kangoo",
            license_plate: "AA-12-CF",
            max_weight_kg: 650,
            max_vol_m3: 3.3,
            insurance_expiry_date: "2027-08-15",
            inspection_expiry_date: "2027-06-20",
            insurance_expiry_doc: "kangoo_insurance.pdf",
            inspection_expiry_doc: "kangoo_inspection.pdf",
            approval_status: "Approved",
            approved_by: "Staff (staff@staff.demo)",
            doc_updated_at: "2026-10-15T10:00:00.000Z",
            created_at: "2026-10-10T09:00:00.000Z"
        },
        {
            id: "V-002",
            courier_id: "CR-002",
            submitted_by_courier_id: "CR-002",
            submitted_by_courier_name: "Maria Costa",
            type_name: "Van",
            model: "Peugeot Partner",
            license_plate: "AB-34-CF",
            max_weight_kg: 750,
            max_vol_m3: 3.7,
            insurance_expiry_date: "2027-09-10",
            inspection_expiry_date: "2027-07-01",
            insurance_expiry_doc: "partner_insurance.pdf",
            inspection_expiry_doc: "partner_inspection.pdf",
            approval_status: "Approved",
            approved_by: "Staff (staff@staff.demo)",
            doc_updated_at: "2026-10-16T11:30:00.000Z",
            created_at: "2026-10-12T14:20:00.000Z"
        },
        {
            id: "V-003",
            courier_id: "CR-001",
            submitted_by_courier_id: "CR-001",
            submitted_by_courier_name: "Alex Silva",
            type_name: "Moto",
            model: "Honda PCX 125",
            license_plate: "MC-11-CF",
            max_weight_kg: 15.0,
            max_vol_m3: 0.08,
            insurance_expiry_date: "2027-05-12",
            inspection_expiry_date: "2027-04-18",
            insurance_expiry_doc: "pcx_insurance.pdf",
            inspection_expiry_doc: "pcx_inspection.pdf",
            approval_status: "Approved",
            approved_by: "Staff (staff@staff.demo)",
            doc_updated_at: "2026-10-18T08:15:00.000Z",
            created_at: "2026-10-18T08:00:00.000Z"
        },
        {
            id: "V-004",
            courier_id: "CR-002",
            submitted_by_courier_id: "CR-002",
            submitted_by_courier_name: "Maria Costa",
            type_name: "Bike",
            model: "Urban Cargo Bike",
            license_plate: "BK-05-CF",
            max_weight_kg: 8.0,
            max_vol_m3: 0.04,
            insurance_expiry_date: "2027-11-30",
            inspection_expiry_date: "2027-11-30",
            insurance_expiry_doc: "bike_insurance.pdf",
            inspection_expiry_doc: "bike_inspection.pdf",
            approval_status: "Approved",
            approved_by: "Staff (staff@staff.demo)",
            doc_updated_at: "2026-10-20T09:45:00.000Z",
            created_at: "2026-10-19T16:10:00.000Z"
        },
        {
            id: "V-005",
            courier_id: "CR-003",
            submitted_by_courier_id: "CR-003",
            submitted_by_courier_name: "Daniel Santos",
            type_name: "Van",
            model: "Citroën Berlingo",
            license_plate: "AC-56-CF",
            max_weight_kg: 650,
            max_vol_m3: 3.3,
            insurance_expiry_date: "2026-11-28",
            inspection_expiry_date: "2027-08-22",
            insurance_expiry_doc: "berlingo_insurance.pdf",
            inspection_expiry_doc: "berlingo_inspection.pdf",
            approval_status: "Pending",
            approved_by: null,
            doc_updated_at: "2026-10-25T15:00:00.000Z",
            created_at: "2026-10-25T15:00:00.000Z"
        },
        {
            id: "V-006",
            courier_id: "CR-004",
            submitted_by_courier_id: "CR-004",
            submitted_by_courier_name: "Sofia Pereira",
            type_name: "Truck",
            model: "Fiat Fiorino",
            license_plate: "AD-78-CF",
            max_weight_kg: 1100,
            max_vol_m3: 5.2,
            insurance_expiry_date: "2026-04-10",
            inspection_expiry_date: "2026-05-01",
            insurance_expiry_doc: "fiorino_insurance_2025.pdf",
            inspection_expiry_doc: "fiorino_inspection_2025.pdf",
            approval_status: "Pending",
            approved_by: null,
            doc_updated_at: "2026-11-01T12:00:00.000Z",
            created_at: "2026-11-01T12:00:00.000Z"
        }
    ];
}

function getSharedVehicles() {
    try {
        const raw = localStorage.getItem("cms_vehicles");
        const seededFlag = localStorage.getItem("cms_vehicles_seeded_v4");
        if (!raw) {
            const initial = defaultSeedVehicles();
            localStorage.setItem("cms_vehicles", JSON.stringify(initial));
            localStorage.setItem("cms_vehicles_seeded_v4", "1");
            return initial;
        }
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : [];
        let changed = false;
        list.forEach(function(v) {
            const normType = normalizeVehicleType(v.type_name);
            if (v.type_name !== normType) {
                v.type_name = normType;
                changed = true;
            }
        });
        if (!seededFlag) {
            const defaults = defaultSeedVehicles();
            const existingPlates = new Set(list.map(function(v) {
                return (v.license_plate || "").toUpperCase();
            }));
            defaults.forEach(function(d) {
                if (!existingPlates.has(d.license_plate.toUpperCase())) {
                    list.push(d);
                    changed = true;
                }
            });
            localStorage.setItem("cms_vehicles_seeded_v4", "1");
            changed = true;
        }
        if (changed) {
            localStorage.setItem("cms_vehicles", JSON.stringify(list));
        }
        return list;
    } catch {
        return defaultSeedVehicles();
    }
}

function saveSharedVehicles(list) {
    try {
        localStorage.setItem("cms_vehicles", JSON.stringify(list));
        return true;
    } catch {
        return false;
    }
}

function normalizeProduct(p) {
    const desc = String(p?.description || p?.name || "Parcel item").trim();
    const cat = String(p?.category || "other").trim().toLowerCase();
    const w = Number(p?.weight_kg ?? p?.weight ?? 0.5) || 0.5;
    const v = Number(p?.volume_m3 ?? p?.volume ?? 0.002) || 0.002;
    const ts = p?.created_at || p?.createdAt || "2026-10-20T09:00:00.000Z";
    const generatedId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : ("PROD-" + Date.now() + "-" + Math.floor(Math.random() * 10000));
    return {
        id: p?.id || generatedId,
        description: desc,
        name: desc,
        category: cat,
        weight_kg: w,
        volume_m3: v,
        weight: w,
        volume: v,
        created_at: ts,
        createdAt: ts
    };
}

function defaultSeedProducts() {
    return [
        normalizeProduct({
            id: "PROD-001",
            description: "Workstation Monitor & Dock",
            category: "electronics",
            weight_kg: 2.5,
            volume_m3: 0.002,
            created_at: "2026-10-20T09:00:00.000Z"
        }),
        normalizeProduct({
            id: "PROD-002",
            description: "Legal Contract Folder",
            category: "documents",
            weight_kg: 0.3,
            volume_m3: 0.0005,
            created_at: "2026-10-21T10:30:00.000Z"
        })
    ];
}

function getSharedProducts() {
    try {
        const raw = localStorage.getItem("cms_products");
        const seededFlag = localStorage.getItem("cms_products_seeded_v4");
        if (!raw) {
            const initial = defaultSeedProducts();
            localStorage.setItem("cms_products", JSON.stringify(initial));
            localStorage.setItem("cms_products_seeded_v4", "1");
            return initial;
        }
        const parsed = JSON.parse(raw);
        let list = Array.isArray(parsed) ? parsed.map(normalizeProduct) : [];
        if (!list.length && !seededFlag) {
            list = defaultSeedProducts();
        }
        localStorage.setItem("cms_products_seeded_v4", "1");
        localStorage.setItem("cms_products", JSON.stringify(list));
        return list;
    } catch {
        return defaultSeedProducts();
    }
}

function saveSharedProducts(list) {
    try {
        const normalized = (Array.isArray(list) ? list : []).map(normalizeProduct);
        localStorage.setItem("cms_products", JSON.stringify(normalized));
        return true;
    } catch {
        return false;
    }
}

function normalizeOrderStatus(status) {
    const raw = String(status || "").trim();
    if (raw === "Initiated" || raw === "In Progress" || raw === "Completed" || raw === "Cancelled") {
        return raw;
    }
    const lower = raw.toLowerCase();
    if (lower === "available" || lower === "unassigned" || lower === "initiated") return "Initiated";
    if (lower === "accepted" || lower === "picked_up" || lower === "in progress") return "In Progress";
    if (lower === "delivered" || lower === "completed") return "Completed";
    if (lower === "cancelled" || lower === "canceled") return "Cancelled";
    return "Initiated";
}

function normalizeOrder(order) {
    const products = Array.isArray(order?.products) && order.products.length
        ? order.products.map(normalizeProduct)
        : [normalizeProduct({
            description: order?.item || "Parcel item",
            category: "other",
            weight_kg: order?.weight ?? 1.0,
            volume_m3: order?.volume ?? 0.002
        })];

    const totalWeight = Number(products.reduce(function(s, p) { return s + (Number(p.weight_kg) || 0); }, 0).toFixed(4));
    const totalVolume = Number(products.reduce(function(s, p) { return s + (Number(p.volume_m3) || 0); }, 0).toFixed(4));

    const originLat = Number(order?.origin_lat ?? (Array.isArray(order?.origin) ? order.origin[0] : order?.pickup?.coords?.[0]) ?? 41.1463);
    const originLong = Number(order?.origin_long ?? (Array.isArray(order?.origin) ? order.origin[1] : order?.pickup?.coords?.[1]) ?? -8.6110);
    const destLat = Number(order?.dest_lat ?? (Array.isArray(order?.destination) ? order.destination[0] : order?.drop?.coords?.[0]) ?? 41.1405);
    const destLong = Number(order?.dest_long ?? (Array.isArray(order?.destination) ? order.destination[1] : order?.drop?.coords?.[1]) ?? -8.6130);

    const status = normalizeOrderStatus(order?.status);
    const attempt = Math.max(1, Number(order?.attempt) || 1);
    const createdAt = order?.created_at || order?.createdAt || "2026-10-25T08:00:00.000Z";
    const id = String(order?.id || order?.code || ("CF-" + Math.floor(1050 + Math.random() * 8900)));

    const pickup = order?.pickup && typeof order.pickup === "object"
        ? {
            name: order.pickup.name || "Pickup Location",
            address: order.pickup.address || `GPS (${originLat}, ${originLong})`,
            contact: order.pickup.contact || "Client pickup",
            coords: [originLat, originLong]
        }
        : {
            name: "Client Pickup",
            address: typeof order?.origin === "string" ? order.origin : `Porto (${originLat}, ${originLong})`,
            contact: "Client · Pickup point",
            coords: [originLat, originLong]
        };

    const drop = order?.drop && typeof order.drop === "object"
        ? {
            name: order.drop.name || "Delivery Location",
            address: order.drop.address || `GPS (${destLat}, ${destLong})`,
            contact: order.drop.contact || "Recipient",
            coords: [destLat, destLong]
        }
        : {
            name: "Client Delivery",
            address: typeof order?.destination === "string" ? order.destination : `Porto (${destLat}, ${destLong})`,
            contact: "Recipient · Delivery point",
            coords: [destLat, destLong]
        };

    const itemSummary = order?.item || (products.length === 1
        ? products[0].description
        : `${products[0].description} (+${products.length - 1} more)`);

    const fee = Number(order?.fee) > 0
        ? Number(order.fee)
        : Number((6.5 + totalWeight * 1.2).toFixed(2));

    const events = Array.isArray(order?.events) && order.events.length
        ? order.events.map(function(ev) {
            return {
                status: normalizeOrderStatus(ev.status),
                at: ev.at || createdAt,
                attempt: ev.attempt || 1,
                signature: ev.signature || null
            };
        })
        : [{ status: status, at: createdAt, attempt: attempt, signature: null }];

    return {
        id: id,
        code: id,
        origin_lat: originLat,
        origin_long: originLong,
        dest_lat: destLat,
        dest_long: destLong,
        origin: [originLat, originLong],
        destination: [destLat, destLong],
        pickup: pickup,
        drop: drop,
        products: products,
        item: itemSummary,
        weight: totalWeight,
        volume: totalVolume,
        fee: fee,
        status: status,
        attempt: attempt,
        created_at: createdAt,
        createdAt: createdAt,
        events: events,
        signature: order?.signature || null,
        routeAssignment: order?.routeAssignment || null,
        note: order?.note || "Standard parcel handling. Verify recipient at drop-off.",
        window: order?.window || "Delivery window: 09:00–18:00"
    };
}

function defaultRouteAssignments() {
    return {
        "CF-1044": {
            order_id: "CF-1044",
            vehicle_id: "V-001",
            used_by_courier_id: "CR-001",
            used_by_courier_name: "Alex Silva",
            status: "In Progress",
            assigned_at: "2026-10-25T09:00:00.000Z"
        },
        "CF-1036": {
            order_id: "CF-1036",
            vehicle_id: "V-001",
            used_by_courier_id: "CR-003",
            used_by_courier_name: "Daniel Santos",
            status: "Completed",
            assigned_at: "2026-10-24T10:00:00.000Z"
        }
    };
}

function defaultSeedOrders() {
    return [
        normalizeOrder({
            id: "CF-1041",
            item: "Documents",
            fee: 7.50,
            origin_lat: 41.1463,
            origin_long: -8.6110,
            dest_lat: 41.1405,
            dest_long: -8.6130,
            pickup: {
                name: "Central Studio",
                address: "Praça da Liberdade, Porto",
                contact: "Alex · reception desk",
                coords: [41.1463, -8.6110]
            },
            drop: {
                name: "Riverside Office",
                address: "Praça da Ribeira, Porto",
                contact: "Sam · main entrance",
                coords: [41.1405, -8.6130]
            },
            products: [
                { description: "Legal contract folder", category: "documents", weight_kg: 0.2, volume_m3: 0.0003, created_at: "2026-10-25T08:00:00.000Z" },
                { description: "Notary dossier", category: "documents", weight_kg: 0.1, volume_m3: 0.0002, created_at: "2026-10-25T08:00:00.000Z" }
            ],
            status: "Initiated",
            attempt: 1,
            created_at: "2026-10-25T08:00:00.000Z",
            events: [
                { status: "Initiated", at: "2026-10-25T08:00:00.000Z", attempt: 1 }
            ],
            note: "Keep the envelope flat. Hand it to reception.",
            window: "Delivery window: 09:00–18:00"
        }),
        normalizeOrder({
            id: "CF-1042",
            item: "Clothing",
            fee: 9.20,
            origin_lat: 41.1510,
            origin_long: -8.6053,
            dest_lat: 41.1478,
            dest_long: -8.6243,
            pickup: {
                name: "North Boutique",
                address: "Rua de Santa Catarina, Porto",
                contact: "Taylor · collection desk",
                coords: [41.1510, -8.6053]
            },
            drop: {
                name: "Garden Residence",
                address: "Rua de Dom Manuel II, Porto",
                contact: "Morgan · lobby",
                coords: [41.1478, -8.6243]
            },
            products: [
                { description: "Winter coat", category: "clothing", weight_kg: 0.8, volume_m3: 0.0025, created_at: "2026-10-25T08:15:00.000Z" },
                { description: "Apparel box", category: "clothing", weight_kg: 0.4, volume_m3: 0.0010, created_at: "2026-10-25T08:15:00.000Z" }
            ],
            status: "Initiated",
            attempt: 1,
            created_at: "2026-10-25T08:15:00.000Z",
            events: [
                { status: "Initiated", at: "2026-10-25T08:15:00.000Z", attempt: 1 }
            ],
            note: "Two sealed bags. Ask for the recipient at the lobby.",
            window: "Delivery window: 10:00–18:00"
        }),
        normalizeOrder({
            id: "CF-1043",
            item: "Electronics",
            fee: 12.80,
            origin_lat: 41.1581,
            origin_long: -8.6291,
            dest_lat: 41.1500,
            dest_long: -8.6108,
            pickup: {
                name: "Tech Workshop",
                address: "Praça de Mouzinho de Albuquerque, Porto",
                contact: "Casey · service counter",
                coords: [41.1581, -8.6291]
            },
            drop: {
                name: "Creative Office",
                address: "Avenida dos Aliados, Porto",
                contact: "Jordan · reception",
                coords: [41.1500, -8.6108]
            },
            products: [
                { description: "Workstation monitor", category: "electronics", weight_kg: 2.0, volume_m3: 0.0015, created_at: "2026-10-25T08:25:00.000Z" },
                { description: "Docking station", category: "electronics", weight_kg: 0.5, volume_m3: 0.0005, created_at: "2026-10-25T08:25:00.000Z" }
            ],
            status: "Initiated",
            attempt: 1,
            created_at: "2026-10-25T08:25:00.000Z",
            events: [
                { status: "Initiated", at: "2026-10-25T08:25:00.000Z", attempt: 1 }
            ],
            note: "Fragile package. Keep upright and avoid stacking.",
            window: "Delivery window: 09:00–17:00"
        }),
        normalizeOrder({
            id: "CF-1039",
            item: "Art supplies",
            fee: 8.40,
            origin_lat: 41.1538,
            origin_long: -8.6178,
            dest_lat: 41.1493,
            dest_long: -8.6202,
            pickup: {
                name: "Art Supply Store",
                address: "Rua de Cedofeita, Porto",
                contact: "Riley · counter",
                coords: [41.1538, -8.6178]
            },
            drop: {
                name: "Design Studio",
                address: "Rua de Miguel Bombarda, Porto",
                contact: "Quinn · studio entrance",
                coords: [41.1493, -8.6202]
            },
            products: [
                { description: "Canvas & acrylic set", category: "other", weight_kg: 0.8, volume_m3: 0.0015, created_at: "2026-10-25T08:30:00.000Z" }
            ],
            status: "Initiated",
            attempt: 2,
            created_at: "2026-10-25T08:30:00.000Z",
            events: [
                { status: "Initiated", at: "2026-10-25T08:30:00.000Z", attempt: 1 },
                { status: "In Progress", at: "2026-10-25T08:40:00.000Z", attempt: 1 },
                { status: "Cancelled", at: "2026-10-25T08:50:00.000Z", attempt: 1 },
                { status: "Initiated", at: "2026-10-25T08:50:00.000Z", attempt: 2 }
            ],
            note: "Deliver the sealed package to the studio entrance.",
            window: "Delivery window: 09:00–18:00"
        }),
        normalizeOrder({
            id: "CF-1044",
            item: "Books",
            fee: 8.60,
            origin_lat: 41.1469,
            origin_long: -8.6149,
            dest_lat: 41.1496,
            dest_long: -8.5991,
            pickup: {
                name: "City Bookshop",
                address: "Rua das Carmelitas, Porto",
                contact: "Robin · front counter",
                coords: [41.1469, -8.6149]
            },
            drop: {
                name: "East Studio",
                address: "Campo 24 de Agosto, Porto",
                contact: "Drew · ground floor",
                coords: [41.1496, -8.5991]
            },
            products: [
                { description: "Hardcover textbooks (x3)", category: "books", weight_kg: 1.8, volume_m3: 0.004, created_at: "2026-10-25T08:45:00.000Z" }
            ],
            status: "In Progress",
            attempt: 1,
            created_at: "2026-10-25T08:45:00.000Z",
            routeAssignment: {
                order_id: "CF-1044",
                vehicle_id: "V-001",
                used_by_courier_id: "CR-001",
                used_by_courier_name: "Alex Silva",
                status: "In Progress",
                assigned_at: "2026-10-25T09:00:00.000Z"
            },
            events: [
                { status: "Initiated", at: "2026-10-25T08:45:00.000Z", attempt: 1 },
                { status: "In Progress", at: "2026-10-25T09:05:00.000Z", attempt: 1 }
            ],
            note: "One cardboard box. Collect from the front counter.",
            window: "Delivery window: 09:00–18:00"
        }),
        normalizeOrder({
            id: "CF-1036",
            item: "Documents",
            fee: 6.50,
            origin_lat: 41.1550,
            origin_long: -8.6283,
            dest_lat: 41.1523,
            dest_long: -8.6095,
            pickup: {
                name: "West Office",
                address: "Rua de Júlio Dinis, Porto",
                contact: "Avery · reception",
                coords: [41.1550, -8.6283]
            },
            drop: {
                name: "Central Office",
                address: "Praça da Trindade, Porto",
                contact: "Blake · reception",
                coords: [41.1523, -8.6095]
            },
            products: [
                { description: "Sealed archive envelope", category: "documents", weight_kg: 0.2, volume_m3: 0.0003, created_at: "2026-10-24T09:40:00.000Z" }
            ],
            status: "Completed",
            attempt: 1,
            created_at: "2026-10-24T09:40:00.000Z",
            routeAssignment: {
                order_id: "CF-1036",
                vehicle_id: "V-001",
                used_by_courier_id: "CR-003",
                used_by_courier_name: "Daniel Santos",
                status: "Completed",
                assigned_at: "2026-10-24T10:00:00.000Z"
            },
            events: [
                { status: "Initiated", at: "2026-10-24T09:40:00.000Z", attempt: 1 },
                { status: "In Progress", at: "2026-10-24T10:05:00.000Z", attempt: 1 },
                { status: "Completed", at: "2026-10-24T10:28:00.000Z", attempt: 1 }
            ],
            note: "Envelope delivered to reception.",
            window: "Delivery window: 09:00–18:00"
        })
    ];
}

function getSharedOrders() {
    try {
        const raw = localStorage.getItem("cms_orders");
        const seededFlag = localStorage.getItem("cms_orders_seeded_v4");
        if (!raw) {
            const initial = defaultSeedOrders();
            localStorage.setItem("cms_orders", JSON.stringify(initial));
            localStorage.setItem("cms_orders_seeded_v4", "1");
            return initial;
        }
        const parsed = JSON.parse(raw);
        let list = Array.isArray(parsed) ? parsed.map(normalizeOrder) : [];
        if (!seededFlag) {
            const defaults = defaultSeedOrders();
            const existingIds = new Set(list.map(function(o) { return o.id; }));
            defaults.forEach(function(d) {
                if (!existingIds.has(d.id)) {
                    list.push(d);
                }
            });
            localStorage.setItem("cms_orders_seeded_v4", "1");
        }
        // Enforce single active task constraint in case legacy data had multiple active orders
        let seenInProgress = false;
        list.forEach(function(o) {
            if (o.status === "In Progress") {
                if (seenInProgress) {
                    o.status = "Initiated";
                } else {
                    seenInProgress = true;
                }
            }
        });
        localStorage.setItem("cms_orders", JSON.stringify(list));
        return list;
    } catch {
        return defaultSeedOrders();
    }
}

function saveSharedOrders(list) {
    try {
        const normalized = (Array.isArray(list) ? list : []).map(normalizeOrder);
        localStorage.setItem("cms_orders", JSON.stringify(normalized));
        return true;
    } catch {
        return false;
    }
}



