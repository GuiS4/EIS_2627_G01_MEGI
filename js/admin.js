/* CourierFlow Admin Panel — System governance, Staff approvals, personal information, and operational analytics. */
(() => {
    'use strict';

    const currentUser = (() => {
        try {
            return JSON.parse(sessionStorage.getItem('cms_current_user') || 'null');
        } catch {
            return null;
        }
    })();
    const demoRole = sessionStorage.getItem('courierflow.demo.role');

    if (demoRole !== 'admin' && (!currentUser || currentUser.role !== 'admin')) {
        window.location.replace('login.html');
        return;
    }

    const STAFF_KEY = 'courierflow.admin.staff.v1';
    const PROFILE_KEY = 'courierflow.admin.profile.v1';
    const $ = id => document.getElementById(id);

    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));

    const money = value => new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);

    const formatDateDDMMYYYY = value => {
        if (!value) return '—';
        const str = String(value).trim();
        const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
        if (isoMatch) {
            return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
        }
        const dt = new Date(str);
        if (!Number.isFinite(dt.getTime())) return str;
        const pad = n => String(n).padStart(2, '0');
        return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
    };

    const approvalBadge = status => {
        const cls = status === 'Approved' ? 'available' : status === 'Rejected' ? 'rejected' : 'busy';
        return `<span class="badge badge-${cls}">${esc(status || 'Pending')}</span>`;
    };

    const routeStatusLabels = {
        available: 'Available / Unassigned',
        unassigned: 'Available / Unassigned',
        accepted: 'Accepted (Route Prepared)',
        picked_up: 'Picked up (In Transit)',
        delivered: 'Delivered (Completed)'
    };

    const routeBadge = status => {
        const cls = status === 'delivered'
            ? 'delivered'
            : status === 'picked_up'
                ? 'picked_up'
                : status === 'accepted'
                    ? 'accepted'
                    : 'unassigned';
        return `<span class="badge badge-${cls}">${esc(routeStatusLabels[status] || status)}</span>`;
    };

    // =========================================================================
    // SEED DATA FOR STAFF GOVERNANCE & ADMIN PROFILE
    // =========================================================================
    function defaultAdminProfile() {
        return {
            name: currentUser?.name || 'Carlos Andrade',
            username: currentUser?.username || 'carlos.admin',
            email: currentUser?.email || 'admin@admin.demo',
            phone: '+351 910 100 001',
            nif: '219485730',
            department: 'System Governance & Platform Administration'
        };
    }

    function getAdminProfile() {
        try {
            const raw = localStorage.getItem(PROFILE_KEY);
            if (!raw) return defaultAdminProfile();
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? { ...defaultAdminProfile(), ...parsed } : defaultAdminProfile();
        } catch {
            return defaultAdminProfile();
        }
    }

    function saveAdminProfile(profile) {
        try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        } catch { /* ignore */ }
    }

    function seedStaff() {
        return {
            version: 1,
            staff: [
                {
                    id: 'ST-001',
                    name: 'Helena Martins',
                    username: 'helenamartins',
                    nif: '231948572',
                    phone: '+351 911 200 101',
                    email: 'helena.martins@courierflow.pt',
                    department: 'Fleet & Compliance Operations',
                    approval_status: 'Approved',
                    approved_by: 'Admin (admin@admin.demo)',
                    createdAt: '2026-09-14T09:00:00.000Z'
                },
                {
                    id: 'ST-002',
                    name: 'Ricardo Ferreira',
                    username: 'ricardoferreira',
                    nif: '248591034',
                    phone: '+351 911 200 102',
                    email: 'ricardo.ferreira@courierflow.pt',
                    department: 'Courier Validation & Dispatch',
                    approval_status: 'Approved',
                    approved_by: 'Admin (admin@admin.demo)',
                    createdAt: '2026-09-20T10:30:00.000Z'
                },
                {
                    id: 'ST-003',
                    name: 'Beatriz Sousa',
                    username: 'beatrizsousa',
                    nif: '259301847',
                    phone: '+351 911 200 103',
                    email: 'beatriz.sousa@courierflow.pt',
                    department: 'Certificate & Safety Auditing',
                    approval_status: 'Pending',
                    approved_by: null,
                    createdAt: '2026-11-09T14:15:00.000Z'
                },
                {
                    id: 'ST-004',
                    name: 'Miguel Rocha',
                    username: 'miguelrocha',
                    nif: '267482910',
                    phone: '+351 911 200 104',
                    email: 'miguel.rocha@courierflow.pt',
                    department: 'Regional Logistics Operations',
                    approval_status: 'Pending',
                    approved_by: null,
                    createdAt: '2026-11-11T11:45:00.000Z'
                }
            ]
        };
    }

    let canSave = true;
    let toastTimer;

    function warn(message) {
        if (!$('storageWarning')) return;
        $('storageWarning').textContent = message;
        $('storageWarning').hidden = false;
    }

    function toast(message) {
        if (!$('toast')) return;
        $('toast').textContent = message;
        $('toast').hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            $('toast').hidden = true;
        }, 4500);
    }

    function readStaffState() {
        try {
            const raw = localStorage.getItem(STAFF_KEY);
            if (!raw) return seedStaff();
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.staff)) return seedStaff();
            return parsed;
        } catch {
            canSave = false;
            warn('Saved Staff data could not be loaded. Showing demo data.');
            return seedStaff();
        }
    }

    let state = readStaffState();

    // Sync any newly registered Staff accounts from cms_users into state.staff
    function syncRegisteredStaffFromUsers() {
        try {
            const users = JSON.parse(localStorage.getItem('cms_users') || '[]');
            let changed = false;
            users.filter(u => u && u.role === 'staff').forEach(u => {
                const exists = state.staff.find(
                    s => s.id === u.id || s.email.toLowerCase() === (u.email || '').toLowerCase()
                );
                if (!exists) {
                    state.staff.push({
                        id: u.id || `ST-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
                        name: u.name || u.username || 'Staff Member',
                        username: u.username || 'staff',
                        nif: u.nif || '—',
                        phone: u.phone || '+351 910 000 000',
                        email: u.email,
                        department: u.department || 'Operations & Validation',
                        approval_status: u.approval_status || 'Pending',
                        approved_by: u.approved_by || null,
                        createdAt: u.createdAt || new Date().toISOString()
                    });
                    changed = true;
                } else if (u.approval_status && exists.approval_status !== u.approval_status) {
                    exists.approval_status = u.approval_status;
                    changed = true;
                }
            });
            if (changed && canSave) {
                localStorage.setItem(STAFF_KEY, JSON.stringify(state));
            }
        } catch { /* ignore */ }
    }

    function syncStaffStatusToUsers(staffMember) {
        try {
            const users = JSON.parse(localStorage.getItem('cms_users') || '[]');
            let updated = false;
            users.forEach(u => {
                if (u.role === 'staff' && (u.id === staffMember.id || (u.email && u.email.toLowerCase() === staffMember.email.toLowerCase()))) {
                    u.approval_status = staffMember.approval_status;
                    u.approved_by = staffMember.approved_by;
                    u.name = staffMember.name;
                    u.username = staffMember.username;
                    u.phone = staffMember.phone;
                    u.email = staffMember.email;
                    u.nif = staffMember.nif;
                    u.department = staffMember.department;
                    updated = true;
                }
            });
            if (updated) {
                localStorage.setItem('cms_users', JSON.stringify(users));
            }
        } catch { /* ignore */ }
    }

    syncRegisteredStaffFromUsers();

    function save(message) {
        if (canSave) {
            try {
                localStorage.setItem(STAFF_KEY, JSON.stringify(state));
            } catch {
                canSave = false;
                warn('Browser storage is unavailable. Changes will last only until this page is reloaded.');
            }
        }
        render();
        if (message) toast(message);
    }

    // =========================================================================
    // CROSS-SYSTEM DATA AGGREGATION FOR OPERATIONAL KPIS & ANALYTICS
    // =========================================================================
    const BASE_CATALOG = [
        { id: 'CF-1041', item: 'Documents', pickup: 'Praça da Liberdade, Porto', drop: 'Praça da Ribeira, Porto', fee: 7.50, defaultStatus: 'available', defaultCourier: 'Unassigned' },
        { id: 'CF-1042', item: 'Clothing', pickup: 'Rua de Santa Catarina, Porto', drop: 'Rua de Dom Manuel II, Porto', fee: 9.20, defaultStatus: 'available', defaultCourier: 'Alex Silva' },
        { id: 'CF-1043', item: 'Electronics', pickup: 'Praça de Mouzinho de Albuquerque, Porto', drop: 'Avenida dos Aliados, Porto', fee: 12.80, defaultStatus: 'available', defaultCourier: 'Unassigned' },
        { id: 'CF-1044', item: 'Books', pickup: 'Rua das Carmelitas, Porto', drop: 'Campo 24 de Agosto, Porto', fee: 8.60, defaultStatus: 'accepted', defaultCourier: 'Alex Silva' },
        { id: 'CF-1039', item: 'Art supplies', pickup: 'Rua de Cedofeita, Porto', drop: 'Rua de Miguel Bombarda, Porto', fee: 8.40, defaultStatus: 'picked_up', defaultCourier: 'Maria Costa' },
        { id: 'CF-1036', item: 'Documents', pickup: 'Rua de Júlio Dinis, Porto', drop: 'Praça da Trindade, Porto', fee: 6.50, defaultStatus: 'delivered', defaultCourier: 'Daniel Santos' }
    ];

    function gatherSystemMetrics() {
        // 1. Users & Roles
        let registeredUsers = [];
        try {
            registeredUsers = JSON.parse(localStorage.getItem('cms_users') || '[]');
        } catch { /* ignore */ }

        // Couriers from Staff store (or fallback seed count of 5)
        let couriers = [
            { id: 'CR-001', name: 'Alex Silva', approval_status: 'Approved', status: 'busy' },
            { id: 'CR-002', name: 'Maria Costa', approval_status: 'Approved', status: 'busy' },
            { id: 'CR-003', name: 'Daniel Santos', approval_status: 'Approved', status: 'available' },
            { id: 'CR-004', name: 'Sofia Pereira', approval_status: 'Pending', status: 'available' },
            { id: 'CR-005', name: 'Tiago Mendes', approval_status: 'Pending', status: 'available' }
        ];
        try {
            const staffRaw = JSON.parse(localStorage.getItem('courierflow.staff.demo.v1') || 'null');
            if (staffRaw && Array.isArray(staffRaw.couriers)) {
                couriers = staffRaw.couriers;
            }
        } catch { /* ignore */ }

        const regClients = registeredUsers.filter(u => u && u.role === 'client');
        const baselineClients = 18; // Demo baseline active clients in Porto
        const totalClients = baselineClients + regClients.length;

        const approvedCouriers = couriers.filter(c => (c.approval_status || 'Approved') === 'Approved').length;
        const pendingCouriers = couriers.filter(c => c.approval_status === 'Pending').length;

        const approvedStaff = state.staff.filter(s => s.approval_status === 'Approved').length;
        const pendingStaff = state.staff.filter(s => s.approval_status === 'Pending').length;

        // 2. Vehicles & Fleet
        let vehicles = [];
        try {
            vehicles = JSON.parse(localStorage.getItem('cms_vehicles') || '[]');
        } catch { /* ignore */ }
        const totalVehicles = vehicles.length || 6;
        const approvedVehicles = vehicles.length
            ? vehicles.filter(v => v.approval_status === 'Approved').length
            : 4;

        // 3. Routes / Orders & Route Assignments
        let courierWorkflow = null;
        try {
            courierWorkflow = JSON.parse(localStorage.getItem('courierflow.courier.demo.v1') || 'null');
        } catch { /* ignore */ }

        let routeAssignments = {
            'CF-1044': { order_id: 'CF-1044', vehicle_id: 'V-001', used_by_courier_name: 'Alex Silva' },
            'CF-1039': { order_id: 'CF-1039', vehicle_id: 'V-002', used_by_courier_name: 'Maria Costa' },
            'CF-1036': { order_id: 'CF-1036', vehicle_id: 'V-001', used_by_courier_name: 'Daniel Santos' }
        };
        try {
            const raRaw = JSON.parse(localStorage.getItem('cms_route_assignments') || 'null');
            if (raRaw && typeof raRaw === 'object') {
                routeAssignments = raRaw;
            }
        } catch { /* ignore */ }

        const vehicleMap = new Map(vehicles.map(v => [String(v.id), `${v.model} (${v.license_plate})`]));
        if (!vehicleMap.size) {
            vehicleMap.set('V-001', 'Renault Kangoo (AA-12-CF)');
            vehicleMap.set('V-002', 'Peugeot Partner (AB-34-CF)');
            vehicleMap.set('V-003', 'Honda PCX 125 (MC-11-CF)');
            vehicleMap.set('V-004', 'Urban Cargo Bike (BK-05-CF)');
        }

        const routes = BASE_CATALOG.map(entry => {
            const liveStatus = courierWorkflow?.jobs?.[entry.id]?.status || entry.defaultStatus;
            const rAssign = routeAssignments[entry.id] || courierWorkflow?.jobs?.[entry.id]?.routeAssignment || null;
            const courierLabel = rAssign?.used_by_courier_name || (liveStatus === 'available' ? 'Unassigned' : entry.defaultCourier);
            const vehicleLabel = rAssign?.vehicle_id ? (vehicleMap.get(String(rAssign.vehicle_id)) || rAssign.vehicle_id) : 'Not selected yet';
            return {
                id: entry.id,
                item: entry.item,
                route: `${entry.pickup} → ${entry.drop}`,
                pickup: entry.pickup,
                drop: entry.drop,
                status: liveStatus,
                courier: courierLabel,
                vehicle: vehicleLabel,
                fee: entry.fee
            };
        });

        // Also include any client-created orders from cms_orders
        try {
            const clientOrders = JSON.parse(localStorage.getItem('cms_orders') || '[]');
            clientOrders.forEach(o => {
                routes.push({
                    id: o.code || `ORD-${String(o.id).slice(0, 5)}`,
                    item: `${(o.products || []).length || 1} product(s)`,
                    route: `${o.origin || 'Porto'} → ${o.destination || 'Porto'}`,
                    pickup: o.origin || 'Porto',
                    drop: o.destination || 'Porto',
                    status: (o.status || '').toLowerCase() === 'delivered' ? 'delivered' : 'available',
                    courier: 'Assigned via dispatch',
                    vehicle: 'Shared pool',
                    fee: 9.50
                });
            });
        } catch { /* ignore */ }

        const routeCounts = {
            available: routes.filter(r => r.status === 'available' || r.status === 'unassigned').length,
            accepted: routes.filter(r => r.status === 'accepted').length,
            picked_up: routes.filter(r => r.status === 'picked_up').length,
            delivered: routes.filter(r => r.status === 'delivered').length
        };

        const totalRevenue = routes.reduce((sum, r) => sum + (Number(r.fee) || 0), 0);
        const completedRevenue = routes.filter(r => r.status === 'delivered').reduce((sum, r) => sum + (Number(r.fee) || 0), 0);

        return {
            couriersCount: couriers.length,
            approvedCouriers,
            pendingCouriers,
            staffCount: state.staff.length,
            approvedStaff,
            pendingStaff,
            totalClients,
            regClientsCount: regClients.length,
            totalVehicles,
            approvedVehicles,
            routes,
            routeCounts,
            totalRevenue,
            completedRevenue
        };
    }

    // =========================================================================
    // RENDER FUNCTIONS
    // =========================================================================
    function renderHeaderAndProfile() {
        const profile = getAdminProfile();
        if ($('adminWorkspaceLabel')) {
            $('adminWorkspaceLabel').textContent = `Admin · ${profile.name}`;
        }
        if ($('adminAvatar')) {
            const initials = (profile.name || 'AD').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
            $('adminAvatar').textContent = initials || 'AD';
        }
        if ($('adminName') && document.activeElement?.form !== $('adminProfileForm')) {
            $('adminName').value = profile.name || '';
            $('adminUsername').value = profile.username || '';
            $('adminEmail').value = profile.email || '';
            $('adminPhone').value = profile.phone || '';
            $('adminNif').value = profile.nif || '';
            $('adminDepartment').value = profile.department || '';
        }
    }

    function renderStatsAndAnalytics() {
        const m = gatherSystemMetrics();

        const primaryKpis = [
            ['Total Staff Members', m.staffCount, `${m.approvedStaff} approved · ${m.pendingStaff} pending review`],
            ['Total Couriers', m.couriersCount, `${m.approvedCouriers} approved · ${m.pendingCouriers} pending Staff review`],
            ['Total Clients', m.totalClients, `${m.regClientsCount} newly registered in browser`],
            ['Total Routes & Orders', m.routes.length, `${m.routeCounts.accepted + m.routeCounts.picked_up} active · ${m.routeCounts.delivered} completed`]
        ];

        $('stats').innerHTML = primaryKpis.map(([title, value, note]) =>
            `<div class="dashboard-card"><h3>${title}</h3><strong>${value}</strong><p>${note}</p></div>`
        ).join('');

        if ($('operationalStats')) {
            const completionRate = m.routes.length
                ? Math.round((m.routeCounts.delivered / m.routes.length) * 100)
                : 0;
            const secondaryKpis = [
                ['Pending Staff Approvals', m.pendingStaff, m.pendingStaff ? 'Awaiting Admin governance decision' : 'All Staff accounts reviewed'],
                ['Routes In Progress', m.routeCounts.accepted + m.routeCounts.picked_up, `${m.routeCounts.accepted} accepted · ${m.routeCounts.picked_up} picked up`],
                ['Shared Fleet Pool', `${m.approvedVehicles}/${m.totalVehicles}`, 'Approved vehicles available to couriers'],
                ['Platform Route Volume', money(m.totalRevenue), `${money(m.completedRevenue)} completed · ${completionRate}% completion rate`]
            ];
            $('operationalStats').innerHTML = secondaryKpis.map(([title, value, note]) =>
                `<div class="dashboard-card"><h3>${title}</h3><strong>${value}</strong><p>${note}</p></div>`
            ).join('');
        }

        if ($('navCount')) {
            $('navCount').textContent = m.pendingStaff || m.staffCount;
        }

        // Render Route Status Bars
        const totalRoutes = Math.max(1, m.routes.length);
        const routeBars = [
            { label: 'Available / Unassigned', count: m.routeCounts.available, pct: Math.round((m.routeCounts.available / totalRoutes) * 100), color: '#64748b' },
            { label: 'Accepted (Route Prepared)', count: m.routeCounts.accepted, pct: Math.round((m.routeCounts.accepted / totalRoutes) * 100), color: '#2563eb' },
            { label: 'Picked Up (In Transit)', count: m.routeCounts.picked_up, pct: Math.round((m.routeCounts.picked_up / totalRoutes) * 100), color: '#d97706' },
            { label: 'Delivered (Completed)', count: m.routeCounts.delivered, pct: Math.round((m.routeCounts.delivered / totalRoutes) * 100), color: '#16a34a' }
        ];

        if ($('routeAnalyticsBars')) {
            $('routeAnalyticsBars').innerHTML = routeBars.map(b => `
                <div class="analytics-bar-row">
                    <div class="analytics-bar-label">
                        <span>${esc(b.label)}</span>
                        <strong>${b.count} (${b.pct}%)</strong>
                    </div>
                    <div class="analytics-bar-track">
                        <div class="analytics-bar-fill" style="width: ${Math.max(b.count ? 6 : 0, b.pct)}%; background: ${b.color};"></div>
                    </div>
                </div>
            `).join('');
        }

        // Render Role & Governance Bars
        const totalUsers = Math.max(1, m.totalClients + m.couriersCount + m.staffCount);
        const roleBars = [
            { label: `Clients (${m.totalClients} active)`, count: m.totalClients, pct: Math.round((m.totalClients / totalUsers) * 100), color: '#2563eb' },
            { label: `Couriers (${m.approvedCouriers} approved · ${m.pendingCouriers} pending)`, count: m.couriersCount, pct: Math.round((m.couriersCount / totalUsers) * 100), color: '#0891b2' },
            { label: `Staff Members (${m.approvedStaff} approved · ${m.pendingStaff} pending)`, count: m.staffCount, pct: Math.round((m.staffCount / totalUsers) * 100), color: '#7c3aed' },
            { label: `Shared Fleet Vehicles (${m.approvedVehicles} approved)`, count: m.totalVehicles, pct: Math.round((m.approvedVehicles / Math.max(1, m.totalVehicles)) * 100), color: '#16a34a' }
        ];

        if ($('roleAnalyticsBars')) {
            $('roleAnalyticsBars').innerHTML = roleBars.map(b => `
                <div class="analytics-bar-row">
                    <div class="analytics-bar-label">
                        <span>${esc(b.label)}</span>
                        <strong>${b.count}</strong>
                    </div>
                    <div class="analytics-bar-track">
                        <div class="analytics-bar-fill" style="width: ${Math.max(8, b.pct)}%; background: ${b.color};"></div>
                    </div>
                </div>
            `).join('');
        }

        // Render Route Status Table
        if ($('routeAnalyticsTable')) {
            $('routeAnalyticsTable').innerHTML = m.routes.map(r => `
                <tr>
                    <td><strong>${esc(r.id)}</strong><p class="small">${esc(r.item)}</p></td>
                    <td class="route">${esc(r.pickup)}<span>→ ${esc(r.drop)}</span></td>
                    <td>${routeBadge(r.status)}</td>
                    <td>${esc(r.courier)}</td>
                    <td><span class="small"><strong>${esc(r.vehicle)}</strong></span></td>
                    <td><strong>${money(r.fee)}</strong></td>
                </tr>
            `).join('');
        }
    }

    function renderStaff() {
        const container = $('staffList');
        if (!container) return;

        const query = ($('staffSearch')?.value || '').trim().toLocaleLowerCase('en');
        const filter = $('staffApprovalFilter') ? $('staffApprovalFilter').value : 'all';

        const found = state.staff.filter(s => {
            const matchesFilter = filter === 'all' || s.approval_status === filter;
            const matchesQuery = [s.name, s.username, s.nif, s.department, s.phone, s.email, s.id]
                .join(' ')
                .toLocaleLowerCase('en')
                .includes(query);
            return matchesFilter && matchesQuery;
        });

        if (!found.length) {
            container.innerHTML = '<p class="empty-state">No Staff members match your current filters.</p>';
            return;
        }

        container.innerHTML = found.map(s => {
            const initials = s.name.trim().split(/\s+/).map(w => Array.from(w)[0]).slice(0, 2).join('').toUpperCase();
            return `<article class="courier-card" id="staff-${esc(s.id)}">
                <div class="courier-heading">
                    <span class="courier-avatar" aria-hidden="true">${esc(initials)}</span>
                    <div>
                        <h3>${esc(s.name)}</h3>
                        <p class="small">${esc(s.id)} · @${esc(s.username || 'staff')}</p>
                    </div>
                    ${approvalBadge(s.approval_status)}
                </div>

                <div class="submission-details">
                    <div><span>Department / Role</span><strong>${esc(s.department || 'Operations & Validation')}</strong></div>
                    <div><span>NIF (Tax ID)</span><strong>${esc(s.nif || '—')}</strong></div>
                    <div><span>Email</span><strong>${esc(s.email)}</strong></div>
                    <div><span>Phone</span><strong>${esc(s.phone)}</strong></div>
                    <div><span>Submitted Date</span><strong>${esc(formatDateDDMMYYYY(s.createdAt || '2026-10-01'))}</strong></div>
                    <div><span>Reviewed By</span><strong>${esc(s.approved_by || 'Awaiting Admin review')}</strong></div>
                </div>

                <div class="approval-actions">
                    <button class="btn btn-approve" data-action="approve-staff" data-id="${esc(s.id)}" ${s.approval_status === 'Approved' ? 'disabled' : ''}>
                        Approve staff
                    </button>
                    <button class="btn btn-reject" data-action="reject-staff" data-id="${esc(s.id)}" ${s.approval_status === 'Rejected' ? 'disabled' : ''}>
                        Reject
                    </button>
                </div>

                <div class="card-actions">
                    <button class="text-button" data-action="edit-staff" data-id="${esc(s.id)}">Edit personal information</button>
                    <button class="text-button danger" data-action="delete-staff" data-id="${esc(s.id)}">Delete</button>
                </div>
            </article>`;
        }).join('');
    }

    function render() {
        syncRegisteredStaffFromUsers();
        renderHeaderAndProfile();
        renderStatsAndAnalytics();
        renderStaff();
    }

    // =========================================================================
    // STAFF APPROVAL & PERSONAL INFORMATION EDITING
    // =========================================================================
    function updateStaffApproval(id, newStatus) {
        const member = state.staff.find(s => String(s.id) === String(id));
        if (!member) return;
        const profile = getAdminProfile();
        member.approval_status = newStatus;
        member.approved_by = `${profile.name} (${profile.email})`;
        syncStaffStatusToUsers(member);
        save(`Staff member ${member.name} ${newStatus.toLowerCase()}.`);
    }

    function editStaff(id) {
        const form = $('staffForm');
        form.reset();
        $('formError').textContent = '';
        const member = state.staff.find(s => s.id === id);
        $('staffTitle').textContent = member ? 'Edit staff personal information' : 'Add staff member';
        for (const key of ['id', 'name', 'username', 'nif', 'phone', 'email', 'department', 'approval_status']) {
            const field = form.elements.namedItem(key);
            if (!field) continue;
            field.value = member?.[key] || (key === 'approval_status' ? 'Pending' : '');
        }
        $('staffDialog').showModal();
    }

    $('staffForm')?.addEventListener('submit', event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        for (const key of ['name', 'username', 'nif', 'phone', 'email', 'department']) {
            data[key] = (data[key] || '').trim();
        }
        const existing = state.staff.find(s => s.id === data.id);
        const error = message => {
            $('formError').textContent = message;
        };

        if (!data.name || !/^[+0-9() .-]{5,30}$/.test(data.phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            return error('Enter a full name, a valid phone number and a valid email address.');
        }
        if (state.staff.some(s => s.id !== data.id && s.email.toLowerCase() === data.email.toLowerCase())) {
            return error('This email address is already assigned to another Staff member.');
        }

        const profile = getAdminProfile();
        if (existing) {
            Object.assign(existing, data);
            if (data.approval_status !== 'Pending' && !existing.approved_by) {
                existing.approved_by = `${profile.name} (${profile.email})`;
            }
            syncStaffStatusToUsers(existing);
        } else {
            const created = {
                ...data,
                id: `ST-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
                approved_by: data.approval_status === 'Pending' ? null : `${profile.name} (${profile.email})`,
                createdAt: new Date().toISOString()
            };
            state.staff.push(created);
            syncStaffStatusToUsers(created);
        }
        $('staffDialog').close();
        save(existing ? 'Staff personal information updated.' : 'New Staff member added.');
    });

    $('adminProfileForm')?.addEventListener('submit', event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        for (const key of ['name', 'username', 'email', 'phone', 'nif', 'department']) {
            data[key] = (data[key] || '').trim();
        }
        if (!data.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            toast('Please enter a valid full name and email address.');
            return;
        }
        saveAdminProfile(data);
        renderHeaderAndProfile();
        toast('Administrator personal information saved.');
    });

    function confirmAction(title, text) {
        $('confirmTitle').textContent = title;
        $('confirmText').textContent = text;
        const dialog = $('confirmDialog');
        dialog.returnValue = 'cancel';
        dialog.showModal();
        return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
    }

    async function deleteStaff(id) {
        const member = state.staff.find(s => s.id === id);
        if (!member) return;
        if (!await confirmAction('Delete Staff member?', `${member.name} (${member.id}) will be removed from the Staff directory.`)) return;
        state.staff = state.staff.filter(s => s.id !== id);
        save('Staff member deleted.');
    }

    // =========================================================================
    // EVENT LISTENERS
    // =========================================================================
    document.addEventListener('click', event => {
        const close = event.target.closest('[data-close]');
        if (close) $(close.dataset.close)?.close();

        const button = event.target.closest('[data-action]');
        if (!button) return;
        const { action, id } = button.dataset;

        if (action === 'approve-staff') updateStaffApproval(id, 'Approved');
        else if (action === 'reject-staff') updateStaffApproval(id, 'Rejected');
        else if (action === 'edit-staff') editStaff(id);
        else if (action === 'delete-staff') deleteStaff(id);
    });

    $('addStaff')?.addEventListener('click', () => editStaff());
    $('staffSearch')?.addEventListener('input', renderStaff);
    $('staffApprovalFilter')?.addEventListener('change', renderStaff);

    $('resetDemo')?.addEventListener('click', async () => {
        if (!await confirmAction('Reset Admin governance data?',
                'Staff directory, approval statuses and administrator profile will return to their initial demo values.'
            )) return;
        state = seedStaff();
        try {
            localStorage.removeItem(PROFILE_KEY);
        } catch { /* ignore */ }
        canSave = true;
        if ($('storageWarning')) $('storageWarning').hidden = true;
        if ($('staffSearch')) $('staffSearch').value = '';
        if ($('staffApprovalFilter')) $('staffApprovalFilter').value = 'all';
        save('Admin demo data restored.');
    });

    function nav() {
        const section = location.hash.slice(1) || 'overview';
        document.querySelectorAll('[data-nav]').forEach(link => {
            const active = link.dataset.nav === section;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
    }

    window.addEventListener('hashchange', nav);
    window.addEventListener('storage', () => {
        state = readStaffState();
        render();
        toast('System metrics or Staff records updated.');
    });

    render();
    nav();
})();
