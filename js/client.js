// =====================================
// COURIERFLOW - CLIENT PAGE
// Products, order creation (Leaflet + OpenStreetMap) and order tracking.
// Demo only: data is kept in this browser's localStorage.
// =====================================

(() => {
    "use strict";

    const PRODUCTS_KEY = "cms_products";
    const ORDERS_KEY = "cms_orders";

    // Initial map position: FEUP, Porto
    const DEFAULT_CENTER = [41.1780, -8.5980];

    const ACTIVE_STATUSES = ["Initiated", "In Progress"];
    const HISTORY_STATUSES = ["Completed", "Cancelled"];

    const STATUS_CLASS = {
        "Initiated": "status-available",
        "In Progress": "status-picked_up",
        "Completed": "status-delivered",
        "Cancelled": "status-cancelled"
    };

    const CATEGORY_LABELS = {
        electronics: "Electronics",
        clothing: "Clothing",
        documents: "Documents",
        books: "Books",
        other: "Other"
    };

    const $ = id => document.getElementById(id);

    const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[ch]));

    // =====================================
    // STORAGE (uses shared stores in main.js)
    // =====================================

    let products = getSharedProducts();
    let orders = getSharedOrders();

    function saveData() {
        if (!saveSharedProducts(products) || !saveSharedOrders(orders)) {
            toast("Unable to save data in this browser.");
        }
        products = getSharedProducts();
        orders = getSharedOrders();
    }

    // =====================================
    // HELPERS
    // =====================================

    let toastTimer = null;

    function toast(message) {
        const el = $("toast");
        if (!el) return;
        el.textContent = message;
        el.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
    }

    function setError(inputId, errorId, message) {
        $(errorId).textContent = message;
        $(inputId).classList.add("input-error");
    }

    function clearError(inputId, errorId) {
        $(errorId).textContent = "";
        $(inputId).classList.remove("input-error");
    }

    function formatDate(iso) {
        const dt = new Date(iso);
        if (!Number.isFinite(dt.getTime())) return String(iso || "");
        const pad = n => String(n).padStart(2, "0");
        return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}, ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }

    function formatNumber(value) {
        return String(Number((Number(value) || 0).toFixed(4)));
    }

    function formatCoords(point) {
        return Array.isArray(point) ? point.join(", ") : "—";
    }

    function totalsOf(list) {
        return list.reduce((sum, p) => ({
            weight: sum.weight + (Number(p.weight_kg ?? p.weight) || 0),
            volume: sum.volume + (Number(p.volume_m3 ?? p.volume) || 0)
        }), { weight: 0, volume: 0 });
    }

    // =====================================
    // HEADER IDENTITY
    // =====================================

    function renderHeaderIdentity() {
        try {
            const user = JSON.parse(sessionStorage.getItem("cms_current_user") || "null");
            const name = user && (user.name || user.fullName || user.email);
            if (!name) return;

            $("clientWorkspaceLabel").textContent = `Client · ${name}`;

            const initials = name.trim().split(/\s+/)
                .map(w => w[0]).slice(0, 2).join("").toUpperCase();
            $("clientAvatar").textContent = initials || "CL";
        } catch {
            /* keep defaults */
        }
    }

    // =====================================
    // PRODUCTS
    // =====================================

    $("productForm").addEventListener("submit", event => {
        event.preventDefault();

        const description = $("productDescription").value.trim();
        const category = $("productCategory").value;
        const weightValue = $("productWeight").value.trim();
        const volumeValue = $("productVolume").value.trim();
        const weight = Number(weightValue);
        const volume = Number(volumeValue);

        [
            ["productDescription", "productDescriptionError"],
            ["productCategory", "productCategoryError"],
            ["productWeight", "productWeightError"],
            ["productVolume", "productVolumeError"]
        ].forEach(([input, error]) => clearError(input, error));

        let valid = true;

        if (description === "") {
            setError("productDescription", "productDescriptionError", "Description is required.");
            valid = false;
        }

        if (!CATEGORY_LABELS[category]) {
            setError("productCategory", "productCategoryError", "Select a category.");
            valid = false;
        }

        if (weightValue === "" || !Number.isFinite(weight) || weight <= 0) {
            setError("productWeight", "productWeightError", "Enter a valid positive weight.");
            valid = false;
        }

        if (volumeValue === "" || !Number.isFinite(volume) || volume <= 0) {
            setError("productVolume", "productVolumeError", "Enter a valid positive volume.");
            valid = false;
        }

        if (!valid) return;

        const nowIso = new Date().toISOString();
        products.push({
            id: crypto.randomUUID(),
            description,
            category,
            weight_kg: weight,
            volume_m3: volume,
            weight,
            volume,
            created_at: nowIso,
            createdAt: nowIso
        });

        saveData();
        $("productForm").reset();
        renderProducts();
        renderStats();
        toast(`Product "${description}" added.`);
    });

    function removeProduct(id) {
        products = products.filter(p => p.id !== id);
        saveData();
        renderProducts();
        renderStats();
    }

    function renderProducts() {
        // Registered products list
        const list = $("productsList");

        if (products.length === 0) {
            list.innerHTML = `<div class="empty-state"><strong>No products yet</strong>Add your first product using the form.</div>`;
        } else {
            list.innerHTML = products.map(p => `
                <div class="client-product-row">
                    <div>
                        <strong>${esc(p.description)}</strong>
                        <span class="history-item-tag">${esc(CATEGORY_LABELS[p.category] || "Other")} · ${formatNumber(p.weight)} kg · ${formatNumber(p.volume)} m³</span>
                    </div>
                    <button type="button" class="btn btn-outline client-remove" data-remove="${esc(p.id)}" aria-label="Remove ${esc(p.description)}">Remove</button>
                </div>`).join("");
        }

        // Product selection inside the order form (keep current selection)
        const selection = $("productSelection");
        const checked = new Set(
            Array.from(selection.querySelectorAll('input[name="selectedProducts"]:checked'))
                .map(input => input.value)
        );

        if (products.length === 0) {
            selection.innerHTML = "<p>No products available. Register a product first.</p>";
            updateProductDropdownLabel();
            return;
        }

        selection.innerHTML = products.map(p => `
            <label class="product-option">
                <input type="checkbox" name="selectedProducts" value="${esc(p.id)}" ${checked.has(p.id) ? "checked" : ""}>
                <span>${esc(p.description)} <small>· ${esc(CATEGORY_LABELS[p.category] || "Other")} · ${formatNumber(p.weight)} kg · ${formatNumber(p.volume)} m³</small></span>
            </label>`).join("");

        updateProductDropdownLabel();
    }

    // Dropdown summary text: reflects the current selection
    function updateProductDropdownLabel() {
        const label = $("productDropdownLabel");
        if (!label) return;

        const selected = Array.from(
            $("productSelection").querySelectorAll('input[name="selectedProducts"]:checked'),
            input => input.value
        );

        if (products.length === 0) {
            label.textContent = "No products available";
        } else if (selected.length === 0) {
            label.textContent = "Select products";
        } else if (selected.length === 1) {
            const product = products.find(p => p.id === selected[0]);
            label.textContent = product ? product.description : "1 product selected";
        } else {
            label.textContent = `${selected.length} products selected`;
        }
    }

    $("productSelection").addEventListener("change", () => {
        $("orderProductsError").textContent = "";
        updateProductDropdownLabel();
    });

    // Close the dropdown when clicking outside of it or pressing Escape
    document.addEventListener("click", event => {
        const dropdown = $("productDropdown");
        if (dropdown.open && !dropdown.contains(event.target)) {
            dropdown.open = false;
        }
    });

    $("productDropdown").addEventListener("keydown", event => {
        if (event.key === "Escape") {
            $("productDropdown").open = false;
            $("productDropdownLabel").focus();
        }
    });

    $("productsList").addEventListener("click", event => {
        const button = event.target.closest("[data-remove]");
        if (button) removeProduct(button.dataset.remove);
    });

    // =====================================
    // LEAFLET MAP (OpenStreetMap)
    // =====================================

    const DEFAULT_MAP_MESSAGE = "Enter pickup and delivery coordinates to preview the route.";

    let map = null;
    let markerLayer = null;
    let routeLayer = null;
    let placeholderMarker = null;
    let routeToken = 0;
    let routeBounds = null;

    function pin(label, dropoff) {
        return L.divIcon({
            className: `map-pin ${dropoff ? "dropoff" : ""}`,
            html: label,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
    }

    function initMap() {
        const container = $("orderMap");

        if (typeof L === "undefined") {
            container.classList.add("map-unavailable");
            container.textContent = "The map could not be loaded. Check your internet connection and reload the page.";
            $("mapMessage").textContent = "Map library unavailable.";
            return;
        }

        map = L.map(container).setView(DEFAULT_CENTER, 12);

        const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
        }).addTo(map);

        let tileWarningShown = false;
        tiles.on("tileerror", () => {
            if (tileWarningShown) return;
            tileWarningShown = true;
            $("mapMessage").textContent = "Some map tiles could not be loaded. Check your internet connection.";
        });

        markerLayer = L.layerGroup().addTo(map);
        routeLayer = L.layerGroup().addTo(map);

        placeholderMarker = L.marker(DEFAULT_CENTER, { title: "FEUP, Porto" })
            .bindPopup("FEUP · Porto<br>Enter coordinates to place your pickup and delivery points.")
            .addTo(markerLayer);

        $("mapMessage").textContent = DEFAULT_MAP_MESSAGE;

        // The map sits in a flex/sticky card: make sure Leaflet knows its real size.
        requestAnimationFrame(() => map.invalidateSize());
        window.addEventListener("load", () => map.invalidateSize());
        window.addEventListener("resize", () => map.invalidateSize());
    }

    // Silent read used for the live preview (no error messages).
    function peekPoint(latId, lngId) {
        const latRaw = $(latId).value.trim();
        const lngRaw = $(lngId).value.trim();
        if (latRaw === "" || lngRaw === "") return null;

        const lat = Number(latRaw);
        const lng = Number(lngRaw);

        if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
            lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return null;
        }
        return [lat, lng];
    }

    function updateMap() {
        if (!map) return;

        routeToken++;
        const token = routeToken;

        markerLayer.clearLayers();
        routeLayer.clearLayers();
        routeBounds = null;

        const origin = peekPoint("originLat", "originLng");
        const destination = peekPoint("destLat", "destLng");

        if (!origin && !destination) {
            placeholderMarker.addTo(markerLayer);
            map.setView(DEFAULT_CENTER, 12);
            $("mapMessage").textContent = DEFAULT_MAP_MESSAGE;
            return;
        }

        if (origin) {
            L.marker(origin, { icon: pin("A", false), title: "Pickup" })
                .bindPopup("Pickup location<br>" + origin.join(", "))
                .addTo(markerLayer);
        }

        if (destination) {
            L.marker(destination, { icon: pin("B", true), title: "Delivery" })
                .bindPopup("Delivery location<br>" + destination.join(", "))
                .addTo(markerLayer);
        }

        if (!origin || !destination) {
            map.setView(origin || destination, 14);
            $("mapMessage").textContent = "Enter both coordinates to preview the route.";
            return;
        }

        drawRoute(origin, destination, token);
    }

    async function drawRoute(origin, destination, token) {
        // Straight line first (instant), replaced by the driving route when available
        const straight = L.polyline([origin, destination], {
            color: "#64748b",
            weight: 3,
            dashArray: "6 8"
        }).addTo(routeLayer);

        routeBounds = L.latLngBounds([origin, destination]);
        map.invalidateSize();
        map.fitBounds(routeBounds, { padding: [45, 45], maxZoom: 15 });

        $("mapMessage").textContent = "Calculating driving route…";

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 7000);

            // OSRM expects [longitude, latitude]
            const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);

            if (!response.ok) throw new Error("Routing request failed");
            const data = await response.json();
            if (token !== routeToken) return;

            if (data.code !== "Ok" || !data.routes || !data.routes.length) {
                throw new Error("No route returned");
            }

            const route = data.routes[0];
            routeLayer.removeLayer(straight);

            const line = L.polyline(
                route.geometry.coordinates.map(c => [c[1], c[0]]),
                { color: "#2563eb", weight: 5, opacity: 0.85 }
            ).addTo(routeLayer);

            routeBounds = line.getBounds();
            map.fitBounds(routeBounds, { padding: [45, 45], maxZoom: 15 });

            const km = (route.distance / 1000).toFixed(1);
            const minutes = Math.max(1, Math.round(route.duration / 60));
            $("mapMessage").textContent = `Driving route: ${km} km (~${minutes} min)`;
        } catch {
            if (token !== routeToken) return;
            $("mapMessage").textContent = "Straight line shown (driving route unavailable).";
        }
    }

    let previewTimer = null;
    ["originLat", "originLng", "destLat", "destLng"].forEach(id => {
        $(id).addEventListener("input", () => {
            clearTimeout(previewTimer);
            previewTimer = setTimeout(updateMap, 450);
        });
    });

    $("fitMap").addEventListener("click", () => {
        if (map && routeBounds) {
            map.fitBounds(routeBounds, { padding: [45, 45], maxZoom: 15 });
        } else if (map) {
            map.setView(DEFAULT_CENTER, 12);
        }
    });

    // =====================================
    // CREATE ORDER
    // =====================================

    function readCoordinates() {
        const fields = [
            ["originLat", "originLatError", -90, 90],
            ["originLng", "originLngError", -180, 180],
            ["destLat", "destLatError", -90, 90],
            ["destLng", "destLngError", -180, 180]
        ];

        const values = {};
        let valid = true;

        fields.forEach(([id, errorId, min, max]) => {
            clearError(id, errorId);

            const raw = $(id).value.trim();
            const number = Number(raw);

            if (raw === "" || !Number.isFinite(number) || number < min || number > max) {
                setError(id, errorId, `Enter a number between ${min} and ${max}.`);
                valid = false;
            } else {
                values[id] = number;
            }
        });

        if (!valid) return null;

        if (values.originLat === values.destLat && values.originLng === values.destLng) {
            setError("destLat", "destLatError", "Destination must differ from the origin.");
            return null;
        }

        return {
            origin: [values.originLat, values.originLng],
            destination: [values.destLat, values.destLng]
        };
    }

    function resetOrderForm() {
        $("orderForm").reset();
        ["originLat", "originLng", "destLat", "destLng"].forEach(id => {
            clearError(id, id + "Error");
        });
        $("orderProductsError").textContent = "";
        $("productDropdown").open = false;
        updateProductDropdownLabel();
        updateMap();
    }

    $("clearOrder").addEventListener("click", resetOrderForm);

    $("orderForm").addEventListener("submit", event => {
        event.preventDefault();

        const selectedIds = Array.from(
            document.querySelectorAll('input[name="selectedProducts"]:checked'),
            input => input.value
        );

        $("orderProductsError").textContent =
            selectedIds.length === 0 ? "Please select at least one product." : "";

        const coordinates = readCoordinates();

        if (selectedIds.length === 0 || !coordinates) return;

        const nowIso = new Date().toISOString();
        const selectedProducts = products.filter(p => selectedIds.includes(p.id));
        const order = normalizeOrder({
            id: "CF-" + Math.floor(1050 + Math.random() * 8900),
            products: selectedProducts,
            origin_lat: coordinates.origin[0],
            origin_long: coordinates.origin[1],
            dest_lat: coordinates.destination[0],
            dest_long: coordinates.destination[1],
            origin: coordinates.origin,
            destination: coordinates.destination,
            status: "Initiated",
            attempt: 1,
            created_at: nowIso,
            createdAt: nowIso,
            events: [
                { status: "Initiated", at: nowIso, attempt: 1 }
            ]
        });

        orders.unshift(order);
        saveData();

        resetOrderForm();
        renderOrders();
        renderStats();
        toast(`Order ${order.id} created (status: Initiated) and sent to Courier pool.`);
        location.hash = "#orders";
    });

    // =====================================
    // ORDERS
    // =====================================

    function renderOrderItem(order) {
        const items = Array.isArray(order.products) ? order.products : [];
        const totals = totalsOf(items);
        const count = items.length;
        const statusClass = STATUS_CLASS[order.status] || "status-available";
        const attemptNum = order.attempt || 1;
        const wasCancelled = Array.isArray(order.events) && order.events.some(e => e.status === "Cancelled");
        const hasSig = order.signature && String(order.signature).startsWith("data:image/");

        return `<details class="history-item" name="client-order" data-id="${esc(order.id)}">
            <summary class="history-summary">
                <div class="history-summary-left">
                    <span class="history-chevron" aria-hidden="true">▸</span>
                    <strong class="history-id">${esc(order.id)}</strong>
                    <span class="history-item-tag">${count} product${count === 1 ? "" : "s"} · ${formatNumber(totals.weight)} kg · ${formatNumber(totals.volume)} m³</span>
                </div>
                <div class="history-summary-right">
                    <span class="history-item-tag">Attempt #${attemptNum}</span>
                    ${wasCancelled && order.status === "Initiated" ? '<span class="order-status status-cancelled">Returned after cancellation</span>' : ''}
                    <span class="history-date">${esc(formatDate(order.created_at || order.createdAt))}</span>
                    <span class="order-status ${statusClass}">${esc(order.status)}</span>
                    ${hasSig ? '<span class="pod-pill">✍ e-POD</span>' : ''}
                </div>
            </summary>
            <div class="history-body">
                <div class="history-stops-grid">
                    <div class="stop">
                        <span class="stop-letter">A</span>
                        <h4>Pick up from</h4>
                        ${order.pickup?.address ? `<p>${esc(order.pickup.address)}</p>` : ""}
                        <p class="subtle">GPS: ${esc(order.origin_lat ?? order.origin?.[0])}, ${esc(order.origin_long ?? order.origin?.[1])}</p>
                    </div>
                    <div class="stop drop">
                        <span class="stop-letter">B</span>
                        <h4>Deliver to</h4>
                        ${order.drop?.address ? `<p>${esc(order.drop.address)}</p>` : ""}
                        <p class="subtle">GPS: ${esc(order.dest_lat ?? order.destination?.[0])}, ${esc(order.dest_long ?? order.destination?.[1])}</p>
                    </div>
                </div>
                <div>
                    <h4>Products</h4>
                    <ul class="client-order-products">
                        ${items.map(p => `<li><strong>${esc(p.description)}</strong> <span>${esc(CATEGORY_LABELS[p.category] || "Other")} · ${formatNumber(p.weight_kg ?? p.weight)} kg · ${formatNumber(p.volume_m3 ?? p.volume)} m³</span></li>`).join("")}
                    </ul>
                </div>
                ${hasSig ? `
                <div class="proof-card history-pod-box" style="margin-top: 12px;">
                    <h4>Electronic Proof of Delivery (e-POD)</h4>
                    <img src="${order.signature}" alt="Proof of delivery for ${esc(order.id)}" class="signature-preview-img">
                </div>` : ""}
            </div>
        </details>`;
    }

    function renderOrders() {
        const newestFirst = (a, b) => Date.parse(b.created_at || b.createdAt) - Date.parse(a.created_at || a.createdAt);

        const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status)).sort(newestFirst);
        const history = orders.filter(o => HISTORY_STATUSES.includes(o.status)).sort(newestFirst);

        $("ordersList").innerHTML = active.length
            ? active.map(renderOrderItem).join("")
            : `<div class="empty-state"><strong>No active orders</strong>Create an order to see it here.</div>`;

        $("orderHistoryList").innerHTML = history.length
            ? history.map(renderOrderItem).join("")
            : `<div class="empty-state"><strong>No completed orders yet</strong>Completed and cancelled orders will appear here.</div>`;
    }

    // =====================================
    // DASHBOARD / SIDEBAR COUNTS
    // =====================================

    function renderStats() {
        const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
        const completed = orders.filter(o => o.status === "Completed").length;

        $("statTotal").textContent = orders.length;
        $("statActive").textContent = active;
        $("statCompleted").textContent = completed;
        $("statProducts").textContent = products.length;

        $("activeCount").textContent = active;
        $("productCount").textContent = products.length;
    }

    // =====================================
    // NAVIGATION (same behaviour as the courier page)
    // =====================================

    function nav() {
        const section = location.hash.slice(1) || "dashboard";

        document.querySelectorAll("[data-section]").forEach(link => {
            const active = link.dataset.section === section;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });

        if (section === "create-order" && map) {
            setTimeout(() => map.invalidateSize(), 250);
        }
    }

    window.addEventListener("hashchange", nav);

    window.addEventListener("storage", event => {
        if (event.key === PRODUCTS_KEY || event.key === ORDERS_KEY || event.key === null) {
            products = getSharedProducts();
            orders = getSharedOrders();
            renderProducts();
            renderOrders();
            renderStats();
        }
    });

    // =====================================
    // INITIALIZATION
    // =====================================

    renderHeaderIdentity();
    renderProducts();
    renderOrders();
    renderStats();
    initMap();
    nav();
})();
