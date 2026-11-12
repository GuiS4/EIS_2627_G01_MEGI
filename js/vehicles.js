
// =====================================
// COURIERFLOW - VEHICLES MANAGEMENT
// =====================================

"use strict";

const VEHICLE_KEY = "cms_vehicles";

const vehicleForm = document.getElementById("vehicleForm");
const vehiclesList = document.getElementById("vehiclesList");
const vehicleMessage = document.getElementById("vehicleMessage");

// Current demo user
const session = JSON.parse(
    sessionStorage.getItem("cms_current_user") || "null"
);

const DEMO_COURIERS = {
    "CR-001": "Alex Silva",
    "CR-002": "Maria Costa",
    "CR-003": "Daniel Santos",
    "CR-004": "Sofia Pereira"
};

function getActiveCourierIdentity() {
    if (session && session.role === "courier" && session.id) {
        return {
            id: session.id,
            name: session.name || "Courier"
        };
    }
    const storedDemoId = localStorage.getItem("courierflow.active_courier_id");
    if (storedDemoId && DEMO_COURIERS[storedDemoId]) {
        return {
            id: storedDemoId,
            name: DEMO_COURIERS[storedDemoId]
        };
    }
    return {
        id: "CR-001",
        name: "Alex Silva"
    };
}

// Demo only: sessionStorage is not secure authentication.
const activeCourier = getActiveCourierIdentity();
const courierId = activeCourier.id;
const courierName = activeCourier.name;

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
            approved_by: "Admin (admin@admin.demo)",
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
            approved_by: "Admin (admin@admin.demo)",
            doc_updated_at: "2026-10-16T11:30:00.000Z",
            created_at: "2026-10-12T14:20:00.000Z"
        },
        {
            id: "V-003",
            courier_id: "CR-001",
            submitted_by_courier_id: "CR-001",
            submitted_by_courier_name: "Alex Silva",
            type_name: "Motorcycle",
            model: "Honda PCX 125",
            license_plate: "MC-11-CF",
            max_weight_kg: 2.0,
            max_vol_m3: 0.003,
            insurance_expiry_date: "2027-05-12",
            inspection_expiry_date: "2027-04-18",
            insurance_expiry_doc: "pcx_insurance.pdf",
            inspection_expiry_doc: "pcx_inspection.pdf",
            approval_status: "Approved",
            approved_by: "Admin (admin@admin.demo)",
            doc_updated_at: "2026-10-18T08:15:00.000Z",
            created_at: "2026-10-18T08:00:00.000Z"
        },
        {
            id: "V-004",
            courier_id: "CR-002",
            submitted_by_courier_id: "CR-002",
            submitted_by_courier_name: "Maria Costa",
            type_name: "Bicycle",
            model: "Urban Cargo Bike",
            license_plate: "BK-05-CF",
            max_weight_kg: 1.0,
            max_vol_m3: 0.0018,
            insurance_expiry_date: "2027-11-30",
            inspection_expiry_date: "2027-11-30",
            insurance_expiry_doc: "bike_insurance.pdf",
            inspection_expiry_doc: "bike_inspection.pdf",
            approval_status: "Approved",
            approved_by: "Admin (admin@admin.demo)",
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
            insurance_expiry_date: "2027-10-01",
            inspection_expiry_date: "2027-08-22",
            insurance_expiry_doc: "berlingo_insurance.pdf",
            inspection_expiry_doc: "berlingo_inspection.pdf",
            approval_status: "Pending",
            approved_by: null,
            doc_updated_at: "2026-10-25T15:00:00.000Z",
            created_at: "2026-10-25T15:00:00.000Z"
        }
    ];
}

function resolveSubmitterName(vehicle) {
    if (vehicle.submitted_by_courier_name) return vehicle.submitted_by_courier_name;
    const subId = vehicle.submitted_by_courier_id || vehicle.courier_id;
    if (subId && DEMO_COURIERS[subId]) return DEMO_COURIERS[subId];
    try {
        const users = JSON.parse(localStorage.getItem("cms_users") || "[]");
        const found = users.find(u => u.id === subId);
        if (found && found.name) return found.name;
    } catch { /* ignore */ }
    return subId === "demo-courier" ? "Alex Silva" : (subId || "Unknown Courier");
}

// =====================================
// STORAGE
// =====================================

