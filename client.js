
// =====================================
// COURIERFLOW - CLIENT PAGE
// =====================================

// Retrieve saved data from the browser

let products = JSON.parse(
    localStorage.getItem("cms_products") || "[]"
);

let orders = JSON.parse(
    localStorage.getItem("cms_orders") || "[]"
);

// Elements

const productForm = document.getElementById("productForm");
const orderForm = document.getElementById("orderForm");

const productSelection =
    document.getElementById("productSelection");

const ordersList =
    document.getElementById("ordersList");

const orderHistoryList =
    document.getElementById("orderHistoryList");

// =====================================
// SAVE DATA
// =====================================

function saveData() {
    localStorage.setItem(
        "cms_products",
        JSON.stringify(products)
    );

    localStorage.setItem(
        "cms_orders",
        JSON.stringify(orders)
    );
}

// =====================================
// ERROR MANAGEMENT
// =====================================

function setError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);

    error.textContent = message;
    input.classList.add("input-error");
}

function clearError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);

    error.textContent = "";
    input.classList.remove("input-error");
}

// =====================================
// PRODUCT REGISTRATION
// =====================================

productForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const description =
        document.getElementById("productDescription").value.trim();

    const category =
        document.getElementById("productCategory").value;

    const weightValue =
        document.getElementById("productWeight").value;

    const volumeValue =
        document.getElementById("productVolume").value;

    const weight = Number(weightValue);
    const volume = Number(volumeValue);

    let valid = true;

    const fields = [
        ["productDescription", "productDescriptionError"],
        ["productCategory", "productCategoryError"],
        ["productWeight", "productWeightError"],
        ["productVolume", "productVolumeError"]
    ];

    fields.forEach(function(field) {
        clearError(field[0], field[1]);
    });

    if (description === "") {
        setError(
            "productDescription",
            "productDescriptionError",
            "Description is required."
        );
        valid = false;
    }

    if (category === "") {
        setError(
            "productCategory",
            "productCategoryError",
            "Select a category."
        );
        valid = false;
    }

    if (weightValue.trim() === "" ||
        !Number.isFinite(weight) ||
        weight <= 0) {

        setError(
            "productWeight",
            "productWeightError",
            "Enter a valid positive weight."
        );
        valid = false;
    }

    if (volumeValue.trim() === "" ||
        !Number.isFinite(volume) ||
        volume <= 0) {

        setError(
            "productVolume",
            "productVolumeError",
            "Enter a valid positive volume."
        );
        valid = false;
    }

    if (!valid) {
        return;
    }

    // Create a product object

    const product = {
        id: crypto.randomUUID(),
        description: description,
        category: category,
        weight: weight,
        volume: volume,
        createdAt: new Date().toISOString()
    };

    // Add to products array

    products.push(product);

    // Save in localStorage

    saveData();

    // Update interface

    renderProducts();
    updateDashboard();

    productForm.reset();

    document.getElementById("productSuccess").textContent =
        "Product added successfully!";
});

// =====================================
// DISPLAY AVAILABLE PRODUCTS
// =====================================

function renderProducts() {

    productSelection.replaceChildren();

    if (products.length === 0) {
        productSelection.textContent =
            "No products available. Register a product first.";
        return;
    }

    products.forEach(function(product) {

        const label = document.createElement("label");
        label.className = "product-option";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "selectedProducts";
        checkbox.value = product.id;

        const description = document.createElement("span");

        description.textContent =
            product.description +
            " | " + product.weight + " kg" +
            " | " + product.volume + " m³";

        label.appendChild(checkbox);
        label.appendChild(description);

        productSelection.appendChild(label);
    });
}

// =====================================
// LEAFLET MAP
// =====================================

// Initial position: FEUP, Porto

const map = L.map("orderMap").setView(
    [41.1780, -8.5980],
    12
);

// OpenStreetMap tiles

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            '&copy; OpenStreetMap contributors'
    }
).addTo(map);

// Default marker

const defaultMarker = L.marker(
    [41.1780, -8.5980]
).addTo(map);

defaultMarker.bindPopup("FEUP - Porto");

// Layers used to preview a route

const routeLayer = L.layerGroup().addTo(map);

// =====================================
// GPS VALIDATION
// =====================================

function readCoordinates() {

    const definitions = [
        ["originLat", "originLatError", -90, 90],
        ["originLng", "originLngError", -180, 180],
        ["destLat", "destLatError", -90, 90],
        ["destLng", "destLngError", -180, 180]
    ];

    const values = {};
    let valid = true;

    definitions.forEach(function(field) {

        const [id, errorId, min, max] = field;

        clearError(id, errorId);

        const raw = document.getElementById(id).value.trim();
        const number = Number(raw);

        if (raw === "" ||
            !Number.isFinite(number) ||
            number < min ||
            number > max) {

            setError(
                id,
                errorId,
                "Enter a number between " +
                min + " and " + max + "."
            );

            valid = false;

        } else {
            values[id] = number;
        }
    });

    if (!valid) {
        return null;
    }

    return {
        origin: [values.originLat, values.originLng],
        destination: [values.destLat, values.destLng]
    };
}

