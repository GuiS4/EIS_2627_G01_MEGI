/* CourierFlow Courier Workspace — Order execution, vehicle selection, single active task constraint, and e-POD. */
(() => {
    'use strict';
    const ORDERS_KEY = 'cms_orders';
    const $ = id => document.getElementById(id);

    const STATUS_CLASS = {
        'Initiated': 'status-available',
        'In Progress': 'status-picked_up',
        'Completed': 'status-delivered',
        'Cancelled': 'status-cancelled'
    };

    let orders = getSharedOrders();

    // =========================================================================
    // VEHICLE POOL, CAPACITY VALIDATION & ROUTE ASSIGNMENTS
    // =========================================================================
    const COURIER_DIRECTORY = {
        'CR-001': 'Alex Silva',
        'CR-002': 'Maria Costa',
        'CR-003': 'Daniel Santos'
    };

    function getVehicles() {
        return getSharedVehicles();
    }

    function getApprovedVehicles() {
        return getVehicles().filter(v => v.approval_status === 'Approved');
    }

    function resolveSubmitterName(vehicle) {
        if (vehicle.submitted_by_courier_name) return vehicle.submitted_by_courier_name;
        const subId = vehicle.submitted_by_courier_id || vehicle.courier_id;
        if (subId && COURIER_DIRECTORY[subId]) return COURIER_DIRECTORY[subId];
        try {
            const users = JSON.parse(localStorage.getItem('cms_users')) || [];
            const matchUser = users.find(u => u.id === subId);
            if (matchUser) return matchUser.fullName || matchUser.name || matchUser.email;
        } catch (_) {}
        return subId ? `Courier #${subId}` : 'Courier';
    }

    function getActiveCourier() {
        try {
            const currentUser = JSON.parse(sessionStorage.getItem('cms_current_user') || localStorage.getItem('cms_current_user') || 'null');
            if (currentUser && currentUser.role === 'courier' && currentUser.id) {
                const name = currentUser.fullName || currentUser.name || currentUser.email || 'Courier';
                COURIER_DIRECTORY[currentUser.id] = name;
                return { id: currentUser.id, name };
            }
        } catch (_) {}

        return { id: 'CR-001', name: 'Alex Silva' };
    }

    function getRouteAssignments() {
        try {
            const raw = localStorage.getItem('cms_route_assignments');
            if (!raw) {
                const defaults = defaultRouteAssignments();
                localStorage.setItem('cms_route_assignments', JSON.stringify(defaults));
                return defaults;
            }
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : defaultRouteAssignments();
        } catch {
            return defaultRouteAssignments();
        }
    }

    function saveRouteAssignments(assignments) {
        try {
            localStorage.setItem('cms_route_assignments', JSON.stringify(assignments));
        } catch (_) {}
    }

    function getOrderTotals(job) {
        if (Array.isArray(job.products) && job.products.length > 0) {
            const totalWeight = job.products.reduce((sum, p) => sum + (Number(p.weight_kg ?? p.weight) || 0), 0);
            const totalVolume = job.products.reduce((sum, p) => sum + (Number(p.volume_m3 ?? p.volume) || 0), 0);
            return {
                weight_kg: Number(totalWeight.toFixed(4)),
                volume_m3: Number(totalVolume.toFixed(6))
            };
        }
        return {
            weight_kg: Number(job.weight) || 0,
            volume_m3: Number(job.volume) || 0
        };
    }

    function evaluateVehicleCompatibility(vehicle, orderTotals) {
        const maxWeight = Number(vehicle.max_weight_kg) || 0;
        const maxVol = Number(vehicle.max_vol_m3) || 0;
        const weightExceeded = orderTotals.weight_kg > maxWeight;
        const volumeExceeded = orderTotals.volume_m3 > maxVol;

        if (weightExceeded && volumeExceeded) {
            return {
                compatible: false,
                reason: 'Maximum weight and volume exceeded'
            };
        }
        if (weightExceeded) {
            return {
                compatible: false,
                reason: 'Maximum weight exceeded'
            };
        }
        if (volumeExceeded) {
            return {
                compatible: false,
                reason: 'Maximum volume exceeded'
            };
        }
        return {
            compatible: true,
            reason: 'Compatible'
        };
    }

    function assignVehicleToOrderRoute(orderId, vehicleId) {
        orders = getSharedOrders();
        const job = orders.find(j => j.id === orderId);
        if (!job) return false;
        const approved = getApprovedVehicles();
        const vehicle = approved.find(v => String(v.id) === String(vehicleId));
        if (!vehicle) {
            toast('Only approved vehicles can be selected for a route.');
            return false;
        }
        const totals = getOrderTotals(job);
        const compat = evaluateVehicleCompatibility(vehicle, totals);
        if (!compat.compatible) {
            toast(`Cannot select ${vehicle.model}: ${compat.reason}.`);
            return false;
        }
        const courier = getActiveCourier();
        const assignments = getRouteAssignments();
        const record = {
            order_id: orderId,
            vehicle_id: vehicle.id,
            used_by_courier_id: courier.id,
            used_by_courier_name: courier.name,
            status: job.status,
            assigned_at: new Date().toISOString()
        };
        assignments[orderId] = record;
        saveRouteAssignments(assignments);
        job.routeAssignment = record;
        save();
        render();
        toast(`${vehicle.model} (${vehicle.license_plate || vehicle.plate}) selected for route ${orderId} by ${courier.name}.`);
        return true;
    }

    const money = value => formatCurrencyEUR(value);
    const date = value => {
        const dt = new Date(value);
        if (!Number.isFinite(dt.getTime())) return String(value ?? '');
        const pad = n => String(n).padStart(2, '0');
        return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}, ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };
    const esc = value => escapeHtml(value);

    function warn(text) {
        $('storageWarning').textContent = text;
        $('storageWarning').hidden = false;
    }

    function save() {
        if (!saveSharedOrders(orders)) {
            warn('Browser storage is unavailable. Changes last only until this page is closed or reloaded.');
        }
        orders = getSharedOrders();
    }

    const initialActive = orders.find(o => o.status === 'In Progress');
    let selected = initialActive ? initialActive.id : null,
        map, markers, bounds, toastTimer, currentRouteJobId;

    function toast(text) {
        $('toast').textContent = text;
        $('toast').hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            $('toast').hidden = true;
        }, 4500);
    }

    function badge(status) {
        const cls = STATUS_CLASS[status] || 'status-available';
        return `<span class="order-status ${cls}">${esc(status)}</span>`;
    }

    function match(job, query) {
        return [job.id, job.item, job.pickup.address, job.drop.address, job.pickup.name, job
            .drop.name
        ].join(' ').toLowerCase().includes(query.trim().toLowerCase());
    }

    function renderVehicleSelector(job) {
        const totals = getOrderTotals(job);
        const approvedVehicles = getApprovedVehicles();
        const assignments = getRouteAssignments();
        const currentAssign = assignments[job.id] || job.routeAssignment || null;
        const selectedVehicleId = currentAssign ? String(currentAssign.vehicle_id) : '';

        const productsHtml = (job.products || []).map(p =>
            `<span class="route-product-pill">${esc(p.description || p.name)} (${p.weight_kg ?? p.weight} kg · ${p.volume_m3 ?? p.volume} m³)</span>`
        ).join('');

        if (!approvedVehicles.length) {
            return `
                <div class="route-vehicle-box">
                    <div class="route-vehicle-header">
                        <h4>Select vehicle for route (${job.id})</h4>
                        <span class="route-req-pill">Required: <strong>${totals.weight_kg} kg</strong> · <strong>${totals.volume_m3} m³</strong></span>
                    </div>
                    ${productsHtml ? `<div class="route-products-list">${productsHtml}</div>` : ''}
                    <p class="subtle" style="margin-top: 8px;">No approved vehicles are currently available in the shared pool.</p>
                </div>
            `;
        }

        const optionsHtml = approvedVehicles.map(v => {
            const compat = evaluateVehicleCompatibility(v, totals);
            const isSelected = compat.compatible && String(v.id) === selectedVehicleId;
            const plate = v.license_plate || v.plate || '—';
            const submitter = resolveSubmitterName(v);

            if (!compat.compatible) {
                return `
                    <div class="vehicle-selector-option is-incompatible" aria-disabled="true" title="${esc(compat.reason)}">
                        <div class="vehicle-option-main">
                            <div class="vehicle-option-title">
                                <span class="vehicle-radio-indicator" aria-hidden="true"></span>
                                <strong>${esc(v.model)}</strong>
                                <span class="vehicle-plate-tag">${esc(plate)}</span>
                                <span class="vehicle-type-tag">${esc(v.type_name || 'Vehicle')}</span>
                            </div>
                            <span class="compat-badge compat-error">${esc(compat.reason)}</span>
                        </div>
                        <div class="vehicle-option-meta">
                            <span>Capacity: <strong>${v.max_weight_kg} kg</strong> · <strong>${v.max_vol_m3} m³</strong></span>
                            <span>Order: <strong>${totals.weight_kg} kg</strong> · <strong>${totals.volume_m3} m³</strong></span>
                            <span>Submitted by: ${esc(submitter)}</span>
                        </div>
                    </div>
                `;
            }

            return `
                <button type="button"
                        class="vehicle-selector-option ${isSelected ? 'is-selected' : ''}"
                        data-select-vehicle="${esc(v.id)}"
                        data-order-id="${esc(job.id)}"
                        aria-pressed="${isSelected ? 'true' : 'false'}">
                    <div class="vehicle-option-main">
                        <div class="vehicle-option-title">
                            <span class="vehicle-radio-indicator" aria-hidden="true"></span>
                            <strong>${esc(v.model)}</strong>
                            <span class="vehicle-plate-tag">${esc(plate)}</span>
                            <span class="vehicle-type-tag">${esc(v.type_name || 'Vehicle')}</span>
                        </div>
                        <span class="compat-badge ${isSelected ? 'compat-selected' : 'compat-ok'}">
                            ${isSelected ? `✓ Selected for route (${esc(currentAssign.used_by_courier_name || getActiveCourier().name)})` : 'Compatible'}
                        </span>
                    </div>
                    <div class="vehicle-option-meta">
                        <span>Capacity: <strong>${v.max_weight_kg} kg</strong> · <strong>${v.max_vol_m3} m³</strong></span>
                        <span>Order: <strong>${totals.weight_kg} kg</strong> · <strong>${totals.volume_m3} m³</strong></span>
                        <span>Submitted by: ${esc(submitter)}</span>
                    </div>
                </button>
            `;
        }).join('');

        return `
            <div class="route-vehicle-box">
                <div class="route-vehicle-header">
                    <div>
                        <h4>Vehicle selection for route · ${esc(job.id)}</h4>
                        <p class="subtle">Shared approved pool — select a compatible vehicle for this order/route.</p>
                    </div>
                    <span class="route-req-pill">Order total: <strong>${totals.weight_kg} kg</strong> · <strong>${totals.volume_m3} m³</strong></span>
                </div>
                ${productsHtml ? `<div class="route-products-list">${productsHtml}</div>` : ''}
                <div class="vehicle-selector-list" role="group" aria-label="Approved vehicles for ${esc(job.id)}">
                    ${optionsHtml}
                </div>
            </div>
        `;
    }

    function renderRouteAssignmentSummary(job) {
        const totals = getOrderTotals(job);
        const assignments = getRouteAssignments();
        const currentAssign = assignments[job.id] || job.routeAssignment || null;
        if (!currentAssign) return '';
        const vehicle = getVehicles().find(v => String(v.id) === String(currentAssign.vehicle_id));
        const model = vehicle ? `${vehicle.model} (${vehicle.license_plate || vehicle.plate})` : currentAssign.vehicle_id;
        const submitter = vehicle ? resolveSubmitterName(vehicle) : '—';
        const capInfo = vehicle ? `${vehicle.max_weight_kg} kg · ${vehicle.max_vol_m3} m³` : '—';
        const routeStatus = currentAssign.status || job.status || 'Initiated';

        return `
            <div class="route-vehicle-box route-vehicle-readonly">
                <div class="route-vehicle-header">
                    <h4>Assigned route vehicle · ${esc(job.id)}</h4>
                    <span class="route-req-pill">Order load: <strong>${totals.weight_kg} kg</strong> · <strong>${totals.volume_m3} m³</strong></span>
                </div>
                <div class="route-summary-details">
                    <span><strong>Vehicle:</strong> ${esc(model)} (Cap: ${esc(capInfo)})</span>
                    <span><strong>Route status:</strong> ${esc(routeStatus)}</span>
                    <span><strong>Used on route by:</strong> ${esc(currentAssign.used_by_courier_name || 'Courier')}</span>
                    <span><strong>Originally submitted by:</strong> ${esc(submitter)}</span>
                </div>
            </div>
        `;
    }

    function availableAccordionItem(job, isOpen) {
        const windowStr = (job.window || '').replace('Demo window: ', '');
        const totals = getOrderTotals(job);
        const assignments = getRouteAssignments();
        const currentAssign = assignments[job.id] || job.routeAssignment;
        const assignedVehicle = currentAssign ? getApprovedVehicles().find(v => String(v.id) === String(currentAssign.vehicle_id)) : null;
        const attemptNum = Math.max(1, parseInt(job.attempt, 10) || 1);
        const wasCancelled = (job.events || []).some(e => e.status === 'Cancelled');

        return `<details class="history-item" data-id="${job.id}" ${isOpen ? 'open' : ''}>
            <summary class="history-summary">
                <div class="history-summary-left">
                    <span class="history-chevron" aria-hidden="true">▸</span>
                    <strong class="history-id">${esc(job.id)}</strong>
                    <span class="history-item-tag">${esc(job.item)} · ${totals.weight_kg} kg · ${totals.volume_m3} m³ · Attempt #${attemptNum}</span>
                </div>
                <div class="history-summary-middle">
                    <span class="history-route-summary">
                        <span>${esc(job.pickup.name)}</span>
                        <span class="history-arrow">→</span>
                        <span>${esc(job.drop.name)}</span>
                    </span>
                </div>
                <div class="history-summary-right">
                    ${assignedVehicle ? `<span class="route-vehicle-pill">🚚 ${esc(assignedVehicle.model)}</span>` : ''}
                    ${wasCancelled ? `<span class="order-status status-cancelled">Cancelled prev.</span>` : ''}
                    <span class="fee">${money(job.fee)}</span>
                    <span class="history-date">${esc(windowStr)}</span>
                    <span class="order-status status-available">Initiated</span>
                </div>
            </summary>
            <div class="history-body">
                <div class="history-stops-grid">
                    <div class="stop">
                        <span class="stop-letter">A</span>
                        <h4>Pick up from</h4>
                        <p><strong>${esc(job.pickup.name)}</strong></p>
                        <p>${esc(job.pickup.address)}</p>
                        <p class="subtle">${esc(job.pickup.contact)}</p>
                        <p class="subtle">GPS: ${job.pickup.coords.join(', ')}</p>
                    </div>
                    <div class="stop drop">
                        <span class="stop-letter">B</span>
                        <h4>Deliver to</h4>
                        <p><strong>${esc(job.drop.name)}</strong></p>
                        <p>${esc(job.drop.address)}</p>
                        <p class="subtle">${esc(job.drop.contact)}</p>
                        <p class="subtle">GPS: ${job.drop.coords.join(', ')}</p>
                    </div>
                </div>

                <div class="delivery-note">
                    <strong>Handling instructions</strong><br>
                    ${esc(job.note)}<br>
                    <span class="subtle">${esc(job.window)}</span>
                </div>

                ${renderVehicleSelector(job)}

                <div class="active-action-container">
                    <button class="btn btn-primary detail-action" data-advance="${esc(job.id)}" data-expected="Initiated">
                        Start delivery (In Progress)
                    </button>
                </div>

                <div class="history-mini-map-box">
                    <div id="avmap-${esc(job.id)}" class="history-mini-map"
                         data-plat="${job.pickup.coords[0]}" data-plng="${job.pickup.coords[1]}"
                         data-dlat="${job.drop.coords[0]}"   data-dlng="${job.drop.coords[1]}">
                    </div>
                </div>
            </div>
        </details>`;
    }

    function activeAccordionItem(job, isOpen, isSelected) {
        const events = Array.isArray(job.events) ? job.events : [];
        const lastEv = events.at(-1);
        const eventDateStr = lastEv ? date(lastEv.at) : date(job.created_at);
        const totals = getOrderTotals(job);
        const assignments = getRouteAssignments();
        const currentAssign = assignments[job.id] || job.routeAssignment;
        const assignedVehicle = currentAssign ? getVehicles().find(v => String(v.id) === String(currentAssign.vehicle_id)) : null;
        const attemptNum = Math.max(1, parseInt(job.attempt, 10) || 1);

        return `<details class="history-item ${isSelected ? 'selected' : ''}" name="active-deliverable" data-id="${job.id}" ${isOpen ? 'open' : ''}>
            <summary class="history-summary">
                <div class="history-summary-left">
                    <span class="history-chevron" aria-hidden="true">▸</span>
                    <strong class="history-id">${esc(job.id)}</strong>
                    <span class="history-item-tag">Attempt #${attemptNum}</span>
                </div>
                <div class="history-summary-right">
                    ${assignedVehicle ? `<span class="route-vehicle-pill">🚚 ${esc(assignedVehicle.model)}</span>` : ''}
                    <span class="fee">${money(job.fee)}</span>
                    <span class="history-date">${eventDateStr}</span>
                    ${badge(job.status)}
                </div>
            </summary>
            <div class="history-body">
                <p class="history-package-meta"><span class="history-item-tag">${esc(job.item)} · ${totals.weight_kg} kg · ${totals.volume_m3} m³</span></p>

                <div class="history-stops-grid">
                    <div class="stop">
                        <span class="stop-letter">A</span>
                        <h4>Pick up from</h4>
                        <p><strong>${esc(job.pickup.name)}</strong></p>
                        <p>${esc(job.pickup.address)}</p>
                        <p class="subtle">${esc(job.pickup.contact)}</p>
                        <p class="subtle">GPS: ${job.pickup.coords.join(', ')}</p>
                    </div>
                    <div class="stop drop">
                        <span class="stop-letter">B</span>
                        <h4>Deliver to</h4>
                        <p><strong>${esc(job.drop.name)}</strong></p>
                        <p>${esc(job.drop.address)}</p>
                        <p class="subtle">${esc(job.drop.contact)}</p>
                        <p class="subtle">GPS: ${job.drop.coords.join(', ')}</p>
                    </div>
                </div>

                <div class="delivery-note">
                    <strong>Handling instructions</strong><br>
                    ${esc(job.note)}<br>
                    <span class="subtle">${esc(job.window)}</span>
                </div>

                ${renderVehicleSelector(job)}
                ${renderRouteAssignmentSummary(job)}

                <ol class="progress" aria-label="Delivery progress">
                    ${['Initiated', 'In Progress', 'Completed'].map(s => `<li class="${events.some(e => e.status === s) || job.status === s ? 'done' : ''}">${s}</li>`).join('')}
                </ol>

                <div class="active-action-container" style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn btn-primary detail-action" data-advance="${esc(job.id)}" data-expected="In Progress">
                        Complete delivery (e-POD)
                    </button>
                    <button class="btn btn-outline detail-action" data-cancel="${esc(job.id)}">
                        Cancel delivery
                    </button>
                </div>

                <div class="history-timeline-box" style="padding-left: 0; padding-top: 14px; border-top: 1px dashed var(--line); margin-top: 8px;">
                    <h4>Delivery Timeline</h4>
                    <div class="timeline" style="margin-top: 6px;">
                        ${events.map(e => `<p>${esc(e.status)}${e.attempt ? ` (Attempt #${e.attempt})` : ''} · ${date(e.at)}</p>`).join('')}
                    </div>
                </div>
            </div>
        </details>`;
    }

    function historyAccordionItem(job) {
        const events = Array.isArray(job.events) ? job.events : [];
        const deliveredEvent = events.find(e => e.status === 'Completed') || events.at(-1);
        const deliveredDateStr = deliveredEvent ? date(deliveredEvent.at) : date(job.created_at);
        const hasSig = job.signature && job.signature.startsWith('data:image/');
        const totals = getOrderTotals(job);
        const attemptNum = Math.max(1, parseInt(job.attempt, 10) || 1);

        return `<details class="history-item" data-id="${job.id}">
            <summary class="history-summary">
                <div class="history-summary-left">
                    <span class="history-chevron" aria-hidden="true">▸</span>
                    <strong class="history-id">${esc(job.id)}</strong>
                    <span class="history-item-tag">${esc(job.item)} · ${totals.weight_kg} kg · ${totals.volume_m3} m³ · Attempt #${attemptNum}</span>
                </div>
                <div class="history-summary-middle">
                    <span class="history-route-summary">
                        <span>${esc(job.pickup.name)}</span>
                        <span class="history-arrow">→</span>
                        <span>${esc(job.drop.name)}</span>
                    </span>
                </div>
                <div class="history-summary-right">
                    <span class="fee">${money(job.fee)}</span>
                    <span class="history-date">${deliveredDateStr}</span>
                    <span class="order-status status-delivered">Completed</span>
                    ${hasSig ? '<span class="pod-pill">✍ e-POD</span>' : ''}
                </div>
            </summary>
            <div class="history-body">
                <div class="history-stops-grid">
                    <div class="stop">
                        <span class="stop-letter">A</span>
                        <h4>Pick up from</h4>
                        <p><strong>${esc(job.pickup.name)}</strong></p>
                        <p>${esc(job.pickup.address)}</p>
                        <p class="subtle">${esc(job.pickup.contact)}</p>
                        <p class="subtle">GPS: ${job.pickup.coords.join(', ')}</p>
                    </div>
                    <div class="stop drop">
                        <span class="stop-letter">B</span>
                        <h4>Delivered to</h4>
                        <p><strong>${esc(job.drop.name)}</strong></p>
                        <p>${esc(job.drop.address)}</p>
                        <p class="subtle">${esc(job.drop.contact)}</p>
                        <p class="subtle">GPS: ${job.drop.coords.join(', ')}</p>
                    </div>
                </div>
                ${renderRouteAssignmentSummary(job)}
                <div class="history-details-bottom">
                    <div class="history-timeline-box">
                        <h4>Delivery Timeline</h4>
                        <div class="timeline">
                            ${events.map(e => `<p>${esc(e.status)}${e.attempt ? ` (Attempt #${e.attempt})` : ''} · ${date(e.at)}</p>`).join('')}
                        </div>
                    </div>
                    ${hasSig ? `
                    <div class="proof-card history-pod-box">
                        <h4>Proof of Delivery (e-POD)</h4>
                        <img src="${job.signature}" alt="Electronic Proof of Delivery" class="signature-preview-img">
                    </div>` : ''}
                    <div class="history-mini-map-box">
                        <div id="hmap-${esc(job.id)}" class="history-mini-map"
                             data-plat="${job.pickup.coords[0]}" data-plng="${job.pickup.coords[1]}"
                             data-dlat="${job.drop.coords[0]}"   data-dlng="${job.drop.coords[1]}">
                        </div>
                    </div>
                </div>
            </div>
        </details>`;
    }

    async function initHistoryMiniMap(container, pickupCoords, dropCoords) {
        if (!window.L || container._miniMapDone) return;
        container._miniMapDone = true;

        const miniMap = L.map(container, {
            dragging:          false,
            zoomControl:       false,
            scrollWheelZoom:   false,
            doubleClickZoom:   false,
            touchZoom:         false,
            boxZoom:           false,
            keyboard:          false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18
        }).addTo(miniMap);

        const A = L.latLng(pickupCoords[0], pickupCoords[1]);
        const B = L.latLng(dropCoords[0],   dropCoords[1]);

        L.circleMarker(A, { radius: 7, color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 })
            .bindTooltip('Pickup', { permanent: false }).addTo(miniMap);
        L.circleMarker(B, { radius: 7, color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 })
            .bindTooltip('Drop-off', { permanent: false }).addTo(miniMap);

        miniMap.fitBounds([A, B], { padding: [22, 22] });

        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${A.lng},${A.lat};${B.lng},${B.lat}?overview=full&geometries=geojson`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('OSRM error');
            const data = await resp.json();
            if (data.routes && data.routes[0]) {
                L.geoJSON(data.routes[0].geometry, {
                    style: { color: '#2563eb', weight: 3, opacity: 0.85 }
                }).addTo(miniMap);
            }
        } catch {
            L.polyline([A, B], { color: '#94a3b8', weight: 2, dashArray: '5 5' }).addTo(miniMap);
        }

        miniMap.invalidateSize();
    }

    function renderLists() {
        orders = getSharedOrders();
        const available = orders.filter(j => j.status === 'Initiated');
        const active = orders.filter(j => j.status === 'In Progress');
        const history = orders.filter(j => j.status === 'Completed').sort((a, b) => {
            const aEv = (a.events || []).at(-1);
            const bEv = (b.events || []).at(-1);
            return (bEv ? Date.parse(bEv.at) : 0) - (aEv ? Date.parse(aEv.at) : 0);
        });

        $('statAvailable').textContent = $('availableCount').textContent = available.length;
        $('statActive').textContent = $('activeCount').textContent = active.length;
        $('statCompleted').textContent = history.length;
        $('statEarnings').textContent = money(history.reduce((sum, j) => sum + (Number(j.fee) || 0), 0));

        const found = available.filter(j => match(j, $('jobSearch').value));
        found.sort((a, b) => $('jobSort').value === 'pay' ? b.fee - a.fee : $('jobSort').value === 'weight' ? a.weight - b.weight : a.id.localeCompare(b.id));

        const openAvailIds = new Set(
            Array.from($('availableList').querySelectorAll('details[open]')).map(d => d.dataset.id)
        );
        $('availableList').innerHTML = found.length ?
            found.map(j => availableAccordionItem(j, openAvailIds.has(j.id))).join('') :
            `<div class="empty-state"><strong>${available.length ? 'No matching orders' : 'No Initiated orders waiting'}</strong>${available.length ? 'Try another ID, address or package.' : 'Check your active delivery below or create an order from the Client portal.'}</div>`;

        const filteredActive = active.filter(j => $('activeFilter').value === 'all' || j.status === $('activeFilter').value);

        if (selected && !active.some(j => j.id === selected)) {
            selected = null;
        }
        if (!selected && filteredActive.length > 0) {
            selected = filteredActive[0].id;
        }

        const openActiveIds = new Set();
        if (selected && filteredActive.some(j => j.id === selected)) {
            openActiveIds.add(selected);
        }

        $('activeList').innerHTML = filteredActive.length ?
            filteredActive.map(j => activeAccordionItem(j, openActiveIds.has(j.id), j.id === selected)).join('') :
            `<div class="empty-state"><strong>No active delivery in progress</strong>Select an Initiated order above and start delivery (at most 1 order In Progress at a time).</div>`;

        const selectedJob = orders.find(j => j.id === selected);
        if (selectedJob && active.some(j => j.id === selected)) {
            if ($('mapTitle')) $('mapTitle').textContent = `Delivery map · ${selectedJob.id}`;
            renderMap(selectedJob);
        } else {
            if ($('mapTitle')) $('mapTitle').textContent = 'Delivery map';
            $('mapMessage').textContent = 'Select an active deliverable to view its route.';
            if ($('fitMap')) $('fitMap').disabled = true;
            if (map && markers) {
                markers.clearLayers();
                map.setView([41.1500, -8.6200], 13);
            }
        }

        $('activeList').querySelectorAll('details.history-item').forEach(details => {
            details.addEventListener('toggle', function() {
                if (this.open) {
                    const id = this.dataset.id;
                    selected = id;
                    $('activeList').querySelectorAll('details.history-item').forEach(d => {
                        if (d !== this && d.open) {
                            d.open = false;
                        }
                        d.classList.toggle('selected', d.dataset.id === id);
                    });
                    const job = orders.find(j => j.id === id);
                    if (job) {
                        if ($('mapTitle')) $('mapTitle').textContent = `Delivery map · ${job.id}`;
                        renderMap(job);
                    }
                } else {
                    this.classList.remove('selected');
                    const anyOpen = $('activeList').querySelector('details.history-item[open]');
                    if (!anyOpen) {
                        selected = null;
                        if ($('mapTitle')) $('mapTitle').textContent = 'Delivery map';
                        $('mapMessage').textContent = 'Select an active deliverable to view its route.';
                        if ($('fitMap')) $('fitMap').disabled = true;
                        if (map && markers) {
                            markers.clearLayers();
                            map.setView([41.1500, -8.6200], 13);
                        }
                    }
                }
            });
        });

        const filteredHistory = history.filter(j => match(j, $('historySearch').value));
        $('historyList').innerHTML = filteredHistory.length ?
            filteredHistory.map(historyAccordionItem).join('') :
            `<div class="empty-state"><strong>No completed deliveries in this view</strong>Completed orders appear here. Try clearing your search.</div>`;

        attachAccordionMaps('availableList');
        attachAccordionMaps('historyList');
    }

    function attachAccordionMaps(listId) {
        const el = $(listId);
        if (!el) return;
        el.querySelectorAll('details.history-item').forEach(details => {
            function loadMap() {
                const mapDiv = details.querySelector('.history-mini-map');
                if (!mapDiv || mapDiv._miniMapDone) return;
                const plat = parseFloat(mapDiv.dataset.plat);
                const plng = parseFloat(mapDiv.dataset.plng);
                const dlat = parseFloat(mapDiv.dataset.dlat);
                const dlng = parseFloat(mapDiv.dataset.dlng);
                setTimeout(() => initHistoryMiniMap(mapDiv, [plat, plng], [dlat, dlng]), 50);
            }
            details.addEventListener('toggle', function() {
                if (this.open) loadMap();
            });
            if (details.open) {
                loadMap();
            }
        });
    }

    async function renderMap(job) {
        if (!window.L) {
            $('deliveryMap').classList.add('map-unavailable');
            $('deliveryMap').textContent =
                'Map unavailable. Connect to the internet and reload to load Leaflet. Addresses and GPS coordinates are shown in the delivery details.';
            $('mapMessage').textContent = 'Delivery actions remain available without the map.';
            $('fitMap').disabled = true;
            return;
        }
        if (!map) {
            map = L.map('deliveryMap', {
                scrollWheelZoom: false
            });
            const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            tiles.on('tileerror', () => {
                $('mapMessage').textContent =
                    'Some map tiles could not load. Check your internet connection; stop markers and delivery details remain available.';
            });
            markers = L.layerGroup().addTo(map);
        }
        if ($('fitMap')) $('fitMap').disabled = false;
        markers.clearLayers();
        [job.pickup, job.drop].forEach((point, i) => {
            const popup = document.createElement('span');
            popup.textContent =
            `${i ? 'B · Drop-off' : 'A · Pickup'}: ${point.address}`;
            L.marker(point.coords, {
                icon: L.divIcon({
                    className: `map-pin ${i ? 'dropoff' : ''}`,
                    html: i ? 'B' : 'A',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                }),
                title: `${i ? 'Drop-off' : 'Pickup'}: ${point.address}`
            }).bindPopup(popup).addTo(markers);
        });

        currentRouteJobId = job.id;
        $('mapMessage').textContent = `Calculating real driving route for ${job.id}…`;

        try {
            const pickupCoord = `${job.pickup.coords[1]},${job.pickup.coords[0]}`;
            const dropCoord = `${job.drop.coords[1]},${job.drop.coords[0]}`;
            const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoord};${dropCoord}?overview=full&geometries=geojson`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('OSRM routing request failed');
            const data = await response.json();

            if (currentRouteJobId !== job.id) return;

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const latLngs = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

                const routeLine = L.polyline(latLngs, {
                    color: '#2563eb',
                    weight: 5,
                    opacity: 0.85
                }).addTo(markers);

                bounds = routeLine.getBounds();
                map.invalidateSize();
                map.fitBounds(bounds, {
                    padding: [45, 45],
                    maxZoom: 15
                });

                const distKm = (route.distance / 1000).toFixed(1);
                const durationMin = Math.max(1, Math.round(route.duration / 60));
                $('mapMessage').textContent =
                    `${job.id} · Driving route: ${distKm} km (~${durationMin} min)`;
                return;
            }
            throw new Error('No route returned by OSRM');
        } catch (err) {
            if (currentRouteJobId !== job.id) return;
            L.polyline([job.pickup.coords, job.drop.coords], {
                color: '#64748b',
                weight: 3,
                dashArray: '6 8'
            }).addTo(markers);

            bounds = L.latLngBounds([job.pickup.coords, job.drop.coords]);
            map.invalidateSize();
            map.fitBounds(bounds, {
                padding: [45, 45],
                maxZoom: 15
            });

            $('mapMessage').textContent =
                `${job.id} · Fallback straight line (offline or routing service unavailable).`;
        }
    }

    function render() {
        renderLists();
    }

    async function confirmAction(title, text, label) {
        const dialog = $('confirmDialog');
        $('confirmTitle').textContent = title;
        $('confirmText').textContent = text;
        $('confirmButton').textContent = label;
        dialog.returnValue = 'cancel';
        dialog.showModal();
        return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), {
            once: true
        }));
    }

    function requestSignature(jobId) {
        return new Promise(resolve => {
            const dialog = $('signatureDialog');
            const canvas = $('signatureCanvas');
            const photoInput = $('podPhotoInput');
            const clearBtn = $('clearSignatureBtn');
            const cancelBtn = $('cancelSignatureBtn');
            const confirmBtn = $('confirmSignatureBtn');
            const errorMsg = $('signatureError');

            $('signatureOrderCode').textContent = jobId;
            errorMsg.hidden = true;
            if (photoInput) photoInput.value = '';

            dialog.showModal();

            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round((rect.width || 450) * dpr);
            canvas.height = Math.round((rect.height || 180) * dpr);

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            let isDrawing = false;
            let hasDrawn = false;
            let uploadedPhotoDataUrl = null;

            if (photoInput) {
                photoInput.onchange = () => {
                    const file = photoInput.files && photoInput.files[0];
                    if (!file) {
                        uploadedPhotoDataUrl = null;
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                        uploadedPhotoDataUrl = typeof reader.result === 'string' ? reader.result : null;
                        errorMsg.hidden = true;
                    };
                    reader.readAsDataURL(file);
                };
            }

            function getPos(e) {
                const r = canvas.getBoundingClientRect();
                return {
                    x: e.clientX - r.left,
                    y: e.clientY - r.top
                };
            }

            function startDraw(e) {
                isDrawing = true;
                const pos = getPos(e);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                try {
                    canvas.setPointerCapture(e.pointerId);
                } catch (_) {}
            }

            function draw(e) {
                if (!isDrawing) return;
                const pos = getPos(e);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                hasDrawn = true;
                errorMsg.hidden = true;
            }

            function stopDraw(e) {
                if (!isDrawing) return;
                isDrawing = false;
                try {
                    canvas.releasePointerCapture(e.pointerId);
                } catch (_) {}
            }

            canvas.onpointerdown = startDraw;
            canvas.onpointermove = draw;
            canvas.onpointerup = stopDraw;
            canvas.onpointercancel = stopDraw;

            clearBtn.onclick = () => {
                ctx.clearRect(0, 0, rect.width, rect.height);
                hasDrawn = false;
                uploadedPhotoDataUrl = null;
                if (photoInput) photoInput.value = '';
                errorMsg.hidden = true;
            };

            cancelBtn.onclick = () => {
                cleanup();
                dialog.close('cancel');
                resolve(null);
            };

            confirmBtn.onclick = () => {
                if (!hasDrawn && !uploadedPhotoDataUrl) {
                    errorMsg.hidden = false;
                    return;
                }
                const dataUrl = uploadedPhotoDataUrl || canvas.toDataURL('image/png');
                cleanup();
                dialog.close('confirm');
                resolve(dataUrl);
            };

            function onCancel() {
                cleanup();
                resolve(null);
            }

            dialog.addEventListener('cancel', onCancel, { once: true });

            function cleanup() {
                canvas.onpointerdown = null;
                canvas.onpointermove = null;
                canvas.onpointerup = null;
                canvas.onpointercancel = null;
                if (photoInput) photoInput.onchange = null;
                clearBtn.onclick = null;
                cancelBtn.onclick = null;
                confirmBtn.onclick = null;
                dialog.removeEventListener('cancel', onCancel);
            }
        });
    }

    function advance(id, expected, signature) {
        orders = getSharedOrders();
        const job = orders.find(o => o.id === id);
        if (!job || job.status !== expected) {
            render();
            toast('This delivery has already changed. Review its current status.');
            return;
        }

        // Enforce single active task constraint when starting an Initiated order
        if (expected === 'Initiated') {
            const existingActive = orders.find(o => o.status === 'In Progress' && o.id !== id);
            if (existingActive) {
                toast(`Single active task constraint: You already have order ${existingActive.id} In Progress. Complete or cancel it before starting another order.`);
                return;
            }
        }

        // Validate that a compatible approved vehicle has been selected for this route
        const assignments = getRouteAssignments();
        const currentAssign = assignments[id] || job.routeAssignment;
        const approved = getApprovedVehicles();
        const vehicle = currentAssign ? approved.find(v => String(v.id) === String(currentAssign.vehicle_id)) : null;
        if (!vehicle) {
            toast(`Please select a compatible approved vehicle for route ${id} before proceeding.`);
            return;
        }
        const compat = evaluateVehicleCompatibility(vehicle, getOrderTotals(job));
        if (!compat.compatible) {
            toast(`Selected vehicle is incompatible with ${id}: ${compat.reason}.`);
            return;
        }

        const nextStatus = expected === 'Initiated' ? 'In Progress' : 'Completed';
        job.status = nextStatus;
        if (signature) {
            job.signature = signature;
        }

        const updatedAssign = {
            ...currentAssign,
            status: nextStatus
        };
        assignments[id] = updatedAssign;
        saveRouteAssignments(assignments);
        job.routeAssignment = updatedAssign;

        if (!Array.isArray(job.events)) job.events = [];
        const last = job.events.at(-1);
        job.events.push({
            status: nextStatus,
            at: new Date(Math.max(Date.now(), last ? Date.parse(last.at) : 0)).toISOString(),
            attempt: job.attempt || 1,
            signature: signature || null
        });

        selected = id;
        save();
        render();
        toast(`${id}: ${nextStatus}.${nextStatus === 'Completed' ? ' Added to delivery history with e-POD.' : ''}`);
    }

    async function cancelOrder(id) {
        orders = getSharedOrders();
        const job = orders.find(o => o.id === id);
        if (!job || job.status !== 'In Progress') {
            render();
            return;
        }
        const confirmed = await confirmAction(
            `Cancel order ${id}?`,
            'Cancelling this active order will record a Cancelled event, increment the attempt counter, and return the order to the Initiated orders list.',
            'Cancel delivery'
        );
        if (!confirmed) return;

        const nowIso = new Date().toISOString();
        if (!Array.isArray(job.events)) job.events = [];
        const currentAttempt = Math.max(1, parseInt(job.attempt, 10) || 1);
        job.events.push({
            status: 'Cancelled',
            at: nowIso,
            attempt: currentAttempt
        });

        const nextAttempt = currentAttempt + 1;
        job.attempt = nextAttempt;
        job.status = 'Initiated';
        job.routeAssignment = null;
        job.events.push({
            status: 'Initiated',
            at: nowIso,
            attempt: nextAttempt
        });

        const assignments = getRouteAssignments();
        delete assignments[id];
        saveRouteAssignments(assignments);

        if (selected === id) {
            selected = null;
        }
        save();
        render();
        toast(`${id} cancelled and returned to Initiated orders (Attempt #${nextAttempt}).`);
    }

    document.addEventListener('click', async event => {
        const selectVehicleBtn = event.target.closest('[data-select-vehicle]');
        if (selectVehicleBtn) {
            const vehicleId = selectVehicleBtn.dataset.selectVehicle;
            const orderId = selectVehicleBtn.dataset.orderId;
            if (orderId && vehicleId) {
                assignVehicleToOrderRoute(orderId, vehicleId);
            }
            return;
        }
        const cancelBtn = event.target.closest('[data-cancel]');
        if (cancelBtn) {
            await cancelOrder(cancelBtn.dataset.cancel);
            return;
        }
        const action = event.target.closest('[data-advance]');
        if (action) {
            const {
                advance: id,
                expected
            } = action.dataset;
            if (expected === 'In Progress') {
                const signature = await requestSignature(id);
                if (!signature) {
                    return; // Blocks completion without proof of delivery!
                }
                advance(id, expected, signature);
                return;
            }
            advance(id, expected);
        }
    });

    $('resetDemo').addEventListener('click', async () => {
        if (!(await confirmAction('Reset demo data?',
                'This resets shared orders and route assignments in this browser to the original sample dataset.',
                'Reset demo'))) return;
        orders = defaultSeedOrders();
        saveSharedOrders(orders);
        saveRouteAssignments(defaultRouteAssignments());
        selected = 'CF-1044';
        $('storageWarning').hidden = true;
        ['jobSearch', 'historySearch'].forEach(id => {
            $(id).value = '';
        });
        $('activeFilter').value = 'all';
        $('jobSort').value = 'id';
        render();
        toast('Demo data has been reset.');
    });

    ['jobSearch', 'historySearch'].forEach(id => $(id).addEventListener('input', renderLists));
    $('jobSort').addEventListener('change', renderLists);
    $('activeFilter').addEventListener('change', () => {
        selected = null;
        renderLists();
    });
    $('fitMap').addEventListener('click', () => {
        if (map && bounds) map.fitBounds(bounds, {
            padding: [45, 45],
            maxZoom: 15
        });
    });

    function nav() {
        const section = location.hash.slice(1) || 'dashboard';
        document.querySelectorAll('.courier-section').forEach(sec => sec.hidden = false);
        document.querySelectorAll('[data-section]').forEach(link => {
            const active = link.dataset.section === section;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
    }
    window.addEventListener('hashchange', nav);
    window.addEventListener('storage', event => {
        if (event.key === 'cms_vehicles' || event.key === 'cms_route_assignments') {
            render();
            toast('Shared vehicle pool updated.');
            return;
        }
        if (event.key === ORDERS_KEY || event.key === null) {
            orders = getSharedOrders();
            render();
            toast('Orders synchronized from another tab.');
        }
    });
    function renderCourierHeaderIdentity() {
        const active = getActiveCourier();
        const label = $('courierWorkspaceLabel');
        const avatar = $('courierAvatar');
        if (label) {
            label.textContent = `Courier · ${active.name}`;
        }
        if (avatar) {
            const initials = (active.name || 'CR')
                .trim()
                .split(/\s+/)
                .map(w => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
            avatar.textContent = initials || 'CR';
        }
    }

    renderCourierHeaderIdentity();
    render();
    nav();
})();