function getVehicles() {
    try {
        const raw = localStorage.getItem(VEHICLE_KEY);
        const seededFlag = localStorage.getItem("cms_vehicles_seeded_v2");
        if (!raw) {
            const initial = defaultSeedVehicles();
            localStorage.setItem(VEHICLE_KEY, JSON.stringify(initial));
            localStorage.setItem("cms_vehicles_seeded_v2", "1");
            return initial;
        }
        const data = JSON.parse(raw);
        const list = Array.isArray(data) ? data : [];
        if (!seededFlag) {
            const defaults = defaultSeedVehicles();
            const existingPlates = new Set(list.map(v => (v.license_plate || "").toUpperCase()));
            defaults.forEach(d => {
                if (!existingPlates.has(d.license_plate.toUpperCase())) {
                    list.push(d);
                }
            });
            localStorage.setItem(VEHICLE_KEY, JSON.stringify(list));
            localStorage.setItem("cms_vehicles_seeded_v2", "1");
        }
        return list;
    } catch {
        return defaultSeedVehicles();
    }
}

function saveVehicles(vehicles) {
    localStorage.setItem(
        VEHICLE_KEY,
        JSON.stringify(vehicles)
    );
}

// =====================================
// DATE VALIDATION
// =====================================

function todayISO() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isExpired(dateString) {
    return !dateString || dateString < todayISO();
}

// =====================================
// MESSAGE
// =====================================

function showVehicleMessage(message, type) {
    vehicleMessage.textContent = message;
    vehicleMessage.className =
        "vehicle-message " + type;
}

// =====================================
// VEHICLE REGISTRATION
// =====================================

vehicleForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const type = document.getElementById("vehicleType").value;

    const model = document.getElementById("vehicleModel").value.trim();

    const plate = document.getElementById("licensePlate")
        .value.trim().toUpperCase();

    const weightRaw = document.getElementById("maxWeight").value;
    const volumeRaw = document.getElementById("maxVolume").value;

    const weight = Number(weightRaw);
    const volume = Number(volumeRaw);

    const insuranceExpiry =
        document.getElementById("insuranceExpiry").value;

    const inspectionExpiry =
        document.getElementById("inspectionExpiry").value;

    const insuranceFile =
        document.getElementById("insuranceDoc").files[0];

    const inspectionFile =
        document.getElementById("inspectionDoc").files[0];

    // Required text fields

    if (!type || !model || !plate) {
        showVehicleMessage(
            "Please complete all vehicle information.",
            "error"
        );
        return;
    }

    // Capacity validation

    if (
        weightRaw === "" ||
        volumeRaw === "" ||
        !Number.isFinite(weight) ||
        !Number.isFinite(volume) ||
        weight <= 0 ||
        volume <= 0
    ) {
        showVehicleMessage(
            "Weight and volume must be positive numbers.",
            "error"
        );
        return;
    }

    // Document validation

    if (!insuranceExpiry || !inspectionExpiry) {
        showVehicleMessage(
            "Please enter both document expiry dates.",
            "error"
        );
        return;
    }

    if (!insuranceFile || !inspectionFile) {
        showVehicleMessage(
            "Please select both certificates.",
            "error"
        );
        return;
    }

    // Document file type validation

    const allowedExtensions = /\.(pdf|png|jpe?g)$/i;

    if (
        !allowedExtensions.test(insuranceFile.name) ||
        !allowedExtensions.test(inspectionFile.name)
    ) {
        showVehicleMessage(
            "Certificates must be PDF, JPG or PNG files.",
            "error"
        );
        return;
    }

    // An expired certificate cannot be approved.
    // It can still be registered and flagged for correction.

    const vehicles = getVehicles();

    // Prevent duplicate license plates

    if (vehicles.some(v => v.license_plate === plate)) {
        showVehicleMessage(
            "This license plate is already registered.",
            "error"
        );
        return;
    }

    // Create vehicle object matching the ER model

    const currentIdentity = getActiveCourierIdentity();

    const vehicle = {
        id: crypto.randomUUID(),
        courier_id: currentIdentity.id,
        submitted_by_courier_id: currentIdentity.id,
        submitted_by_courier_name: currentIdentity.name,

        type_name: type,
        model: model,
        license_plate: plate,

        max_weight_kg: weight,
        max_vol_m3: volume,

        insurance_expiry_date: insuranceExpiry,
        inspection_expiry_date: inspectionExpiry,

        // Demo only: filenames, not uploaded files
        insurance_expiry_doc: insuranceFile.name,
        inspection_expiry_doc: inspectionFile.name,

        approval_status: "Pending",
        approved_by: null,

        doc_updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
    };

    vehicles.push(vehicle);

    try {
        saveVehicles(vehicles);
    } catch {
        showVehicleMessage(
            "Unable to save vehicle in browser storage.",
            "error"
        );
        return;
    }

    vehicleForm.reset();

    showVehicleMessage(
        "Vehicle registered. Pending staff approval.",
        "success"
    );

    renderVehicles();
});

