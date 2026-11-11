
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

// Demo only: sessionStorage is not secure authentication.
const courierId =
    session && session.role === "courier"
        ? session.id
        : "demo-courier";

// =====================================
// STORAGE
// =====================================

function getVehicles() {
    try {
        const data = JSON.parse(
            localStorage.getItem(VEHICLE_KEY) || "[]"
        );

        return Array.isArray(data) ? data : [];
    } catch {
        return [];
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

    const vehicle = {
        id: crypto.randomUUID(),
        courier_id: courierId,

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
    const mine = vehicles.filter(
        vehicle => vehicle.courier_id === courierId
    );

    // Statistics

    document.getElementById("totalVehicles").textContent =
        mine.length;

    document.getElementById("approvedVehicles").textContent =
        mine.filter(v =>
            v.approval_status === "Approved" &&
            !isExpired(v.insurance_expiry_date) &&
            !isExpired(v.inspection_expiry_date)
        ).length;

    document.getElementById("pendingVehicles").textContent =
        mine.filter(v =>
            v.approval_status === "Pending"
        ).length;

    vehiclesList.replaceChildren();

    if (mine.length === 0) {
        const empty = document.createElement("p");
        empty.textContent =
            "No vehicles registered yet.";
        vehiclesList.appendChild(empty);
        return;
    }

    mine.forEach(function(vehicle) {

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
