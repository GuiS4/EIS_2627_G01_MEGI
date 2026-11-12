/* CourierFlow local admin demo. No authentication or dispatch API.
   Contacts are fictional. This store is independent of the courier demo. */
(() => {
    'use strict';
    if (sessionStorage.getItem('courierflow.demo.role') !== 'admin') {
        window.location.replace('login.html');
        return;
    }
    const KEY = 'courierflow.admin.demo.v1';
    const $ = id => document.getElementById(id);
    const esc = value => String(value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } [ch]));
    const statuses = {
        available: 'Available',
        busy: 'On delivery',
        offline: 'Unavailable',
        unassigned: 'Unassigned',
        accepted: 'Accepted',
        picked_up: 'Picked up',
        delivered: 'Delivered'
    };
    const badge = status => `<span class="badge badge-${status}">${statuses[status]}</span>`;
    const activeParcels = id => state.parcels.filter(p => p.courierId === id && p.status !== 'delivered');
    const courierName = id => state.couriers.find(c => c.id === id)?.name || 'Unassigned';
    const vehicleFor = id => state.vehicles.find(v => v.courierId === id);
    const seed = () => ({
        version: 1,
        couriers: [{
            id: 'CR-001',
            name: 'Alex Silva',
            phone: '+351 000 000 101',
            email: 'alex.silva@example.com',
            status: 'busy'
        }, {
            id: 'CR-002',
            name: 'Maria Costa',
            phone: '+351 000 000 102',
            email: 'maria.costa@example.com',
            status: 'busy'
        }, {
            id: 'CR-003',
            name: 'Daniel Santos',
            phone: '+351 000 000 103',
            email: 'daniel.santos@example.com',
            status: 'available'
        }, {
            id: 'CR-004',
            name: 'Sofia Pereira',
            phone: '+351 000 000 104',
            email: 'sofia.pereira@example.com',
            status: 'offline'
        }],
        vehicles: [{
            id: 'V-001',
            model: 'Renault Kangoo',
            plate: 'AA-12-CF',
            type: 'Van · 650 kg',
            courierId: 'CR-001'
        }, {
            id: 'V-002',
            model: 'Peugeot Partner',
            plate: 'AB-34-CF',
            type: 'Van · 750 kg',
            courierId: 'CR-002'
        }, {
            id: 'V-003',
            model: 'Citroën Berlingo',
            plate: 'AC-56-CF',
            type: 'Van · 650 kg',
            courierId: null
        }, {
            id: 'V-004',
            model: 'Toyota Proace City',
            plate: 'AD-78-CF',
            type: 'Van · 700 kg',
            courierId: null
        }],
        parcels: [{
            id: 'CF-1041',
            item: 'Documents',
            pickup: 'Praça da Liberdade, Porto',
            drop: 'Praça da Ribeira, Porto',
            status: 'unassigned',
            courierId: null
        }, {
            id: 'CF-1042',
            item: 'Clothing',
            pickup: 'Rua de Santa Catarina, Porto',
            drop: 'Rua de Dom Manuel II, Porto',
            status: 'accepted',
            courierId: 'CR-001'
        }, {
            id: 'CF-1043',
            item: 'Electronics',
            pickup: 'Praça de Mouzinho de Albuquerque, Porto',
            drop: 'Avenida dos Aliados, Porto',
            status: 'unassigned',
            courierId: null
        }, {
            id: 'CF-1044',
            item: 'Books',
            pickup: 'Rua das Carmelitas, Porto',
            drop: 'Campo 24 de Agosto, Porto',
            status: 'accepted',
            courierId: 'CR-001'
        }, {
            id: 'CF-1039',
            item: 'Art supplies',
            pickup: 'Rua de Cedofeita, Porto',
            drop: 'Rua de Miguel Bombarda, Porto',
            status: 'picked_up',
            courierId: 'CR-002'
        }, {
            id: 'CF-1036',
            item: 'Documents',
            pickup: 'Rua de Júlio Dinis, Porto',
            drop: 'Praça da Trindade, Porto',
            status: 'delivered',
            courierId: 'CR-003'
        }]
    });

    // Translate labels from the earlier demo without changing assignments or contacts.
    function translateStoredDemo(data) {
        const legacyItems = {
            "Dokumenty": "Documents",
            "Odzie\u017c": "Clothing",
            "Elektronika": "Electronics",
            "Ksi\u0105\u017cki": "Books",
            "Materia\u0142y plastyczne": "Art supplies"
        };
        data.parcels.forEach(parcel => {
            parcel.item = legacyItems[parcel.item] || parcel.item;
        });
        data.vehicles.forEach(vehicle => {
            vehicle.type = vehicle.type.replace(/^Furgon(?= ·)/, 'Van');
        });
        return data;
    }

    // STORAGE AND DATA INTEGRITY
    function valid(data) {
        if (!data || data.version !== 1 || !['couriers', 'vehicles', 'parcels'].every(k => Array.isArray(
                data[k]))) return false;
        const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(value);
        const text = value => typeof value === 'string' && value.length > 0 && value.length <= 300;
        if (!['couriers', 'vehicles', 'parcels'].every(k => data[k].every(x => x && safeId(x.id)) &&
                new Set(data[k].map(x => x.id)).size === data[k].length)) return false;
        const ids = new Set(data.couriers.map(c => c.id));
        if (!data.couriers.every(c => text(c.name) && text(c.phone) && /^[+0-9() .-]{5,30}$/.test(c
                .phone) && text(c.email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) && ['available',
                'busy', 'offline'
            ].includes(c.status))) return false;
        const assigned = data.vehicles.filter(v => v.courierId !== null).map(v => v.courierId);
        if (new Set(assigned).size !== assigned.length) return false;
        if (!data.vehicles.every(v => text(v.model) && text(v.plate) && text(v.type) && (v.courierId ===
                null || ids.has(v.courierId)))) return false;
        if (!data.parcels.every(p => text(p.item) && text(p.pickup) && text(p.drop) && ['unassigned',
                'accepted', 'picked_up', 'delivered'
            ].includes(p.status) && (p.status === 'unassigned' ? p.courierId === null : ids.has(p
                .courierId)))) return false;
        return data.couriers.every(c => c.status !== 'offline' || !data.parcels.some(p => p.courierId ===
            c.id && p.status !== 'delivered'));
    }

    let canSave = true;

    function warn(message) {
        $('storageWarning').textContent = message;
        $('storageWarning').hidden = false;
    }

    function read() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return seed();
            const data = JSON.parse(raw);
            if (!valid(data)) throw new Error('Invalid admin data');
            return translateStoredDemo(data);
        } catch {
            canSave = false;
            warn(
                'Saved data could not be loaded. Showing demo data. Changes will stay in memory; reset the demo to enable saving again.');
            return seed();
        }
    }

    let state = read();
    let toastTimer;

    function toast(message) {
        $('toast').textContent = message;
        $('toast').hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            $('toast').hidden = true;
        }, 4500);
    }

    function save(message) {
        if (canSave) {
            try {
                localStorage.setItem(KEY, JSON.stringify(state));
            } catch {
                canSave = false;
                warn(
                    'Browser storage is unavailable. Changes will last only until this page is reloaded or closed.');
            }
        }
        render();
        toast(message + (canSave ? '' : ' Change kept in this page only.'));
    }

    function defaultSeedVehicles() {
        return [
            {
                id: 'V-001',
                courier_id: 'CR-001',
                submitted_by_courier_id: 'CR-001',
                submitted_by_courier_name: 'Alex Silva',
                type_name: 'Van',
                model: 'Renault Kangoo',
                license_plate: 'AA-12-CF',
                max_weight_kg: 650,
                max_vol_m3: 3.3,
                insurance_expiry_date: '2027-08-15',
                inspection_expiry_date: '2027-06-20',
                insurance_expiry_doc: 'kangoo_insurance.pdf',
                inspection_expiry_doc: 'kangoo_inspection.pdf',
                approval_status: 'Approved',
                approved_by: 'Admin (admin@admin.demo)',
                doc_updated_at: '2026-10-15T10:00:00.000Z',
                created_at: '2026-10-10T09:00:00.000Z'
            },
            {
                id: 'V-002',
                courier_id: 'CR-002',
                submitted_by_courier_id: 'CR-002',
                submitted_by_courier_name: 'Maria Costa',
                type_name: 'Van',
                model: 'Peugeot Partner',
                license_plate: 'AB-34-CF',
                max_weight_kg: 750,
                max_vol_m3: 3.7,
                insurance_expiry_date: '2027-09-10',
                inspection_expiry_date: '2027-07-01',
                insurance_expiry_doc: 'partner_insurance.pdf',
                inspection_expiry_doc: 'partner_inspection.pdf',
                approval_status: 'Approved',
                approved_by: 'Admin (admin@admin.demo)',
                doc_updated_at: '2026-10-16T11:30:00.000Z',
                created_at: '2026-10-12T14:20:00.000Z'
            },
            {
                id: 'V-003',
                courier_id: 'CR-001',
                submitted_by_courier_id: 'CR-001',
                submitted_by_courier_name: 'Alex Silva',
                type_name: 'Motorcycle',
                model: 'Honda PCX 125',
                license_plate: 'MC-11-CF',
                max_weight_kg: 2.0,
                max_vol_m3: 0.003,
                insurance_expiry_date: '2027-05-12',
                inspection_expiry_date: '2027-04-18',
                insurance_expiry_doc: 'pcx_insurance.pdf',
                inspection_expiry_doc: 'pcx_inspection.pdf',
                approval_status: 'Approved',
                approved_by: 'Admin (admin@admin.demo)',
                doc_updated_at: '2026-10-18T08:15:00.000Z',
                created_at: '2026-10-18T08:00:00.000Z'
            },
            {
                id: 'V-004',
                courier_id: 'CR-002',
                submitted_by_courier_id: 'CR-002',
                submitted_by_courier_name: 'Maria Costa',
                type_name: 'Bicycle',
                model: 'Urban Cargo Bike',
                license_plate: 'BK-05-CF',
                max_weight_kg: 1.0,
                max_vol_m3: 0.0018,
                insurance_expiry_date: '2027-11-30',
                inspection_expiry_date: '2027-11-30',
                insurance_expiry_doc: 'bike_insurance.pdf',
                inspection_expiry_doc: 'bike_inspection.pdf',
                approval_status: 'Approved',
                approved_by: 'Admin (admin@admin.demo)',
                doc_updated_at: '2026-10-20T09:45:00.000Z',
                created_at: '2026-10-19T16:10:00.000Z'
            },
            {
                id: 'V-005',
                courier_id: 'CR-003',
                submitted_by_courier_id: 'CR-003',
                submitted_by_courier_name: 'Daniel Santos',
                type_name: 'Van',
                model: 'Citroën Berlingo',
                license_plate: 'AC-56-CF',
                max_weight_kg: 650,
                max_vol_m3: 3.3,
                insurance_expiry_date: '2027-10-01',
                inspection_expiry_date: '2027-08-22',
                insurance_expiry_doc: 'berlingo_insurance.pdf',
                inspection_expiry_doc: 'berlingo_inspection.pdf',
                approval_status: 'Pending',
                approved_by: null,
                doc_updated_at: '2026-10-25T15:00:00.000Z',
                created_at: '2026-10-25T15:00:00.000Z'
            }
        ];
    }

    function getSubmittedVehicles() {
        try {
            const raw = localStorage.getItem('cms_vehicles');
            const seededFlag = localStorage.getItem('cms_vehicles_seeded_v2');
            if (!raw) {
                const initial = defaultSeedVehicles();
                localStorage.setItem('cms_vehicles', JSON.stringify(initial));
                localStorage.setItem('cms_vehicles_seeded_v2', '1');
                return initial;
            }
            const data = JSON.parse(raw);
            const list = Array.isArray(data) ? data : [];
            if (!seededFlag) {
                const defaults = defaultSeedVehicles();
                const existingPlates = new Set(list.map(v => (v.license_plate || '').toUpperCase()));
                defaults.forEach(d => {
                    if (!existingPlates.has(d.license_plate.toUpperCase())) {
                        list.push(d);
                    }
                });
                localStorage.setItem('cms_vehicles', JSON.stringify(list));
                localStorage.setItem('cms_vehicles_seeded_v2', '1');
            }
            return list;
        } catch {
            return defaultSeedVehicles();
        }
    }

    function saveSubmittedVehicles(list) {
        try {
            localStorage.setItem('cms_vehicles', JSON.stringify(list));
        } catch {
            toast('Unable to save vehicle approval status.');
        }
    }

    function getRouteAssignments() {
        try {
            const data = JSON.parse(localStorage.getItem('cms_route_assignments') || '{}');
            return data && typeof data === 'object' ? data : {};
        } catch {
            return {};
        }
    }

    function getCourierSubmitterName(vehicleOrId) {
        if (vehicleOrId && typeof vehicleOrId === 'object') {
            if (vehicleOrId.submitted_by_courier_name) return vehicleOrId.submitted_by_courier_name;
            vehicleOrId = vehicleOrId.submitted_by_courier_id || vehicleOrId.courier_id;
        }
        const courierId = vehicleOrId;
        if (!courierId || courierId === 'demo-courier') return 'Alex Silva';
        const stateCourier = state.couriers.find(c => c.id === courierId);
        if (stateCourier) return stateCourier.name;
        try {
            const users = JSON.parse(localStorage.getItem('cms_users') || '[]');
            const found = users.find(u => u.id === courierId);
            if (found && found.name) return found.name;
        } catch { /* ignore */ }
        return courierId;
    }

    // DASHBOARD AND COURIER CARDS
    function renderStats() {
        const allVehicles = getSubmittedVehicles();
        const approvedCount = allVehicles.filter(v => v.approval_status === 'Approved').length;
        const pendingCount = allVehicles.filter(v => v.approval_status === 'Pending').length;
        const data = [
            ['Couriers', state.couriers.length,
                `${state.couriers.filter(c => c.status === 'available').length} available for assignment`
            ],
            ['Active parcels', state.parcels.filter(p => ['accepted', 'picked_up'].includes(p
                .status)).length, 'Currently handled by your team'],
            ['Unassigned', state.parcels.filter(p => !p.courierId).length,
                'Waiting for assignment'
            ],
            ['Approved vehicles', approvedCount,
                `${pendingCount} pending · shared across couriers`
            ]
        ];
        $('stats').innerHTML = data.map(([title, value, note]) =>
            `<div class="dashboard-card"><h3>${title}</h3><strong>${value}</strong><p>${note}</p></div>`
        ).join('');
        $('navCount').textContent = state.couriers.length;
    }

    function renderCouriers() {
        const query = $('courierSearch').value.trim().toLocaleLowerCase('en');
        const filter = $('courierFilter').value;
        const allVehicles = getSubmittedVehicles();
        const found = state.couriers.filter(c => (filter === 'all' || c.status === filter) && [c.name, c
            .phone, c.email, c.id
        ].join(' ').toLocaleLowerCase('en').includes(query));
        $('courierList').innerHTML = found.map(c => {
            const submittedByCourier = allVehicles.filter(v => (v.submitted_by_courier_id || v.courier_id) === c.id);
            const parcels = activeParcels(c.id);
            const initials = c.name.trim().split(/\s+/).map(w => Array.from(w)[0]).slice(0, 2)
                .join('');
            return `<article class="courier-card">
                <div class="courier-heading"><span class="courier-avatar" aria-hidden="true">${esc(initials)}</span><div><h3>${esc(c.name)}</h3><p class="small">${c.id}</p></div>${badge(c.status)}</div>
                <div class="contact"><a href="tel:${esc(c.phone.replace(/[^+0-9]/g, ''))}">${esc(c.phone)}</a><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>
                <p class="card-label">Submitted vehicles · ${submittedByCourier.length}</p>
                <div class="parcel-chips">${submittedByCourier.length ? submittedByCourier.map(v => `<span class="parcel-chip">${esc(v.model)} (${esc(v.license_plate)}) · ${esc(v.approval_status)}</span>`).join('') : '<p class="small">No vehicles submitted</p>'}</div>
                <p class="card-label">Active parcels · ${parcels.length}</p>
                <div class="parcel-chips">${parcels.length ? parcels.map(p => `<a class="parcel-chip" href="#parcel-${p.id}">${p.id} · ${statuses[p.status]}</a>`).join('') : '<p class="small">No active parcels</p>'}</div>
                <div class="card-actions"><button class="text-button" data-action="edit" data-id="${c.id}" aria-label="Edit courier: ${esc(c.name)}">Edit courier</button><button class="text-button danger" data-action="delete" data-id="${c.id}" aria-label="Delete courier: ${esc(c.name)}">Delete</button></div>
            </article>`;
        }).join('') || '<p class="empty-state">No couriers match your filters.</p>';
    }

    function renderParcels() {
        const filter = $('parcelFilter').value;
        const found = state.parcels.filter(p => filter === 'all' || p.status === filter);
        $('parcelList').innerHTML = found.map(p => `<tr id="parcel-${p.id}">
            <td><strong>${p.id}</strong><p class="small">${esc(p.item)}</p></td>
            <td class="route">${esc(p.pickup)}<span>→ ${esc(p.drop)}</span></td>
            <td>${badge(p.status)}</td><td>${esc(courierName(p.courierId))}</td>
            <td>${p.status === 'delivered' ? '<span class="small">Completed</span>' : `<button class="btn btn-outline" data-action="parcel" data-id="${p.id}" aria-label="Assign courier to ${p.id}">${p.courierId ? 'Change' : 'Assign'}</button>`}</td>
        </tr>`).join('') || '<tr><td colspan="5">No parcels in this view.</td></tr>';
    }

    function renderVehicles() {
        const container = $('vehicleList');
        if (!container) return;

        const filter = $('approvalFilter') ? $('approvalFilter').value : 'all';
        const allSubmitted = getSubmittedVehicles();
        const routeAssignments = getRouteAssignments();
        const filtered = allSubmitted.filter(v => filter === 'all' || v.approval_status === filter);

        if (!filtered.length) {
            container.innerHTML = `<p class="empty-state">${allSubmitted.length ? 'No vehicles match the selected approval status filter.' : 'No vehicles have been submitted by couriers yet.'}</p>`;
            return;
        }

        container.innerHTML = filtered.map(v => {
            const statusClass = v.approval_status === 'Approved' ? 'available' :
                v.approval_status === 'Rejected' ? 'rejected' : 'busy';
            const submitter = getCourierSubmitterName(v);
            const activeRoutesForVehicle = Object.values(routeAssignments).filter(r => r && r.vehicle_id === v.id);

            return `<article class="vehicle-card">
                <span class="badge badge-${statusClass}">${esc(v.approval_status)}</span>
                <h3>${esc(v.model)}</h3>
                <span class="plate">${esc(v.license_plate)}</span>
                <p>${esc(v.type_name)} · Submitted by <strong>${esc(submitter)}</strong></p>

                <div class="submission-details">
                    <div><span>Max Weight</span><strong>${esc(v.max_weight_kg)} kg</strong></div>
                    <div><span>Max Volume</span><strong>${esc(v.max_vol_m3)} m³</strong></div>
                    <div><span>Insurance Exp.</span><strong>${esc(v.insurance_expiry_date)}</strong></div>
                    <div><span>Inspection Exp.</span><strong>${esc(v.inspection_expiry_date)}</strong></div>
                    <div><span>Insurance Doc</span><strong>${esc(v.insurance_expiry_doc)}</strong></div>
                    <div><span>Inspection Doc</span><strong>${esc(v.inspection_expiry_doc)}</strong></div>
                </div>

                <p class="small" style="margin-top: 8px;">
                    ${v.approval_status === 'Approved'
                        ? (activeRoutesForVehicle.length
                            ? `Shared pool · Used on ${activeRoutesForVehicle.map(r => `${esc(r.order_id)} (${esc(r.used_by_courier_name || 'Courier')})`).join(', ')}`
                            : 'Shared pool · Available to all couriers for compatible orders')
                        : v.approval_status === 'Pending'
                            ? 'Pending admin approval before couriers can select it'
                            : 'Rejected · Not selectable by couriers'}
                </p>
                ${v.approved_by ? `<p class="small">Reviewed by: <strong>${esc(v.approved_by)}</strong></p>` : ''}

                <div class="approval-actions">
                    <button class="btn btn-approve" data-action="approve-vehicle" data-id="${esc(v.id)}" ${v.approval_status === 'Approved' ? 'disabled' : ''}>
                        Approve
                    </button>
                    <button class="btn btn-reject" data-action="reject-vehicle" data-id="${esc(v.id)}" ${v.approval_status === 'Rejected' ? 'disabled' : ''}>
                        Reject
                    </button>
                </div>
            </article>`;
        }).join('');
    }

    function updateVehicleApproval(id, newStatus) {
        const list = getSubmittedVehicles();
        const vehicle = list.find(v => String(v.id) === String(id));
        if (!vehicle) return;

        vehicle.approval_status = newStatus;
        vehicle.approved_by = 'Admin (admin@admin.demo)';
        vehicle.doc_updated_at = new Date().toISOString();

        saveSubmittedVehicles(list);
        render();
        toast(`Vehicle ${vehicle.license_plate} (${vehicle.model}) ${newStatus.toLowerCase()}.`);
    }

    function render() {
        renderStats();
        renderCouriers();
        renderParcels();
        renderVehicles();
    }

    // COURIER EDITOR
    function editCourier(id) {
        const form = $('courierForm');
        form.reset();
        Array.from(form.elements).forEach(field => {
            if (field.setCustomValidity) field.setCustomValidity('');
        });
        $('formError').textContent = '';
        const courier = state.couriers.find(c => c.id === id);
        $('courierTitle').textContent = courier ? 'Edit courier' : 'Add courier';
        for (const key of ['id', 'name', 'phone', 'email', 'status']) form.elements.namedItem(key).value =
            courier?.[key] || (key === 'status' ? 'available' : '');
        $('courierDialog').showModal();
    }

    // Use English validation messages regardless of the browser's interface language.
    $('courierForm').addEventListener('invalid', event => {
        const field = event.target;
        const messages = {
            name: 'Enter the courier’s full name.',
            phone: 'Enter a valid phone number using digits, spaces and an optional + sign.',
            email: 'Enter a valid email address.'
        };
        field.setCustomValidity(messages[field.name] || 'Please complete this field.');
    }, true);
    $('courierForm').addEventListener('input', event => {
        if (event.target.setCustomValidity) event.target.setCustomValidity('');
    });

    $('courierForm').addEventListener('submit', event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        for (const key of ['name', 'phone', 'email']) data[key] = data[key].trim();
        const existing = state.couriers.find(c => c.id === data.id);
        const error = message => {
            $('formError').textContent = message;
        };
        if (!data.name || !/^[+0-9() .-]{5,30}$/.test(data.phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(data.email)) return error(
            'Enter a full name, a valid phone number and a valid email address.');
        if (data.id && !existing) return error(
            'This courier has been deleted. Close the form and refresh the list.');
        if (data.status === 'offline' && existing && activeParcels(existing.id).length)
            return error('Reassign active parcels to another courier first.');
        if (state.couriers.some(c => c.id !== data.id && c.email.toLowerCase() === data.email
                .toLowerCase())) return error(
            'This email address is already assigned to another courier.');
        if (existing) Object.assign(existing, data);
        else state.couriers.push({
            ...data,
            id: `CR-${crypto.randomUUID()}`
        });
        $('courierDialog').close();
        save(existing ? 'Courier details updated.' : 'New courier added.');
    });

    // PARCEL ASSIGNMENTS
    function assignment(kind, id) {
        if (kind !== 'parcel') return;
        const form = $('assignmentForm');
        const select = $('assignmentSelect');
        form.elements.namedItem('kind').value = kind;
        form.elements.namedItem('target').value = id;
        $('assignmentError').textContent = '';

        const target = state.parcels.find(x => x.id === id);
        if (!target || target.status === 'delivered') return;

        $('assignmentTitle').textContent = 'Assign parcel';
        $('assignmentDescription').textContent =
            `${target.id} · ${target.item}. Unavailable couriers cannot be selected. A picked-up parcel must remain assigned to a courier.`;

        const current = target.courierId || '';
        const options = state.couriers.map(c => ({
            id: c.id,
            label: `${c.name} · ${statuses[c.status]}`,
            disabled: c.status === 'offline'
        }));

        select.innerHTML =
            `<option value="" ${target.status === 'picked_up' ? 'disabled' : ''}>Unassigned</option>` +
            options.map(o =>
                `<option value="${o.id}" ${o.disabled ? 'disabled' : ''}>${esc(o.label)}</option>`).join(
                '');
        select.value = current;
        $('assignmentDialog').showModal();
    }

    $('assignmentForm').addEventListener('submit', event => {
        event.preventDefault();
        const {
            kind,
            target,
            selection
        } = Object.fromEntries(new FormData(event.currentTarget));
        const error = message => {
            $('assignmentError').textContent = message;
        };
        if (kind === 'parcel') {
            const parcel = state.parcels.find(p => p.id === target);
            if (!parcel || parcel.status === 'delivered') return error(
                'This parcel cannot be changed.');
            const courier = state.couriers.find(c => c.id === selection);
            if (selection && (!courier || courier.status === 'offline')) return error(
                'Select an available courier.');
            if (!selection && parcel.status === 'picked_up') return error(
                'A picked-up parcel must have an assigned courier.');
            parcel.courierId = selection || null;
            if (parcel.status !== 'picked_up') parcel.status = selection ? 'accepted' :
                'unassigned';
        } else return error('Unknown assignment type.');
        $('assignmentDialog').close();
        save('Assignment saved.');
    });

    // CONFIRMATION AND EVENTS
    function confirmAction(title, text) {
        $('confirmTitle').textContent = title;
        $('confirmText').textContent = text;
        const dialog = $('confirmDialog');
        dialog.returnValue = 'cancel';
        dialog.showModal();
        return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog
            .returnValue === 'confirm'), {
            once: true
        }));
    }

    async function deleteCourier(id) {
        const courier = state.couriers.find(c => c.id === id);
        if (!courier) return;
        if (state.parcels.some(p => p.courierId === id)) {
            toast(
                'A courier with assigned parcels or delivery history cannot be deleted. You can mark them as unavailable after reassigning their active deliveries.');
            return;
        }
        if (!await confirmAction('Delete courier?',
                `${courier.name} will be deleted from the courier directory.`)) return;
        if (state.parcels.some(p => p.courierId === id)) return toast(
            'Assignments have changed. Review the courier’s parcels.');
        state.couriers = state.couriers.filter(c => c.id !== id);
        save('Courier deleted.');
    }

    document.addEventListener('click', event => {
        const close = event.target.closest('[data-close]');
        if (close) $(close.dataset.close).close();
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const {
            action,
            id
        } = button.dataset;
        if (action === 'edit') editCourier(id);
        else if (action === 'delete') deleteCourier(id);
        else if (action === 'approve-vehicle') updateVehicleApproval(id, 'Approved');
        else if (action === 'reject-vehicle') updateVehicleApproval(id, 'Rejected');
        else assignment(action, id);
    });
    $('addCourier').addEventListener('click', () => editCourier());
    $('courierSearch').addEventListener('input', renderCouriers);
    $('courierFilter').addEventListener('change', renderCouriers);
    $('parcelFilter').addEventListener('change', renderParcels);
    if ($('approvalFilter')) $('approvalFilter').addEventListener('change', renderVehicles);
    $('resetDemo').addEventListener('click', async () => {
        if (!await confirmAction('Reset demo data?',
                'Couriers, parcel assignments and vehicle registrations in the admin dashboard will return to their initial values.'
            )) return;
        state = seed();
        try {
            localStorage.setItem('cms_vehicles', JSON.stringify(defaultSeedVehicles()));
            localStorage.setItem('cms_vehicles_seeded_v2', 'true');
        } catch (_) {}
        canSave = true;
        $('storageWarning').hidden = true;
        $('courierSearch').value = '';
        $('courierFilter').value = 'all';
        $('parcelFilter').value = 'all';
        if ($('approvalFilter')) $('approvalFilter').value = 'all';
        save('Demo data restored.');
    });

    function nav() {
        const section = location.hash.slice(1) || 'overview';
        document.querySelectorAll('[data-nav]').forEach(link => {
            const active = link.dataset.nav === section || (section.startsWith('parcel-') && link
                .dataset.nav === 'parcels');
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
        if (section.startsWith('parcel-')) {
            $('parcelFilter').value = 'all';
            renderParcels();
            requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView());
        }
    }
    window.addEventListener('hashchange', nav);
    window.addEventListener('storage', event => {
        if (event.key === 'cms_vehicles' || event.key === 'cms_route_assignments') {
            render();
            toast('Vehicle pool or route assignments updated.');
            return;
        }
        if (event.key !== KEY && event.key !== null) return;
        state = read();
        document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
        render();
        toast('Data changed in another tab. The list has been refreshed.');
    });
    render();
    nav();
})();