// =====================================
// PREVIEW ROUTE
// =====================================

function showRoute(coordinates) {

    routeLayer.clearLayers();

    // Remove default marker

    if (map.hasLayer(defaultMarker)) {
        map.removeLayer(defaultMarker);
    }

    // Origin marker

    L.marker(coordinates.origin)
        .bindPopup("Pickup Location")
        .addTo(routeLayer);

    // Destination marker

    L.marker(coordinates.destination)
        .bindPopup("Delivery Location")
        .addTo(routeLayer);

    // Straight geographic line
    // This is not a road-routing service

    const route = L.polyline(
        [coordinates.origin, coordinates.destination],
        {
            color: "#2563eb",
            weight: 4
        }
    ).addTo(routeLayer);

    if (coordinates.origin[0] === coordinates.destination[0] &&
        coordinates.origin[1] === coordinates.destination[1]) {

        map.setView(coordinates.origin, 14);

    } else {

        map.fitBounds(route.getBounds(), {
            padding: [40, 40],
            maxZoom: 15
        });
    }
}

document.getElementById("previewRoute")
    .addEventListener("click", function() {

        const coordinates = readCoordinates();

        if (coordinates) {
            showRoute(coordinates);
        }
    });

// =====================================
// CREATE ORDER
// =====================================

orderForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const selectedCheckboxes =
        document.querySelectorAll(
            'input[name="selectedProducts"]:checked'
        );

    const error =
        document.getElementById("orderProductsError");

    error.textContent = "";

    const selectedIds = Array.from(
        selectedCheckboxes,
        checkbox => checkbox.value
    );

    if (selectedIds.length === 0) {
        error.textContent =
            "Please select at least one product.";
    }

    const coordinates = readCoordinates();

    if (selectedIds.length === 0 || !coordinates) {
        return;
    }

    const selectedProducts = products.filter(
        product => selectedIds.includes(product.id)
    );

    const order = {
        id: "CMS-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
        products: selectedProducts,
        origin: coordinates.origin,
        destination: coordinates.destination,
        status: "Initiated",
        createdAt: new Date().toISOString()
    };

    orders.push(order);

    saveData();

    showRoute(coordinates);
    renderOrders();
    updateDashboard();

    orderForm.reset();

    document.getElementById("orderSuccess").textContent =
        "Order " + order.id + " created successfully!";
});

// =====================================
// ORDER DISPLAY
// =====================================

function renderOrderCard(order) {

    const card = document.createElement("div");
    card.className = "order-card";

    const title = document.createElement("h3");
    title.textContent = "Order #" + order.id;

    const productsText = document.createElement("p");
    productsText.textContent =
        "Products: " +
        order.products.map(p => p.description).join(", ");

    const originText = document.createElement("p");
    originText.textContent =
        "Origin: " + order.origin.join(", ");

    const destinationText = document.createElement("p");
    destinationText.textContent =
        "Destination: " + order.destination.join(", ");

    const dateText = document.createElement("p");
    dateText.textContent =
        "Created: " +
        new Date(order.createdAt).toLocaleString();

    const status = document.createElement("span");
    status.className = "order-status";
    status.textContent = order.status;

    card.append(
        title,
        productsText,
        originText,
        destinationText,
        dateText,
        status
    );

    return card;
}

function renderOrders() {

    ordersList.replaceChildren();
    orderHistoryList.replaceChildren();

    const active = orders.filter(
        order => order.status === "Initiated" ||
                 order.status === "In Progress"
    );

    const history = orders.filter(
        order => order.status === "Completed" ||
                 order.status === "Cancelled"
    );

    if (active.length === 0) {
        ordersList.textContent = "No active orders yet.";
    } else {
        active.forEach(function(order) {
            ordersList.appendChild(renderOrderCard(order));
        });
    }

    if (history.length === 0) {
        orderHistoryList.textContent =
            "No completed or cancelled orders yet.";
    } else {
        history.forEach(function(order) {
            orderHistoryList.appendChild(renderOrderCard(order));
        });
    }
}

// =====================================
// DASHBOARD STATISTICS
// =====================================

function updateDashboard() {

    const active = orders.filter(
        order => order.status === "Initiated" ||
                 order.status === "In Progress"
    );

    const completed = orders.filter(
        order => order.status === "Completed"
    );

    const numbers =
        document.querySelectorAll(".dashboard-card strong");

    if (numbers.length >= 4) {
        numbers[0].textContent = orders.length;
        numbers[1].textContent = active.length;
        numbers[2].textContent = completed.length;
        numbers[3].textContent = products.length;
    }
}

// =====================================
// INITIALIZATION
// =====================================

renderProducts();
renderOrders();
updateDashboard();

