/* CourierFlow local demo. No authentication, dispatch API or payments.
   Store only workflow state; addresses and fees come from this demo catalog. */
   (() => {
    'use strict';
    const KEY = 'courierflow.courier.demo.v1';
    const $ = id => document.getElementById(id);
    const labels = {
        available: 'Available',
        accepted: 'Accepted',
        picked_up: 'Picked up',
        delivered: 'Delivered'
    };
    const next = {
        available: 'accepted',
        accepted: 'picked_up',
        picked_up: 'delivered'
    };
    const actions = {
        available: 'Accept delivery',
        accepted: 'Mark as picked up',
        picked_up: 'Mark as delivered'
    };
    const catalog = [{
        id: 'CF-1041',
        item: 'Documents',
        weight: 0.3,
        volume: 0.0005,
        products: [
            { name: 'Legal contract folder', weight_kg: 0.2, volume_m3: 0.0003 },
            { name: 'Notary dossier', weight_kg: 0.1, volume_m3: 0.0002 }
        ],
        fee: 7.50,
        pickup: {
            name: 'Central Studio',
            address: 'Praça da Liberdade, Porto',
            contact: 'Alex · reception desk',
            coords: [41.1463, -8.6110]
        },
        drop: {
            name: 'Riverside Office',
            address: 'Praça da Ribeira, Porto',
            contact: 'Sam · main entrance',
            coords: [41.1405, -8.6130]
        },
        note: 'Keep the envelope flat. Hand it to reception.',
        window: 'Demo window: 09:00–18:00'
    }, {
        id: 'CF-1042',
        item: 'Clothing',
        weight: 1.2,
        volume: 0.0035,
        products: [
            { name: 'Winter coat', weight_kg: 0.8, volume_m3: 0.0025 },
            { name: 'Apparel box', weight_kg: 0.4, volume_m3: 0.0010 }
        ],
        fee: 9.20,
        pickup: {
            name: 'North Boutique',
            address: 'Rua de Santa Catarina, Porto',
            contact: 'Taylor · collection desk',
            coords: [41.1510, -8.6053]
        },
        drop: {
            name: 'Garden Residence',
            address: 'Rua de Dom Manuel II, Porto',
            contact: 'Morgan · lobby',
            coords: [41.1478, -8.6243]
        },
        note: 'Two sealed bags. Ask for the recipient at the lobby.',
        window: 'Demo window: 10:00–18:00'
    }, {
        id: 'CF-1043',
        item: 'Electronics',
        weight: 2.5,
        volume: 0.002,
        products: [
            { name: 'Workstation monitor', weight_kg: 2.0, volume_m3: 0.0015 },
            { name: 'Docking station', weight_kg: 0.5, volume_m3: 0.0005 }
        ],
        fee: 12.80,
        pickup: {
            name: 'Tech Workshop',
            address: 'Praça de Mouzinho de Albuquerque, Porto',
            contact: 'Casey · service counter',
            coords: [41.1581, -8.6291]
        },
        drop: {
            name: 'Creative Office',
            address: 'Avenida dos Aliados, Porto',
            contact: 'Jordan · reception',
            coords: [41.1500, -8.6108]
        },
        note: 'Fragile package. Keep upright and avoid stacking.',
        window: 'Demo window: 09:00–17:00'
    }, {
        id: 'CF-1044',
        item: 'Books',
        weight: 1.8,
        volume: 0.004,
        products: [
            { name: 'Hardcover textbooks (x3)', weight_kg: 1.8, volume_m3: 0.004 }
        ],
        fee: 8.60,
        pickup: {
            name: 'City Bookshop',
            address: 'Rua das Carmelitas, Porto',
            contact: 'Robin · front counter',
            coords: [41.1469, -8.6149]
        },
        drop: {
            name: 'East Studio',
            address: 'Campo 24 de Agosto, Porto',
            contact: 'Drew · ground floor',
            coords: [41.1496, -8.5991]
        },
        note: 'One cardboard box. Collect from the front counter.',
        window: 'Demo window: 09:00–18:00'
    }, {
        id: 'CF-1039',
        item: 'Art supplies',
        weight: 0.8,
        volume: 0.0015,
        products: [
            { name: 'Canvas & acrylic set', weight_kg: 0.8, volume_m3: 0.0015 }
        ],
        fee: 8.40,
        pickup: {
            name: 'Art Supply Store',
            address: 'Rua de Cedofeita, Porto',
            contact: 'Riley · counter',
            coords: [41.1538, -8.6178]
        },
        drop: {
            name: 'Design Studio',
            address: 'Rua de Miguel Bombarda, Porto',
            contact: 'Quinn · studio entrance',
            coords: [41.1493, -8.6202]
        },
        note: 'Deliver the sealed package to the studio entrance.',
        window: 'Demo window: 09:00–18:00'
    }, {
        id: 'CF-1036',
        item: 'Documents',
        weight: 0.2,
        volume: 0.0003,
        products: [
            { name: 'Sealed archive envelope', weight_kg: 0.2, volume_m3: 0.0003 }
        ],
        fee: 6.50,
        pickup: {
            name: 'West Office',
            address: 'Rua de Júlio Dinis, Porto',
            contact: 'Avery · reception',
            coords: [41.1550, -8.6283]
        },
        drop: {
            name: 'Central Office',
            address: 'Praça da Trindade, Porto',
            contact: 'Blake · reception',
            coords: [41.1523, -8.6095]
        },
        note: 'Envelope delivered to reception.',
        window: 'Demo window: 09:00–18:00'
    }];

    // =========================================================================
    // VEHICLE POOL, CAPACITY VALIDATION & ROUTE ASSIGNMENTS
    // =========================================================================
    const COURIER_DIRECTORY = {
        'CR-001': 'Alex Silva',
        'CR-002': 'Maria Costa',
        'CR-003': 'Daniel Santos'
    };

    function defaultSeedVehicles() {
        return [
            {
                id: 'V-001',
                courier_id: 'CR-001',
                submitted_by_courier_id: 'CR-001',
                submitted_by_courier_name: 'Alex Silva',
                vehicle_type_id: 'van',
                type_name: 'Van',
                model: 'Renault Kangoo',
                license_plate: 'AA-12-CF',
                max_weight_kg: 650,
                max_vol_m3: 3.3,
                doc_number: 'PT-DOC-2026-001',
                approval_status: 'Approved',
                approved_by: 'admin@admin.demo',
                created_at: '2026-10-15T09:00:00.000Z'
            },
            {
                id: 'V-002',
                courier_id: 'CR-002',
                submitted_by_courier_id: 'CR-002',
                submitted_by_courier_name: 'Maria Costa',
                vehicle_type_id: 'van',
                type_name: 'Van',
                model: 'Peugeot Partner',
                license_plate: 'AB-34-CF',
                max_weight_kg: 750,
                max_vol_m3: 3.7,
                doc_number: 'PT-DOC-2026-002',
                approval_status: 'Approved',
                approved_by: 'admin@admin.demo',
                created_at: '2026-10-16T10:30:00.000Z'
            },
            {
                id: 'V-003',
                courier_id: 'CR-001',
                submitted_by_courier_id: 'CR-001',
                submitted_by_courier_name: 'Alex Silva',
                vehicle_type_id: 'motorcycle',
                type_name: 'Motorcycle',
                model: 'Honda PCX 125',
                license_plate: 'MC-11-CF',
                max_weight_kg: 2.0,
                max_vol_m3: 0.003,
                doc_number: 'PT-DOC-2026-003',
                approval_status: 'Approved',
                approved_by: 'admin@admin.demo',
                created_at: '2026-10-18T11:15:00.000Z'
            },
            {
                id: 'V-004',
                courier_id: 'CR-002',
                submitted_by_courier_id: 'CR-002',
                submitted_by_courier_name: 'Maria Costa',
                vehicle_type_id: 'bicycle',
                type_name: 'Bicycle',
                model: 'Urban Cargo Bike',
                license_plate: 'BK-05-CF',
                max_weight_kg: 1.0,
                max_vol_m3: 0.0018,
                doc_number: 'PT-DOC-2026-004',
                approval_status: 'Approved',
                approved_by: 'admin@admin.demo',
                created_at: '2026-10-19T14:00:00.000Z'
            },
            {
                id: 'V-005',
                courier_id: 'CR-003',
                submitted_by_courier_id: 'CR-003',
                submitted_by_courier_name: 'Daniel Santos',
                vehicle_type_id: 'van',
                type_name: 'Van',
                model: 'Citroën Berlingo',
                license_plate: 'AC-56-CF',
                max_weight_kg: 650,
                max_vol_m3: 3.3,
                doc_number: 'PT-DOC-2026-005',
                approval_status: 'Pending',
                approved_by: null,
                created_at: '2026-10-20T16:45:00.000Z'
            }
        ];
    }

    function getVehicles() {
        try {
            const raw = localStorage.getItem('cms_vehicles');
            const seededFlag = localStorage.getItem('cms_vehicles_seeded_v2');
            let list = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(list)) list = [];
            if (!seededFlag) {
                const defaults = defaultSeedVehicles();
                const existingIds = new Set(list.map(v => v.id));
                defaults.forEach(d => {
                    if (!existingIds.has(d.id)) list.push(d);
                });
                localStorage.setItem('cms_vehicles', JSON.stringify(list));
                localStorage.setItem('cms_vehicles_seeded_v2', 'true');
            }
            return list;
        } catch {
            return defaultSeedVehicles();
        }
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
        const selectEl = $('activeCourierSelect');
        try {
            const currentUser = JSON.parse(localStorage.getItem('cms_current_user'));
            if (currentUser && currentUser.role === 'courier' && currentUser.id) {
                const name = currentUser.fullName || currentUser.name || currentUser.email || 'Courier';
                COURIER_DIRECTORY[currentUser.id] = name;
                if (selectEl && !Array.from(selectEl.options).some(o => o.value === String(currentUser.id))) {
                    const opt = document.createElement('option');
                    opt.value = String(currentUser.id);
                    opt.textContent = `${name} (${currentUser.id})`;
                    selectEl.prepend(opt);
                }
            }
        } catch (_) {}

        if (selectEl && selectEl.value) {
            const id = selectEl.value;
            return { id, name: COURIER_DIRECTORY[id] || `Courier ${id}` };
        }
        return { id: 'CR-001', name: 'Alex Silva' };
    }

    function defaultRouteAssignments() {
        return {
            'CF-1044': {
                order_id: 'CF-1044',
                vehicle_id: 'V-001',
                used_by_courier_id: 'CR-001',
                used_by_courier_name: 'Alex Silva',
                assigned_at: '2026-10-25T09:00:00.000Z'
            },
            'CF-1039': {
                order_id: 'CF-1039',
                vehicle_id: 'V-002',
                used_by_courier_id: 'CR-002',
                used_by_courier_name: 'Maria Costa',
                assigned_at: '2026-10-25T08:40:00.000Z'
            },
            'CF-1036': {
                order_id: 'CF-1036',
                vehicle_id: 'V-001',
                used_by_courier_id: 'CR-003',
                used_by_courier_name: 'Daniel Santos',
                assigned_at: '2026-10-24T10:00:00.000Z'
            }
        };
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
            const totalWeight = job.products.reduce((sum, p) => sum + (Number(p.weight_kg) || 0), 0);
            const totalVolume = job.products.reduce((sum, p) => sum + (Number(p.volume_m3) || 0), 0);
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
        const job = catalog.find(j => j.id === orderId);
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
            assigned_at: new Date().toISOString()
        };
        assignments[orderId] = record;
        saveRouteAssignments(assignments);
        if (state.jobs[orderId]) {
            state.jobs[orderId].routeAssignment = record;
            save();
        }
        render();
        toast(`${vehicle.model} (${vehicle.license_plate || vehicle.plate}) selected for route ${orderId} by ${courier.name}.`);
        return true;
    }
    const money = value => new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
    const date = value => new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(value));
    const esc = value => String(value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } [ch]));
    const iso = offset => new Date(Date.now() - offset * 60000).toISOString();

    function seed() {
        return {
            version: 1,
            jobs: Object.fromEntries(catalog.map((job, i) => [job.id,
                i < 3 ? {
                    status: 'available',
                    events: []
                } : i === 3 ? {
                    status: 'accepted',
                    events: [{
                        status: 'accepted',
                        at: iso(30)
                    }]
                } : i === 4 ? {
                    status: 'picked_up',
                    events: [{
                        status: 'accepted',
                        at: iso(50)
                    }, {
                        status: 'picked_up',
                        at: iso(20)
                    }]
                } : {
                    status: 'delivered',
                    events: [{
                        status: 'accepted',
                        at: iso(1500)
                    }, {
                        status: 'picked_up',
                        at: iso(1480)
                    }, {
                        status: 'delivered',
                        at: iso(1450)
                    }]
                }
            ]))
        };
    }

    function valid(data) {
        if (!data || data.version !== 1 || !data.jobs) return false;
        return catalog.every(({
            id
        }) => {
            const job = data.jobs[id];
            if (!job || !Object.hasOwn(labels, job.status) || !Array.isArray(job
                .events)) return false;
            const steps = ['accepted', 'picked_up', 'delivered'];
            const count = job.status === 'available' ? 0 : steps.indexOf(job.status) +
            1;
            return job.events.length === count && job.events.every((event, i) => event
                .status === steps[i] && typeof event.at === 'string' && Number
                .isFinite(Date.parse(event.at)) && (i === 0 || Date.parse(event
                    .at) >= Date.parse(job.events[i - 1].at)));
        });
    }

    function warn(text) {
        $('storageWarning').textContent = text;
        $('storageWarning').hidden = false;
    }
    let persistence = true;

    function read() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!valid(data)) throw new Error('Invalid demo data');
            return data;
        } catch (error) {
            warn(
                'Saved demo data is unavailable or invalid. This session can still be used. Reset demo data to start again.');
            return null;
        }
    }
    let state = read() || seed();
    // Test data has no signature; purge any legacy demo svg strings from previous test runs
    if (state && state.jobs) {
        Object.values(state.jobs).forEach(job => {
            if (job.signature && !job.signature.startsWith('data:image/png')) {
                delete job.signature;
            }
        });
    }

    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify(state));
            persistence = true;
        } catch (error) {
            persistence = false;
            warn(
                'Browser storage is unavailable. Changes last only until this page is closed or reloaded.');
        }
    }
    save();
    let selected = 'CF-1044',
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
        return `<span class="order-status status-${status}">${labels[status]}</span>`;
    }

    function jobCard(job) {
        const workflow = state.jobs[job.id];
        const lastEv = workflow.events.at(-1);
        const hasSig = workflow.signature && workflow.signature.startsWith('data:image/png');
        return `<article class="order-card ${selected === job.id ? 'selected' : ''}"><div class="card-top"><h3>${job.id}</h3><span class="fee">${money(job.fee)}</span></div><div class="card-route"><div><small>Pickup</small><p>${esc(job.pickup.address)}</p></div><div><small>Drop-off</small><p>${esc(job.drop.address)}</p></div></div><p class="card-meta">${job.item} · ${job.weight} kg · ${job.volume ?? '—'} m³${workflow.status === 'delivered' && lastEv ? ' · '+date(lastEv.at)+(hasSig ? ' · ✍ POD Verified' : '') : ''}</p><div class="card-bottom">${badge(workflow.status)}<button class="btn btn-outline" data-view="${job.id}" aria-label="View details for ${job.id}">View details <span aria-hidden="true">↗</span></button></div></article>`;
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
        const currentAssign = assignments[job.id] || state.jobs[job.id]?.routeAssignment || null;
        const selectedVehicleId = currentAssign ? String(currentAssign.vehicle_id) : '';

        const productsHtml = (job.products || []).map(p =>
            `<span class="route-product-pill">${esc(p.name)} (${p.weight_kg} kg · ${p.volume_m3} m³)</span>`
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
        const currentAssign = assignments[job.id] || state.jobs[job.id]?.routeAssignment || null;
        if (!currentAssign) return '';
        const vehicle = getVehicles().find(v => String(v.id) === String(currentAssign.vehicle_id));
        const model = vehicle ? `${vehicle.model} (${vehicle.license_plate || vehicle.plate})` : currentAssign.vehicle_id;
        const submitter = vehicle ? resolveSubmitterName(vehicle) : '—';
        const capInfo = vehicle ? `${vehicle.max_weight_kg} kg · ${vehicle.max_vol_m3} m³` : '—';

        return `
            <div class="route-vehicle-box route-vehicle-readonly">
                <div class="route-vehicle-header">
                    <h4>Assigned route vehicle · ${esc(job.id)}</h4>
                    <span class="route-req-pill">Order load: <strong>${totals.weight_kg} kg</strong> · <strong>${totals.volume_m3} m³</strong></span>
                </div>
                <div class="route-summary-details">
                    <span><strong>Vehicle:</strong> ${esc(model)} (Cap: ${esc(capInfo)})</span>
                    <span><strong>Used on route by:</strong> ${esc(currentAssign.used_by_courier_name || 'Courier')}</span>
                    <span><strong>Originally submitted by:</strong> ${esc(submitter)}</span>
                </div>
            </div>
        `;
    }

    function availableAccordionItem(job, isOpen) {
        const workflow = state.jobs[job.id];
        const windowStr = job.window.replace('Demo window: ', '');
        const totals = getOrderTotals(job);
        const assignments = getRouteAssignments();
        const currentAssign = assignments[job.id] || workflow?.routeAssignment;
        const assignedVehicle = currentAssign ? getApprovedVehicles().find(v => String(v.id) === String(currentAssign.vehicle_id)) : null;

        return `<details class="history-item" data-id="${job.id}" ${isOpen ? 'open' : ''}>
            <summary class="history-summary">
                <div class="history-summary-left">
                    <span class="history-chevron" aria-hidden="true">▸</span>
                    <strong class="history-id">${job.id}</strong>
                    <span class="history-item-tag">${esc(job.item)} · ${totals.weight_kg} kg · ${totals.volume_m3} m³</span>
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
                    <span class="fee">${money(job.fee)}</span>
                    <span class="history-date">${windowStr}</span>
                    <span class="order-status status-available">Available</span>
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
                    <span class="subtle">${job.window}</span>
                </div>

                ${renderVehicleSelector(job)}

                <div class="active-action-container">
                    <button class="btn btn-primary detail-action" data-advance="${job.id}" data-expected="available">
                        Accept delivery
                    </button>
                </div>

                <div class="history-mini-map-box">
                    <div id="avmap-${job.id}" class="history-mini-map"
                         data-plat="${job.pickup.coords[0]}" data-plng="${job.pickup.coords[1]}"
                         data-dlat="${job.drop.coords[0]}"   data-dlng="${job.drop.coords[1]}">
                    </div>
                </div>
            </div>
        </details>`;
    }

    function activeAccordionItem(job, isOpen, isSelected) {
        const workflow = state.jobs[job.id];
        const lastEv = workflow.events.at(-1);
        const eventDateStr = lastEv ? date(lastEv.at) : '';
        const totals = getOrderTotals(job);
        const assignments = getRouteAssignments();
        const currentAssign = assignments[job.id] || workflow?.routeAssignment;
        const assignedVehicle = currentAssign ? getVehicles().find(v => String(v.id) === String(currentAssign.vehicle_id)) : null;

        return `<details class="history-item ${isSelected ? 'selected' : ''}" name="active-deliverable" data-id="${job.id}" ${isOpen ? 'open' : ''}>
            <summary class="history-summary">
                <div class="history-summary-left">
                    <span class="history-chevron" aria-hidden="true">▸</span>
                    <strong class="history-id">${job.id}</strong>
                </div>
                <div class="history-summary-right">
                    ${assignedVehicle ? `<span class="route-vehicle-pill">🚚 ${esc(assignedVehicle.model)}</span>` : ''}
                    <span class="fee">${money(job.fee)}</span>
                    <span class="history-date">${eventDateStr}</span>
                    <span class="order-status status-${workflow.status}">${labels[workflow.status]}</span>
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
                    <span class="subtle">${job.window}</span>
                </div>

                ${workflow.status === 'accepted' ? renderVehicleSelector(job) : renderRouteAssignmentSummary(job)}

                <ol class="progress" aria-label="Delivery progress">
                    ${['accepted', 'picked_up', 'delivered'].map(s => `<li class="${workflow.events.some(e => e.status === s) ? 'done' : ''}">${labels[s]}</li>`).join('')}
                </ol>

                ${next[workflow.status] ? `
                <div class="active-action-container">
                    <button class="btn btn-primary detail-action" data-advance="${job.id}" data-expected="${workflow.status}">
                        ${actions[workflow.status]}
                    </button>
                </div>` : ''}

                <div class="history-timeline-box" style="padding-left: 0; padding-top: 14px; border-top: 1px dashed var(--line); margin-top: 8px;">
                    <h4>Delivery Timeline</h4>
                    <div class="timeline" style="margin-top: 6px;">
                        ${workflow.events.map(e => `<p>${labels[e.status]} · ${date(e.at)}</p>`).join('')}
                    </div>
                </div>
            </div>
        </details>`;
    }

    function historyAccordionItem(job) {
        const workflow = state.jobs[job.id];
        const deliveredEvent = workflow.events.find(e => e.status === 'delivered') || workflow.events.at(-1);
        const deliveredDateStr = deliveredEvent ? date(deliveredEvent.at) : '';
        const hasSig = workflow.signature && workflow.signature.startsWith('data:image/png');
        const totals = getOrderTotals(job);

        return `<details class="history-item" data-id="${job.id}">
            <summary class="history-summary">
                <div class="history-summary-left">
                    <span class="history-chevron" aria-hidden="true">▸</span>
                    <strong class="history-id">${job.id}</strong>
                    <span class="history-item-tag">${esc(job.item)} · ${totals.weight_kg} kg · ${totals.volume_m3} m³</span>
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
                    <span class="order-status status-delivered">Delivered</span>
                    ${hasSig ? '<span class="pod-pill">✍ POD</span>' : ''}
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
                            ${workflow.events.map(e => `<p>${labels[e.status]} · ${date(e.at)}</p>`).join('')}
                        </div>
                    </div>
                    ${hasSig ? `
                    <div class="proof-card history-pod-box">
                        <h4>Proof of Delivery (POD)</h4>
                        <img src="${workflow.signature}" alt="Recipient signature" class="signature-preview-img">
                    </div>` : ''}
                    <div class="history-mini-map-box">
                        <div id="hmap-${job.id}" class="history-mini-map"
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

        // Circle markers — A green, B red
        L.circleMarker(A, { radius: 7, color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 })
            .bindTooltip('Pickup', { permanent: false }).addTo(miniMap);
        L.circleMarker(B, { radius: 7, color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 })
            .bindTooltip('Drop-off', { permanent: false }).addTo(miniMap);

        miniMap.fitBounds([A, B], { padding: [22, 22] });

        // Real driving route via OSRM (requires network); fall back to dashed line
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

        // Force Leaflet to recalculate size after details reveal
        miniMap.invalidateSize();
    }

    function list(id, jobs, title, message) {
        $(id).innerHTML = jobs.length ? jobs.map(jobCard).join('') :
            `<div class="empty-state"><strong>${title}</strong>${message}</div>`;
    }

    function renderLists() {
        const available = catalog.filter(j => state.jobs[j.id].status === 'available');
        const active = catalog.filter(j => ['accepted', 'picked_up'].includes(state.jobs[j.id]
            .status));
        const history = catalog.filter(j => state.jobs[j.id].status === 'delivered').sort((a,
            b) => {
                const aEv = state.jobs[a.id].events.at(-1);
                const bEv = state.jobs[b.id].events.at(-1);
                return (bEv ? Date.parse(bEv.at) : 0) - (aEv ? Date.parse(aEv.at) : 0);
            });
        $('statAvailable').textContent = $('availableCount').textContent = available.length;
        $('statActive').textContent = $('activeCount').textContent = active.length;
        $('statCompleted').textContent = history.length;
        $('statEarnings').textContent = money(history.reduce((sum, j) => sum + j.fee, 0));
        const found = available.filter(j => match(j, $('jobSearch').value));
        found.sort((a, b) => $('jobSort').value === 'pay' ? b.fee - a.fee : $('jobSort')
            .value === 'weight' ? a.weight - b.weight : a.id.localeCompare(b.id));
        const openAvailIds = new Set(
            Array.from($('availableList').querySelectorAll('details[open]')).map(d => d.dataset.id)
        );
        $('availableList').innerHTML = found.length ?
            found.map(j => availableAccordionItem(j, openAvailIds.has(j.id))).join('') :
            `<div class="empty-state"><strong>${available.length ? 'No matching jobs' : 'All jobs have been accepted'}</strong>${available.length ? 'Try another ID, address or package.' : 'Check your active deliveries below. Reset the demo to explore again.'}</div>`;

        // Active deliverables in accordion style on the left
        const filteredActive = active.filter(j => $('activeFilter').value === 'all' || state.jobs[j
                .id].status === $('activeFilter').value);

        if (selected && !active.some(j => j.id === selected)) {
            selected = null;
        }

        // Enforce single-open: only the selected active deliverable is open (if any)
        const openActiveIds = new Set();
        if (selected && filteredActive.some(j => j.id === selected)) {
            openActiveIds.add(selected);
        }

        $('activeList').innerHTML = filteredActive.length ?
            filteredActive.map(j => activeAccordionItem(j, openActiveIds.has(j.id), j.id === selected)).join('') :
            `<div class="empty-state"><strong>No active deliverables in this view</strong>Accept an available job or choose a different status filter.</div>`;

        // Update map on the right for selected active delivery
        const selectedJob = catalog.find(j => j.id === selected);
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

        // Attach listeners to active accordions to switch map on the right and maintain single-open
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
                    const job = catalog.find(j => j.id === id);
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
            `<div class="empty-state"><strong>No completed deliveries in this view</strong>Completed jobs appear here. Try clearing your search.</div>`;

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

    function stop(point, type) {
        return `<div class="stop ${type === 'drop' ? 'drop' : ''}"><span class="stop-letter">${type === 'drop' ? 'B' : 'A'}</span><h4>${type === 'drop' ? 'Deliver to' : 'Pick up from'}</h4><p><strong>${esc(point.name)}</strong></p><p>${esc(point.address)}</p><p class="subtle">${esc(point.contact)}</p><p class="subtle">GPS: ${point.coords.join(', ')}</p></div>`;
    }

    function renderDetails() {
        // Merged with active deliverables
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
            // OSRM routing API expects [longitude, latitude]
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
            // Fallback to straight line if offline or OSRM unavailable
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
        renderDetails();
    }
    async function confirmAction(title, text, label) {
        const dialog = $('confirmDialog');
        $('confirmTitle').textContent = title;
        $('confirmText').textContent = text;
        $('confirmButton').textContent = label;
        dialog.returnValue = 'cancel';
        dialog.showModal();
        return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog
            .returnValue === 'confirm'), {
            once: true
        }));
    }

    function requestSignature(jobId) {
        return new Promise(resolve => {
            const dialog = $('signatureDialog');
            const canvas = $('signatureCanvas');
            const clearBtn = $('clearSignatureBtn');
            const cancelBtn = $('cancelSignatureBtn');
            const confirmBtn = $('confirmSignatureBtn');
            const errorMsg = $('signatureError');

            $('signatureOrderCode').textContent = jobId;
            errorMsg.hidden = true;

            dialog.showModal();

            // Set canvas buffer resolution based on its rendered bounding box
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
                errorMsg.hidden = true;
            };

            cancelBtn.onclick = () => {
                cleanup();
                dialog.close('cancel');
                resolve(null);
            };

            confirmBtn.onclick = () => {
                if (!hasDrawn) {
                    errorMsg.hidden = false;
                    return;
                }
                const dataUrl = canvas.toDataURL('image/png');
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
                clearBtn.onclick = null;
                cancelBtn.onclick = null;
                confirmBtn.onclick = null;
                dialog.removeEventListener('cancel', onCancel);
            }
        });
    }

    function advance(id, expected, signature) {
        // Re-read before changing state to avoid acting on a stale open tab.
        if (persistence) state = read() || state;
        const workflow = state.jobs[id];
        if (!workflow || workflow.status !== expected || !next[expected]) {
            render();
            toast('This delivery has already changed. Review its current status.');
            return;
        }

        // Validate that a compatible approved vehicle has been selected for this route
        if (expected === 'available' || expected === 'accepted') {
            const job = catalog.find(j => j.id === id);
            const assignments = getRouteAssignments();
            const currentAssign = assignments[id] || workflow.routeAssignment;
            const approved = getApprovedVehicles();
            const vehicle = currentAssign ? approved.find(v => String(v.id) === String(currentAssign.vehicle_id)) : null;
            if (!vehicle) {
                toast(`Please select a compatible approved vehicle for route ${id} before proceeding.`);
                return;
            }
            if (job) {
                const compat = evaluateVehicleCompatibility(vehicle, getOrderTotals(job));
                if (!compat.compatible) {
                    toast(`Selected vehicle is incompatible with ${id}: ${compat.reason}.`);
                    return;
                }
            }
            workflow.routeAssignment = currentAssign;
        }

        workflow.status = next[expected];
        if (signature) {
            workflow.signature = signature;
        }
        const last = workflow.events.at(-1);
        workflow.events.push({
            status: workflow.status,
            at: new Date(Math.max(Date.now(), last ? Date.parse(last.at) : 0))
                .toISOString(),
            signature: signature || null
        });
        selected = id;
        save();
        render();
        toast(
            `${id}: ${labels[workflow.status]}.${workflow.status === 'delivered' ? ' Added to delivery history with POD signature.' : ''}`);
        const activeItem = $('activeList')?.querySelector(`details[data-id="${id}"]`);
        if (activeItem) {
            const btn = activeItem.querySelector('button[data-advance]');
            if (btn) btn.focus({ preventScroll: true });
        }
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
        const view = event.target.closest('[data-view]');
        if (view) {
            selected = view.dataset.view;
            render();
            return;
        }
        const action = event.target.closest('[data-advance]');
        if (action) {
            const {
                advance: id,
                expected
            } = action.dataset;
            if (expected === 'picked_up') {
                const signature = await requestSignature(id);
                if (!signature) {
                    return; // Blocks advance without proof of delivery!
                }
                advance(id, expected, signature);
                return;
            }
            advance(id, expected);
        }
    });
    if ($('activeCourierSelect')) {
        getActiveCourier();
        $('activeCourierSelect').addEventListener('change', () => {
            const courier = getActiveCourier();
            renderLists();
            toast(`Acting as courier: ${courier.name} (${courier.id}).`);
        });
    }
    $('resetDemo').addEventListener('click', async () => {
        if (!(await confirmAction('Reset demo data?',
                'This replaces only CourierFlow courier demo progress in this browser with the original sample deliveries.',
                'Reset demo'))) return;
        state = seed();
        saveRouteAssignments(defaultRouteAssignments());
        selected = 'CF-1044';
        $('storageWarning').hidden = true;
        ['jobSearch', 'historySearch'].forEach(id => {
            $(id).value = '';
        });
        $('activeFilter').value = 'all';
        $('jobSort').value = 'id';
        save();
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
        if (event.key === KEY || event.key === null) {
            const updated = read();
            if (updated) {
                state = updated;
                render();
                toast('Demo progress updated from another tab.');
            } else if (event.newValue === null) {
                state = seed();
                save();
                render();
            }
        }
    });
    render();
    nav();
})();
