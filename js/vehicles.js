
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

function isSubmittedByCurrentCourier(vehicle) {
    const current = getActiveCourierIdentity();
    const submitterId = vehicle.submitted_by_courier_id || vehicle.courier_id;
    if (!submitterId) return false;
    if (submitterId === current.id) return true;
    if (current.id === "CR-001" && submitterId === "demo-courier") return true;
    return false;
}

// =====================================
// STORAGE (delegates to shared store in main.js)
// =====================================

function getVehicles() {
    return getSharedVehicles();
}

function saveVehicles(vehicles) {
    saveSharedVehicles(vehicles);
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

function formatDateDDMMYYYY(value) {
    if (!value) return "—";
    const str = String(value).trim();
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
    if (isoMatch) {
        return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    const dt = new Date(str);
    if (!Number.isFinite(dt.getTime())) return str;
    const pad = n => String(n).padStart(2, "0");
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
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
        const notifs = JSON.parse(localStorage.getItem("cms_staff_notifications") || "[]");
        notifs.unshift({
            id: `NOTIF-${Date.now()}`,
            type: isExpired(insuranceExpiry) || isExpired(inspectionExpiry) ? "expired" : "updated",
            title: `New Vehicle & Certificates Submitted · ${model} (${plate})`,
            message: `${currentIdentity.name} submitted ${model} (${plate}) with insurance (${insuranceFile.name}, exp. ${formatDateDDMMYYYY(insuranceExpiry)}) and inspection (${inspectionFile.name}, exp. ${formatDateDDMMYYYY(inspectionExpiry)}).`,
            vehicleId: vehicle.id,
            createdAt: new Date().toISOString(),
            read: false
        });
        localStorage.setItem("cms_staff_notifications", JSON.stringify(notifs));
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
// VEHICLE LIST (ACCORDION)
// =====================================

function renderVehicles() {

    const vehicles = getVehicles();

    vehiclesList.replaceChildren();

    if (vehicles.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No vehicles registered yet.";
        vehiclesList.appendChild(empty);
        return;
    }

    vehicles.forEach(function(vehicle) {

        const details = document.createElement("details");
        details.className = "vehicle-accordion-item";
        details.name = "vehicle-accordion";

        // Enforce only one open item at a time across all browsers
        details.addEventListener("toggle", function() {
            if (this.open) {
                vehiclesList.querySelectorAll("details.vehicle-accordion-item").forEach(function(other) {
                    if (other !== details && other.open) {
                        other.open = false;
                    }
                });
            }
        });

        // Summary row
        const summary = document.createElement("summary");
        summary.className = "vehicle-accordion-summary";

        // Summary Left
        const summaryLeft = document.createElement("div");
        summaryLeft.className = "vehicle-summary-left";

        const chevron = document.createElement("span");
        chevron.className = "vehicle-chevron";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "▸";

        const summaryText = document.createElement("div");
        summaryText.className = "vehicle-summary-text";

        const titleRow = document.createElement("div");
        titleRow.className = "vehicle-title-row";

        const title = document.createElement("h3");
        title.className = "vehicle-summary-title";
        title.textContent = vehicle.model;

        const plate = document.createElement("span");
        plate.className = "vehicle-summary-plate";
        plate.textContent = vehicle.license_plate;

        const typeBadge = document.createElement("span");
        typeBadge.className = "vehicle-summary-type";
        typeBadge.textContent = vehicle.type_name;

        titleRow.append(title, plate, typeBadge);

        const sub = document.createElement("p");
        sub.className = "vehicle-summary-sub";

        const submitterLabel = document.createElement("span");
        submitterLabel.textContent = "Submitted by ";
        const submitterName = document.createElement("strong");
        submitterName.textContent = resolveSubmitterName(vehicle);

        const dot = document.createElement("span");
        dot.textContent = " · ";

        const capacitySpan = document.createElement("span");
        capacitySpan.textContent = `${vehicle.max_weight_kg} kg · ${vehicle.max_vol_m3} m³`;

        sub.append(submitterLabel, submitterName, dot, capacitySpan);

        summaryText.append(titleRow, sub);
        summaryLeft.append(chevron, summaryText);

        // Summary Right (Approval Status badge)
        const summaryRight = document.createElement("div");
        summaryRight.className = "vehicle-summary-right";

        const status = document.createElement("span");
        status.className =
            "vehicle-status " +
            (vehicle.approval_status || "pending").toLowerCase();
        status.textContent = vehicle.approval_status;

        summaryRight.appendChild(status);
        summary.append(summaryLeft, summaryRight);

        // Accordion Body
        const body = document.createElement("div");
        body.className = "vehicle-accordion-body";

        // Detailed fields grid
        const infoGrid = document.createElement("div");
        infoGrid.className = "vehicle-info";

        const fields = [
            ["Submitted By", resolveSubmitterName(vehicle)],
            ["Vehicle Type", vehicle.type_name],
            ["License Plate", vehicle.license_plate],
            ["Max Weight", vehicle.max_weight_kg + " kg"],
            ["Max Volume", vehicle.max_vol_m3 + " m³"],
            ["Insurance Expiry", formatDateDDMMYYYY(vehicle.insurance_expiry_date)],
            ["Inspection Expiry", formatDateDDMMYYYY(vehicle.inspection_expiry_date)],
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
            infoGrid.appendChild(wrapper);
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

        // Delete action - only allowed for the courier who submitted the vehicle
        const isOwner = isSubmittedByCurrentCourier(vehicle);
        const actionsRow = document.createElement("div");
        actionsRow.className = "vehicle-accordion-actions";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "vehicle-delete";
        deleteButton.textContent = "Delete Vehicle";
        deleteButton.disabled = !isOwner;
        if (!isOwner) {
            deleteButton.title = "Only the courier who submitted this vehicle can delete it.";
        }

        deleteButton.addEventListener("click", function(event) {
            event.stopPropagation();

            if (!isSubmittedByCurrentCourier(vehicle)) {
                return;
            }

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

        actionsRow.appendChild(deleteButton);

        body.append(infoGrid, warning, actionsRow);

        details.append(summary, body);
        vehiclesList.appendChild(details);
    });
}

// =====================================
// SIDEBAR COUNTS & DEMO RESET SYNC
// =====================================

const ORDERS_KEY = "cms_orders";

function syncCourierSidebarCounts() {
    const availEl = document.getElementById("availableCount");
    const activeEl = document.getElementById("activeCount");
    if (!availEl && !activeEl) return;

    const orders = getSharedOrders();
    const availCount = orders.filter(function(order) {
        return order && order.status === "Initiated";
    }).length;
    const activeCount = orders.filter(function(order) {
        return order && order.status === "In Progress";
    }).length;

    if (availEl) availEl.textContent = String(availCount);
    if (activeEl) activeEl.textContent = String(activeCount);
}

const resetDemoBtn = document.getElementById("resetDemo");
if (resetDemoBtn) {
    resetDemoBtn.addEventListener("click", function() {
        if (!confirm("Reset demo data?\nThis restores shared vehicles, orders, and route assignments in this browser to the original sample dataset.")) {
            return;
        }
        saveVehicles(defaultSeedVehicles());
        localStorage.setItem("cms_vehicles_seeded_v4", "1");
        saveSharedOrders(defaultSeedOrders());
        localStorage.setItem("cms_orders_seeded_v4", "1");
        localStorage.setItem("cms_route_assignments", JSON.stringify(defaultRouteAssignments()));
        syncCourierSidebarCounts();
        renderVehicles();
        showVehicleMessage("Demo data has been reset.", "success");
    });
}

function renderCourierHeaderIdentity() {
    const active = getActiveCourierIdentity();
    const label = document.getElementById("courierWorkspaceLabel");
    const avatar = document.getElementById("courierAvatar");
    if (label) {
        label.textContent = `Courier · ${active.name}`;
    }
    if (avatar) {
        const initials = (active.name || "CR")
            .trim()
            .split(/\s+/)
            .map(w => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
        avatar.textContent = initials || "CR";
    }
}

// =====================================
// INITIALIZATION
// =====================================

renderCourierHeaderIdentity();
syncCourierSidebarCounts();
renderVehicles();

// Refresh if another tab updates the vehicles or shared orders state
window.addEventListener("storage", function(event) {
    if (event.key === VEHICLE_KEY || event.key === null) {
        renderVehicles();
    }
    if (event.key === ORDERS_KEY || event.key === null) {
        syncCourierSidebarCounts();
    }
});
