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
        map, markers, bounds, toastTimer;

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
        return `<article class="order-card ${selected === job.id ? 'selected' : ''}"><div class="card-top"><h3>${job.id}</h3><span class="fee">${money(job.fee)}</span></div><div class="card-route"><div><small>Pickup</small><p>${esc(job.pickup.address)}</p></div><div><small>Drop-off</small><p>${esc(job.drop.address)}</p></div></div><p class="card-meta">${job.item} · ${job.weight} kg${workflow.status === 'delivered' ? ' · '+date(workflow.events[2].at) : ''}</p><div class="card-bottom">${badge(workflow.status)}<button class="btn btn-outline" data-view="${job.id}" aria-label="View details for ${job.id}">View details <span aria-hidden="true">↗</span></button></div></article>`;
    }

    function match(job, query) {
        return [job.id, job.item, job.pickup.address, job.drop.address, job.pickup.name, job
            .drop.name
        ].join(' ').toLowerCase().includes(query.trim().toLowerCase());
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
            b) => Date.parse(state.jobs[b.id].events[2].at) - Date.parse(state.jobs[a.id]
                .events[2].at));
        $('statAvailable').textContent = $('availableCount').textContent = available.length;
        $('statActive').textContent = $('activeCount').textContent = active.length;
        $('statCompleted').textContent = history.length;
        $('statEarnings').textContent = money(history.reduce((sum, j) => sum + j.fee, 0));
        const found = available.filter(j => match(j, $('jobSearch').value));
        found.sort((a, b) => $('jobSort').value === 'pay' ? b.fee - a.fee : $('jobSort')
            .value === 'weight' ? a.weight - b.weight : a.id.localeCompare(b.id));
        list('availableList', found, available.length ? 'No matching jobs' :
            'All jobs have been accepted', available.length ?
            'Try another ID, address or package.' :
            'Check your active deliveries below. Reset the demo to explore again.');
        list('activeList', active.filter(j => $('activeFilter').value === 'all' || state.jobs[j
                .id].status === $('activeFilter').value),
            'No active deliveries in this view',
            'Accept an available job or choose a different status filter.');
        list('historyList', history.filter(j => match(j, $('historySearch').value)),
            'No completed deliveries in this view',
            'Completed jobs appear here. Try clearing your search.');
    }

    function stop(point, type) {
        return `<div class="stop ${type === 'drop' ? 'drop' : ''}"><span class="stop-letter">${type === 'drop' ? 'B' : 'A'}</span><h4>${type === 'drop' ? 'Deliver to' : 'Pick up from'}</h4><p><strong>${esc(point.name)}</strong></p><p>${esc(point.address)}</p><p class="subtle">${esc(point.contact)}</p><p class="subtle">GPS: ${point.coords.join(', ')}</p></div>`;
    }

    function renderDetails() {
        const job = catalog.find(j => j.id === selected),
            workflow = state.jobs[selected];
        $('deliveryDetails').innerHTML =
            `<div class="detail-top"><h3>${job.id}</h3>${badge(workflow.status)}</div><p class="package">${job.item} · ${job.weight} kg · <strong>${money(job.fee)} delivery fee</strong><br>${job.window}</p>${stop(job.pickup,'pickup')}${stop(job.drop,'drop')}<div class="delivery-note"><strong>Handling instructions</strong><br>${esc(job.note)}<br><span>Names and pickup windows are illustrative.</span></div><ol class="progress" aria-label="Delivery progress">${['accepted','picked_up','delivered'].map(s=>`<li class="${workflow.events.some(e=>e.status === s) ? 'done' : ''}">${labels[s]}</li>`).join('')}</ol>${next[workflow.status] ? `<button class="btn btn-primary detail-action" data-advance="${job.id}" data-expected="${workflow.status}">${actions[workflow.status]}</button>` : '<p class="order-status status-delivered">Delivery completed · saved to history</p>'}<div class="timeline">${workflow.events.map(e=>`<p>${labels[e.status]} · ${date(e.at)}</p>`).join('')}</div>`;
        renderMap(job);
    }

    function renderMap(job) {
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
        L.polyline([job.pickup.coords, job.drop.coords], {
            color: '#64748b',
            weight: 2,
            dashArray: '6 8'
        }).addTo(markers);
        bounds = L.latLngBounds([job.pickup.coords, job.drop.coords]);
        map.invalidateSize();
        map.fitBounds(bounds, {
            padding: [45, 45],
            maxZoom: 15
        });
        $('mapMessage').textContent =
            `${job.id} · Illustrative pickup and drop-off locations in Porto.`;
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

    function advance(id, expected) {
        // Re-read before changing state to avoid acting on a stale open tab.
        if (persistence) state = read() || state;
        const workflow = state.jobs[id];
        if (!workflow || workflow.status !== expected || !next[expected]) {
            render();
            toast('This delivery has already changed. Review its current status.');
            return;
        }
        workflow.status = next[expected];
        const last = workflow.events.at(-1);
        workflow.events.push({
            status: workflow.status,
            at: new Date(Math.max(Date.now(), last ? Date.parse(last.at) : 0))
                .toISOString()
        });
        selected = id;
        save();
        render();
        toast(
            `${id}: ${labels[workflow.status]}.${workflow.status === 'delivered' ? ' Added to delivery history.' : ''}`);
        const target = $('deliveryDetails').querySelector('button') || $('deliveryDetails');
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({
            preventScroll: true
        });
    }
    document.addEventListener('click', async event => {
        const view = event.target.closest('[data-view]');
        if (view) {
            selected = view.dataset.view;
            render();
            location.hash = 'details';
            $('deliveryDetails').setAttribute('tabindex', '-1');
            $('deliveryDetails').focus({
                preventScroll: true
            });
            $('details').scrollIntoView();
            return;
        }
        const action = event.target.closest('[data-advance]');
        if (action) {
            const {
                advance: id,
                expected
            } = action.dataset;
            if (expected === 'picked_up' && !(await confirmAction(
                    'Confirm delivery',
                    `Confirm that ${id} has been handed to the recipient. This moves the job to your delivery history.`,
                    'Confirm delivered'))) return;
            advance(id, expected);
        }
    });
    $('resetDemo').addEventListener('click', async () => {
        if (!(await confirmAction('Reset demo data?',
                'This replaces only CourierFlow courier demo progress in this browser with the original sample deliveries.',
                'Reset demo'))) return;
        state = seed();
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
    ['jobSort', 'activeFilter'].forEach(id => $(id).addEventListener('change', renderLists));
    $('fitMap').addEventListener('click', () => {
        if (map && bounds) map.fitBounds(bounds, {
            padding: [45, 45],
            maxZoom: 15
        });
    });

    function nav() {
        const section = location.hash.slice(1) || 'dashboard';
        document.querySelectorAll('[data-section]').forEach(link => {
            const active = link.dataset.section === section;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
    }
    window.addEventListener('hashchange', nav);
    window.addEventListener('storage', event => {
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
