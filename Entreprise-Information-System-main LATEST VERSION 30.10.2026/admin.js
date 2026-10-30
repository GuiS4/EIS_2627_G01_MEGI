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

    // DASHBOARD AND COURIER CARDS
    function renderStats() {
        const data = [
            ['Couriers', state.couriers.length,
                `${state.couriers.filter(c => c.status === 'available').length} available for assignment`
            ],
            ['Active parcels', state.parcels.filter(p => ['accepted', 'picked_up'].includes(p
                .status)).length, 'Currently handled by your team'],
            ['Unassigned', state.parcels.filter(p => !p.courierId).length,
                'Waiting for assignment'
            ],
            ['Available vehicles', state.vehicles.filter(v => !v.courierId).length,
                `Fleet: ${state.vehicles.length} vehicles`
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
        const found = state.couriers.filter(c => (filter === 'all' || c.status === filter) && [c.name, c
            .phone, c.email, c.id
        ].join(' ').toLocaleLowerCase('en').includes(query));
        $('courierList').innerHTML = found.map(c => {
            const car = vehicleFor(c.id);
            const parcels = activeParcels(c.id);
            const initials = c.name.trim().split(/\s+/).map(w => Array.from(w)[0]).slice(0, 2)
                .join('');
            return `<article class="courier-card">
                <div class="courier-heading"><span class="courier-avatar" aria-hidden="true">${esc(initials)}</span><div><h3>${esc(c.name)}</h3><p class="small">${c.id}</p></div>${badge(c.status)}</div>
                <div class="contact"><a href="tel:${esc(c.phone.replace(/[^+0-9]/g, ''))}">${esc(c.phone)}</a><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>
                <p class="card-label">Assigned vehicle</p>
                <div class="vehicle-assignment"><div><p><strong>${car ? esc(car.model) : 'No vehicle assigned'}</strong></p><p class="small">${car ? esc(car.plate) : 'Choose an available fleet vehicle'}</p></div><button class="btn btn-outline" data-action="vehicle" data-id="${c.id}" aria-label="Change vehicle for: ${esc(c.name)}">${car ? 'Change' : 'Assign'}</button></div>
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
        $('vehicleList').innerHTML = state.vehicles.map(v => `<article class="vehicle-card">
            <span class="badge badge-${v.courierId ? 'accepted' : 'available'}">${v.courierId ? 'Assigned' : 'Available'}</span>
            <h3>${esc(v.model)}</h3><span class="plate">${esc(v.plate)}</span><p>${esc(v.type)}</p>
            <p style="margin-top:12px">${v.courierId ? esc(courierName(v.courierId)) : 'Ready for assignment'}</p>
            <button class="btn btn-outline" data-action="driver" data-id="${v.id}" aria-label="Change courier for ${esc(v.model)} ${esc(v.plate)}">${v.courierId ? 'Change courier' : 'Assign courier'}</button>
        </article>`).join('');
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

    // VEHICLE AND PARCEL ASSIGNMENTS
    function assignment(kind, id) {
        const form = $('assignmentForm');
        const select = $('assignmentSelect');
        form.elements.namedItem('kind').value = kind;
        form.elements.namedItem('target').value = id;
        $('assignmentError').textContent = '';
        let options = [],
            current = '';
        if (kind === 'vehicle') {
            const courier = state.couriers.find(c => c.id === id);
            if (!courier) return;
            $('assignmentTitle').textContent = 'Assign vehicle';
            $('assignmentDescription').textContent =
                `${courier.name} — the selected vehicle will replace the current one. Vehicles assigned to other couriers are unavailable.`;
            current = vehicleFor(id)?.id || '';
            options = state.vehicles.map(v => ({
                id: v.id,
                label: `${v.model} · ${v.plate}${v.courierId && v.courierId !== id ? ' — assigned to: ' + courierName(v.courierId) : ''}`,
                disabled: !!v.courierId && v.courierId !== id
            }));
        } else {
            const isParcel = kind === 'parcel';
            const target = (isParcel ? state.parcels : state.vehicles).find(x => x.id === id);
            if (!target || (isParcel && target.status === 'delivered')) return;
            $('assignmentTitle').textContent = isParcel ? 'Assign parcel' :
                'Assign courier to vehicle';
            $('assignmentDescription').textContent = isParcel ?
                `${target.id} · ${target.item}. Unavailable couriers cannot be selected. A picked-up parcel must remain assigned to a courier.` :
                `${target.model} · ${target.plate}. Couriers who already have another vehicle cannot be selected.`;
            current = target.courierId || '';
            options = state.couriers.map(c => ({
                id: c.id,
                label: `${c.name}${isParcel ? ' · ' + statuses[c.status] : vehicleFor(c.id) && c.id !== current ? ' — already has a vehicle' : ''}`,
                disabled: isParcel ? c.status === 'offline' : !!vehicleFor(c.id) && c.id !==
                    current
            }));
        }
        const parcel = kind === 'parcel' ? state.parcels.find(p => p.id === id) : null;
        select.innerHTML =
            `<option value="" ${parcel?.status === 'picked_up' ? 'disabled' : ''}>${kind === 'vehicle' ? 'No vehicle' : 'Unassigned'}</option>` +
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
        if (kind === 'vehicle') {
            if (!state.couriers.some(c => c.id === target)) return error('Courier not found.');
            const car = state.vehicles.find(v => v.id === selection);
            if (selection && !car) return error('Selected vehicle not found.');
            if (car?.courierId && car.courierId !== target) return error(
                'This vehicle is already assigned to another courier.');
            state.vehicles.filter(v => v.courierId === target).forEach(v => {
                v.courierId = null;
            });
            if (car) car.courierId = target;
        } else if (kind === 'driver') {
            const car = state.vehicles.find(v => v.id === target);
            if (!car) return error('Vehicle not found.');
            if (selection && !state.couriers.some(c => c.id === selection)) return error(
                'Courier not found.');
            const currentCar = vehicleFor(selection);
            if (currentCar && currentCar.id !== target) return error(
                'This courier already has another vehicle. Release that vehicle first.');
            car.courierId = selection || null;
        } else if (kind === 'parcel') {
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
                `${courier.name} will be deleted and their vehicle will become available.`)) return;
        if (state.parcels.some(p => p.courierId === id)) return toast(
            'Assignments have changed. Review the courier’s parcels.');
        state.couriers = state.couriers.filter(c => c.id !== id);
        state.vehicles.filter(v => v.courierId === id).forEach(v => {
            v.courierId = null;
        });
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
        else assignment(action, id);
    });
    $('addCourier').addEventListener('click', () => editCourier());
    $('courierSearch').addEventListener('input', renderCouriers);
    $('courierFilter').addEventListener('change', renderCouriers);
    $('parcelFilter').addEventListener('change', renderParcels);
    $('resetDemo').addEventListener('click', async () => {
        if (!await confirmAction('Reset demo data?',
                'Couriers, parcel assignments and vehicle assignments in the admin dashboard will return to their initial values. The courier dashboard will not be affected.'
            )) return;
        state = seed();
        canSave = true;
        $('storageWarning').hidden = true;
        $('courierSearch').value = '';
        $('courierFilter').value = 'all';
        $('parcelFilter').value = 'all';
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
        if (event.key !== KEY && event.key !== null) return;
        state = read();
        document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
        render();
        toast('Data changed in another tab. The list has been refreshed.');
    });
    render();
    nav();
})();