// =====================================
// VEHICLE LIST
// =====================================

function renderVehicles() {

    const vehicles = getVehicles();

    // Statistics

    document.getElementById("totalVehicles").textContent =
        vehicles.length;

    document.getElementById("approvedVehicles").textContent =
        vehicles.filter(v =>
            v.approval_status === "Approved" &&
            !isExpired(v.insurance_expiry_date) &&
            !isExpired(v.inspection_expiry_date)
        ).length;

    document.getElementById("pendingVehicles").textContent =
        vehicles.filter(v =>
            v.approval_status === "Pending"
        ).length;

    vehiclesList.replaceChildren();

    if (vehicles.length === 0) {
        const empty = document.createElement("p");
        empty.textContent =
            "No vehicles registered yet.";
        vehiclesList.appendChild(empty);
        return;
    }

    vehicles.forEach(function(vehicle) {

        const card = document.createElement("article");
        card.className = "registered-vehicle";

        // Header

        const header = document.createElement("div");
        header.className = "vehicle-card-header";

        const info = document.createElement("div");

        const title = document.createElement("h3");
        title.textContent = vehicle.model;

        const plate = document.createElement("p");
        plate.className = "vehicle-plate";

        plate.textContent =
            vehicle.license_plate + " · " + vehicle.type_name;

        info.append(title, plate);

        const status = document.createElement("span");
        status.className =
            "vehicle-status " +
            vehicle.approval_status.toLowerCase();

        status.textContent = vehicle.approval_status;

        header.append(info, status);

        // Details

        const details = document.createElement("div");
        details.className = "vehicle-info";

        const fields = [
            ["Submitted By", resolveSubmitterName(vehicle)],
            ["Max Weight", vehicle.max_weight_kg + " kg"],
            ["Max Volume", vehicle.max_vol_m3 + " m³"],
            ["Insurance Expiry", vehicle.insurance_expiry_date],
            ["Inspection Expiry", vehicle.inspection_expiry_date],
            ["Insurance File", vehicle.insurance_expiry_doc],
            ["Inspection File", vehicle.inspection_expiry_doc]
        ];

        if (vehicle.approved_by) {
            fields.push(["Reviewed By", vehicle.approved_by]);
        }

        fields.forEach(function(field) {

            const wrapper = document.createElement("div");

            const label = document.createElement("span");
            label.textContent = field[0];

            const value = document.createElement("strong");
            value.textContent = field[1];

            wrapper.append(label, value);
            details.appendChild(wrapper);
        });

        // Document validity

        const expired =
            isExpired(vehicle.insurance_expiry_date) ||
            isExpired(vehicle.inspection_expiry_date);

        const warning = document.createElement("p");

        warning.className =
            expired ? "document-warning" : "document-valid";

        warning.textContent = expired
            ? "Document expired: vehicle unavailable for allocation."
            : "Documents are within their validity dates.";

        // Delete action - for the prototype

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "vehicle-delete";
        deleteButton.textContent = "Delete Vehicle";

        deleteButton.addEventListener("click", function() {

            if (!confirm("Delete this vehicle?")) {
                return;
            }

            const updated = getVehicles().filter(
                v => v.id !== vehicle.id
            );

            try {
                saveVehicles(updated);
                renderVehicles();
            } catch {
                showVehicleMessage(
                    "Unable to delete vehicle.",
                    "error"
                );
            }
        });

        card.append(
            header,
            details,
            warning,
            deleteButton
        );

        vehiclesList.appendChild(card);
    });
}

// =====================================
// INITIALIZATION
// =====================================

renderVehicles();

// Refresh if another tab updates the vehicles
window.addEventListener("storage", function(event) {
    if (event.key === VEHICLE_KEY) {
        renderVehicles();
    }
});
