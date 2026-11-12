/* CourierFlow Staff Panel — Operational validation and monitoring of couriers, vehicles, and certificates. */
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

    if (demoRole !== 'staff' && (!currentUser || currentUser.role !== 'staff')) {
        window.location.replace('login.html');
        return;
    }

    const staffReviewerLabel = currentUser && currentUser.name
        ? `${currentUser.name} (${currentUser.email || 'Staff'})`
        : 'Staff (staff@staff.demo)';

    const KEY = 'courierflow.staff.demo.v1';
    const NOTIF_KEY = 'cms_staff_notifications';
    const $ = id => document.getElementById(id);

    if (currentUser && currentUser.name) {
        if ($('staffWorkspaceLabel')) $('staffWorkspaceLabel').textContent = `Staff · ${currentUser.name}`;
        if ($('staffAvatar')) {
            const initials = currentUser.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
            $('staffAvatar').textContent = initials || 'ST';
        }
    }

    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));

    const statuses = {
        available: 'Available',
        busy: 'On delivery',
        offline: 'Unavailable',
        unassigned: 'Unassigned',
        accepted: 'Accepted',
        picked_up: 'Picked up',
        delivered: 'Delivered'
    };

    const badge = status => `<span class="badge badge-${status}">${statuses[status] || status}</span>`;
    const approvalBadge = status => {
        const cls = status === 'Approved' ? 'available' : status === 'Rejected' ? 'rejected' : 'busy';
        return `<span class="badge badge-${cls}">${esc(status || 'Pending')}</span>`;
    };

    // =========================================================================
    // DATE & CERTIFICATE COMPLIANCE HELPERS
    // =========================================================================
    function todayISO() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function addDaysISO(days) {
        const dt = new Date();
        dt.setDate(dt.getDate() + days);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function formatDateDDMMYYYY(value) {
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
    }

    function evaluateCertificateDate(dateStr) {
        if (!dateStr) return { state: 'expired', label: 'Missing / Expired' };
        const today = todayISO();
        const soon = addDaysISO(45);
        if (dateStr < today) {
            return { state: 'expired', label: 'Expired' };
        }
        if (dateStr <= soon) {
            return { state: 'outdated', label: 'Outdated / Expiring soon' };
        }
        return { state: 'valid', label: 'Valid' };
    }

    function evaluateVehicleCertificates(vehicle) {
        const ins = evaluateCertificateDate(vehicle.insurance_expiry_date);
        const insp = evaluateCertificateDate(vehicle.inspection_expiry_date);
        const overall = (ins.state === 'expired' || insp.state === 'expired')
            ? 'expired'
            : (ins.state === 'outdated' || insp.state === 'outdated')
                ? 'outdated'
                : 'valid';
        return { ins, insp, overall };
    }

    // =========================================================================
    // SEED DATA (COURIERS, VEHICLES, PARCELS, NOTIFICATIONS)
    // =========================================================================
    const seed = () => ({
        version: 1,
        couriers: [{
            id: 'CR-001',
            name: 'Alex Silva',
            username: 'alexsilva',
            nif: '245891032',
            phone: '+351 912 000 101',
            email: 'alex.silva@example.com',
            status: 'busy',
            approval_status: 'Approved',
            approved_by: 'Staff (staff@staff.demo)',
            createdAt: '2026-10-05T09:30:00.000Z'
        }, {
            id: 'CR-002',
            name: 'Maria Costa',
            username: 'mariacosta',
            nif: '258103947',
            phone: '+351 913 000 102',
            email: 'maria.costa@example.com',
            status: 'busy',
            approval_status: 'Approved',
            approved_by: 'Staff (staff@staff.demo)',
            createdAt: '2026-10-08T11:15:00.000Z'
        }, {
            id: 'CR-003',
            name: 'Daniel Santos',
            username: 'danielsantos',
            nif: '269402815',
            phone: '+351 914 000 103',
            email: 'daniel.santos@example.com',
            status: 'available',
            approval_status: 'Approved',
            approved_by: 'Staff (staff@staff.demo)',
            createdAt: '2026-10-12T14:00:00.000Z'
        }, {
            id: 'CR-004',
            name: 'Sofia Pereira',
            username: 'sofiapereira',
            nif: '274918263',
            phone: '+351 915 000 104',
            email: 'sofia.pereira@example.com',
            status: 'available',
            approval_status: 'Pending',
            approved_by: null,
            createdAt: '2026-11-10T16:20:00.000Z'
        }, {
            id: 'CR-005',
            name: 'Tiago Mendes',
            username: 'tiagomendes',
            nif: '281736495',
            phone: '+351 916 000 105',
            email: 'tiago.mendes@example.com',
            status: 'available',
            approval_status: 'Pending',
            approved_by: null,
            createdAt: '2026-11-11T10:05:00.000Z'
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
                approved_by: 'Staff (staff@staff.demo)',
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
                approved_by: 'Staff (staff@staff.demo)',
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
                approved_by: 'Staff (staff@staff.demo)',
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
                approved_by: 'Staff (staff@staff.demo)',
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
                insurance_expiry_date: '2026-11-28',
                inspection_expiry_date: '2027-08-22',
                insurance_expiry_doc: 'berlingo_insurance.pdf',
                inspection_expiry_doc: 'berlingo_inspection.pdf',
                approval_status: 'Pending',
                approved_by: null,
                doc_updated_at: '2026-10-25T15:00:00.000Z',
                created_at: '2026-10-25T15:00:00.000Z'
            },
            {
                id: 'V-006',
                courier_id: 'CR-004',
                submitted_by_courier_id: 'CR-004',
                submitted_by_courier_name: 'Sofia Pereira',
                type_name: 'Van',
                model: 'Fiat Fiorino',
                license_plate: 'AD-78-CF',
                max_weight_kg: 610,
                max_vol_m3: 2.8,
                insurance_expiry_date: '2026-04-10',
                inspection_expiry_date: '2026-05-01',
                insurance_expiry_doc: 'fiorino_insurance_2025.pdf',
                inspection_expiry_doc: 'fiorino_inspection_2025.pdf',
                approval_status: 'Pending',
                approved_by: null,
                doc_updated_at: '2026-11-01T12:00:00.000Z',
                created_at: '2026-11-01T12:00:00.000Z'
            }
        ];
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

    function read() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return seed();
            const data = JSON.parse(raw);
            if (!data || !Array.isArray(data.couriers) || !Array.isArray(data.parcels)) {
                return seed();
            }
            // Ensure approval_status exists on all couriers
            data.couriers.forEach(c => {
                if (!c.approval_status) c.approval_status = 'Approved';
                if (!c.username) c.username = c.name.toLowerCase().replace(/\s+/g, '');
                if (!c.nif) c.nif = '245000111';
            });
            return data;
        } catch {
            canSave = false;
            warn('Saved data could not be loaded. Showing demo data.');
            return seed();
        }
    }

    let state = read();

    // Sync any newly registered couriers from cms_users into state.couriers
    function syncRegisteredCouriersFromUsers() {
        try {
            const users = JSON.parse(localStorage.getItem('cms_users') || '[]');
            let changed = false;
            users.filter(u => u && u.role === 'courier').forEach(u => {
                const exists = state.couriers.find(
                    c => c.id === u.id || c.email.toLowerCase() === (u.email || '').toLowerCase()
                );
                if (!exists) {
                    state.couriers.push({
                        id: u.id || `CR-${crypto.randomUUID().slice(0, 6)}`,
                        name: u.name || u.username || 'Courier',
                        username: u.username || 'courier',
                        nif: u.nif || '—',
                        phone: u.phone || '+351 910 000 000',
                        email: u.email,
                        status: 'available',
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
                localStorage.setItem(KEY, JSON.stringify(state));
            }
        } catch { /* ignore */ }
    }

    function syncCourierStatusToUsers(courier) {
        try {
            const users = JSON.parse(localStorage.getItem('cms_users') || '[]');
            let updated = false;
            users.forEach(u => {
                if (u.role === 'courier' && (u.id === courier.id || (u.email && u.email.toLowerCase() === courier.email.toLowerCase()))) {
                    u.approval_status = courier.approval_status;
                    u.approved_by = courier.approved_by;
                    u.name = courier.name;
                    u.phone = courier.phone;
                    u.email = courier.email;
                    u.nif = courier.nif;
                    u.username = courier.username;
                    updated = true;
                }
            });
            if (updated) {
                localStorage.setItem('cms_users', JSON.stringify(users));
            }
        } catch { /* ignore */ }
    }

    syncRegisteredCouriersFromUsers();

    function save(message) {
        if (canSave) {
            try {
                localStorage.setItem(KEY, JSON.stringify(state));
            } catch {
                canSave = false;
                warn('Browser storage is unavailable. Changes will last only until this page is reloaded.');
            }
        }
        render();
        if (message) toast(message);
    }

    const activeParcels = id => state.parcels.filter(p => p.courierId === id && p.status !== 'delivered');
    const courierName = id => state.couriers.find(c => c.id === id)?.name || 'Unassigned';

    function getSubmittedVehicles() {
        try {
            const raw = localStorage.getItem('cms_vehicles');
            const seededFlag = localStorage.getItem('cms_vehicles_seeded_v3_staff');
            if (!raw) {
                const initial = defaultSeedVehicles();
                localStorage.setItem('cms_vehicles', JSON.stringify(initial));
                localStorage.setItem('cms_vehicles_seeded_v3_staff', '1');
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
                localStorage.setItem('cms_vehicles_seeded_v3_staff', '1');
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

    // =========================================================================
    // NOTIFICATIONS & CERTIFICATE ALERTS ENGINE
    // =========================================================================
    function getStoredNotifications() {
        try {
            const raw = localStorage.getItem(NOTIF_KEY);
            if (!raw) {
                const initial = [
                    {
                        id: 'NOTIF-SEED-1',
                        type: 'updated',
                        title: 'Vehicle certificates uploaded for review',
                        message: 'Daniel Santos submitted insurance (berlingo_insurance.pdf) and inspection (berlingo_inspection.pdf) certificates for Citroën Berlingo (AC-56-CF).',
                        vehicleId: 'V-005',
                        createdAt: '2026-10-25T15:00:00.000Z',
                        read: false
                    }
                ];
                localStorage.setItem(NOTIF_KEY, JSON.stringify(initial));
                return initial;
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function saveStoredNotifications(list) {
        try {
            localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
        } catch { /* ignore */ }
    }

    function pushStaffNotification({ type, title, message, vehicleId }) {
        const list = getStoredNotifications();
        list.unshift({
            id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: type || 'updated',
            title,
            message,
            vehicleId: vehicleId || null,
            createdAt: new Date().toISOString(),
            read: false
        });
        saveStoredNotifications(list);
    }

    // Build combined list of live certificate compliance alerts + event notifications
    function buildAllAlertsAndNotifications() {
        const vehicles = getSubmittedVehicles();
        const storedNotifs = getStoredNotifications();
        const readAlertIds = (() => {
            try {
                return new Set(JSON.parse(localStorage.getItem('cms_staff_read_alerts') || '[]'));
            } catch {
                return new Set();
            }
        })();

        const dynamicAlerts = [];
        vehicles.forEach(v => {
            const cert = evaluateVehicleCertificates(v);
            const submitter = getCourierSubmitterName(v);
            if (cert.ins.state === 'expired') {
                const alertId = `ALERT-INS-EXP-${v.id}-${v.insurance_expiry_date}`;
                dynamicAlerts.push({
                    id: alertId,
                    isDynamicAlert: true,
                    type: 'expired',
                    title: `Expired Insurance Certificate · ${v.model} (${v.license_plate})`,
                    message: `Insurance document (${v.insurance_expiry_doc}) submitted by ${submitter} expired on ${formatDateDDMMYYYY(v.insurance_expiry_date)}. Vehicle cannot operate until renewed.`,
                    vehicleId: v.id,
                    createdAt: v.doc_updated_at || v.created_at || new Date().toISOString(),
                    read: readAlertIds.has(alertId)
                });
            } else if (cert.ins.state === 'outdated') {
                const alertId = `ALERT-INS-OUT-${v.id}-${v.insurance_expiry_date}`;
                dynamicAlerts.push({
                    id: alertId,
                    isDynamicAlert: true,
                    type: 'outdated',
                    title: `Outdated / Expiring Insurance Certificate · ${v.model} (${v.license_plate})`,
                    message: `Insurance document (${v.insurance_expiry_doc}) submitted by ${submitter} expires soon on ${formatDateDDMMYYYY(v.insurance_expiry_date)}. Request renewal from courier.`,
                    vehicleId: v.id,
                    createdAt: v.doc_updated_at || v.created_at || new Date().toISOString(),
                    read: readAlertIds.has(alertId)
                });
            }

            if (cert.insp.state === 'expired') {
                const alertId = `ALERT-INSP-EXP-${v.id}-${v.inspection_expiry_date}`;
                dynamicAlerts.push({
                    id: alertId,
                    isDynamicAlert: true,
                    type: 'expired',
                    title: `Expired Inspection Certificate · ${v.model} (${v.license_plate})`,
                    message: `Vehicle inspection certificate (${v.inspection_expiry_doc}) submitted by ${submitter} expired on ${formatDateDDMMYYYY(v.inspection_expiry_date)}. Vehicle requires re-inspection.`,
                    vehicleId: v.id,
                    createdAt: v.doc_updated_at || v.created_at || new Date().toISOString(),
                    read: readAlertIds.has(alertId)
                });
            } else if (cert.insp.state === 'outdated') {
                const alertId = `ALERT-INSP-OUT-${v.id}-${v.inspection_expiry_date}`;
                dynamicAlerts.push({
                    id: alertId,
                    isDynamicAlert: true,
                    type: 'outdated',
                    title: `Outdated / Expiring Inspection Certificate · ${v.model} (${v.license_plate})`,
                    message: `Vehicle inspection certificate (${v.inspection_expiry_doc}) submitted by ${submitter} expires soon on ${formatDateDDMMYYYY(v.inspection_expiry_date)}.`,
                    vehicleId: v.id,
                    createdAt: v.doc_updated_at || v.created_at || new Date().toISOString(),
                    read: readAlertIds.has(alertId)
                });
            }
        });

        return [...dynamicAlerts, ...storedNotifs];
    }

    function markNotificationRead(id) {
        if (id.startsWith('ALERT-')) {
            try {
                const set = new Set(JSON.parse(localStorage.getItem('cms_staff_read_alerts') || '[]'));
                set.add(id);
                localStorage.setItem('cms_staff_read_alerts', JSON.stringify([...set]));
            } catch { /* ignore */ }
        } else {
            const list = getStoredNotifications();
            const target = list.find(n => n.id === id);
            if (target) {
                target.read = true;
                saveStoredNotifications(list);
            }
        }
        render();
    }

    function markAllNotificationsRead() {
        const all = buildAllAlertsAndNotifications();
        try {
            const set = new Set(JSON.parse(localStorage.getItem('cms_staff_read_alerts') || '[]'));
            all.filter(a => a.isDynamicAlert).forEach(a => set.add(a.id));
            localStorage.setItem('cms_staff_read_alerts', JSON.stringify([...set]));
        } catch { /* ignore */ }

        const list = getStoredNotifications();
        list.forEach(n => { n.read = true; });
        saveStoredNotifications(list);
        render();
        toast('All alerts and notifications marked as read.');
    }

    // =========================================================================
    // RENDER FUNCTIONS
    // =========================================================================
    function renderStats() {
        const allVehicles = getSubmittedVehicles();
        const pendingCouriers = state.couriers.filter(c => c.approval_status === 'Pending').length;
        const approvedCouriers = state.couriers.filter(c => c.approval_status === 'Approved').length;

        const pendingVehicles = allVehicles.filter(v => v.approval_status === 'Pending').length;
        const approvedVehicles = allVehicles.filter(v => v.approval_status === 'Approved').length;

        const flaggedVehicles = allVehicles.filter(v => evaluateVehicleCertificates(v).overall !== 'valid').length;
        const allNotifs = buildAllAlertsAndNotifications();
        const unreadCount = allNotifs.filter(n => !n.read).length;

        const data = [
            ['Courier approvals', pendingCouriers, `${approvedCouriers} approved · ${state.couriers.length} total couriers`],
            ['Vehicle approvals', pendingVehicles, `${approvedVehicles} approved in shared pool`],
            ['Certificate alerts', flaggedVehicles, `${unreadCount} unread compliance notifications`],
            ['Active parcels', state.parcels.filter(p => ['accepted', 'picked_up'].includes(p.status)).length,
                `${state.parcels.filter(p => !p.courierId).length} unassigned parcels`]
        ];

        $('stats').innerHTML = data.map(([title, value, note]) =>
            `<div class="dashboard-card"><h3>${title}</h3><strong>${value}</strong><p>${note}</p></div>`
        ).join('');

        if ($('navCount')) $('navCount').textContent = pendingCouriers || state.couriers.length;
        if ($('navVehicleCount')) $('navVehicleCount').textContent = pendingVehicles || allVehicles.length;
        if ($('navNotifCount')) $('navNotifCount').textContent = unreadCount;
        if ($('headerNotifBadge')) $('headerNotifBadge').textContent = unreadCount;
    }

    function renderNotifications() {
        const container = $('notificationList');
        if (!container) return;

        const filter = $('notifFilter') ? $('notifFilter').value : 'all';
        const allItems = buildAllAlertsAndNotifications();
        const filtered = allItems.filter(item => {
            if (filter === 'all') return true;
            if (filter === 'unread') return !item.read;
            return item.type === filter;
        });

        if (!filtered.length) {
            container.innerHTML = `<p class="empty-state">No certificate alerts or notifications match this filter.</p>`;
            return;
        }

        container.innerHTML = filtered.map(item => {
            const badgeClass = item.type === 'expired'
                ? 'badge-rejected'
                : item.type === 'outdated'
                    ? 'badge-busy'
                    : 'badge-accepted';
            const badgeLabel = item.type === 'expired'
                ? '⚠ Expired Certificate'
                : item.type === 'outdated'
                    ? '⏳ Outdated / Expiring Soon'
                    : '✓ Document Updated';

            return `<article class="notification-card ${item.read ? 'is-read' : 'is-unread'} notif-type-${esc(item.type)}">
                <div class="notification-card-main">
                    <div class="notification-card-top">
                        <span class="badge ${badgeClass}">${badgeLabel}</span>
                        ${!item.read ? '<span class="unread-dot" title="Unread notification">NEW</span>' : ''}
                        <span class="small">${esc(item.createdAt ? formatDateDDMMYYYY(item.createdAt) : '')}</span>
                    </div>
                    <h3>${esc(item.title)}</h3>
                    <p>${esc(item.message)}</p>
                </div>
                <div class="notification-card-actions">
                    ${item.vehicleId ? `<a href="#vehicle-${esc(item.vehicleId)}" class="btn btn-outline" data-action="inspect-vehicle" data-id="${esc(item.vehicleId)}">Inspect vehicle</a>` : ''}
                    ${!item.read ? `<button type="button" class="text-button" data-action="mark-notif-read" data-id="${esc(item.id)}">Mark as read</button>` : '<span class="small">Read</span>'}
                </div>
            </article>`;
        }).join('');
    }

    function renderCouriers() {
        const query = ($('courierSearch')?.value || '').trim().toLocaleLowerCase('en');
        const approvalFilter = $('courierApprovalFilter') ? $('courierApprovalFilter').value : 'all';
        const statusFilter = $('courierFilter') ? $('courierFilter').value : 'all';
        const allVehicles = getSubmittedVehicles();

        const found = state.couriers.filter(c => {
            const matchesApproval = approvalFilter === 'all' || (c.approval_status || 'Approved') === approvalFilter;
            const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
            const matchesQuery = [c.name, c.username, c.nif, c.phone, c.email, c.id]
                .join(' ')
                .toLocaleLowerCase('en')
                .includes(query);
            return matchesApproval && matchesStatus && matchesQuery;
        });

        $('courierList').innerHTML = found.map(c => {
            const submittedByCourier = allVehicles.filter(v => (v.submitted_by_courier_id || v.courier_id) === c.id);
            const parcels = activeParcels(c.id);
            const initials = c.name.trim().split(/\s+/).map(w => Array.from(w)[0]).slice(0, 2).join('');
            const appStatus = c.approval_status || 'Approved';

            return `<article class="courier-card" id="courier-${esc(c.id)}">
                <div class="courier-heading">
                    <span class="courier-avatar" aria-hidden="true">${esc(initials)}</span>
                    <div>
                        <h3>${esc(c.name)}</h3>
                        <p class="small">${esc(c.id)} · @${esc(c.username || 'courier')}</p>
                    </div>
                    <div class="badge-stack">
                        ${approvalBadge(appStatus)}
                        ${badge(c.status)}
                    </div>
                </div>

                <div class="submission-details">
                    <div><span>Email</span><strong>${esc(c.email)}</strong></div>
                    <div><span>Phone</span><strong>${esc(c.phone)}</strong></div>
                    <div><span>NIF (Tax ID)</span><strong>${esc(c.nif || '—')}</strong></div>
                    <div><span>Submitted</span><strong>${esc(formatDateDDMMYYYY(c.createdAt || '2026-10-10'))}</strong></div>
                </div>

                <p class="card-label">Submitted vehicles · ${submittedByCourier.length}</p>
                <div class="parcel-chips">${submittedByCourier.length ? submittedByCourier.map(v => `<span class="parcel-chip">${esc(v.model)} (${esc(v.license_plate)}) · ${esc(v.approval_status)}</span>`).join('') : '<p class="small">No vehicles submitted</p>'}</div>

                <p class="card-label">Active parcels · ${parcels.length}</p>
                <div class="parcel-chips">${parcels.length ? parcels.map(p => `<a class="parcel-chip" href="#parcel-${p.id}">${p.id} · ${statuses[p.status]}</a>`).join('') : '<p class="small">No active parcels</p>'}</div>

                ${c.approved_by ? `<p class="small" style="margin-bottom: 6px;">Reviewed by: <strong>${esc(c.approved_by)}</strong></p>` : ''}

                <div class="approval-actions">
                    <button class="btn btn-approve" data-action="approve-courier" data-id="${esc(c.id)}" ${appStatus === 'Approved' ? 'disabled' : ''}>
                        Approve courier
                    </button>
                    <button class="btn btn-reject" data-action="reject-courier" data-id="${esc(c.id)}" ${appStatus === 'Rejected' ? 'disabled' : ''}>
                        Reject
                    </button>
                </div>

                <div class="card-actions">
                    <button class="text-button" data-action="edit" data-id="${esc(c.id)}">Edit courier details</button>
                    <button class="text-button danger" data-action="delete" data-id="${esc(c.id)}">Delete</button>
                </div>
            </article>`;
        }).join('') || '<p class="empty-state">No couriers match your filters.</p>';
    }

    function renderVehicles() {
        const container = $('vehicleList');
        if (!container) return;

        const query = ($('vehicleSearch')?.value || '').trim().toLocaleLowerCase('en');
        const filter = $('approvalFilter') ? $('approvalFilter').value : 'all';
        const certFilter = $('certificateFilter') ? $('certificateFilter').value : 'all';

        const allSubmitted = getSubmittedVehicles();
        const routeAssignments = getRouteAssignments();

        const filtered = allSubmitted.filter(v => {
            const cert = evaluateVehicleCertificates(v);
            const submitter = getCourierSubmitterName(v);
            const matchesApproval = filter === 'all' || v.approval_status === filter;
            const matchesCert = certFilter === 'all' || cert.overall === certFilter;
            const matchesQuery = [v.model, v.license_plate, v.type_name, submitter]
                .join(' ')
                .toLocaleLowerCase('en')
                .includes(query);
            return matchesApproval && matchesCert && matchesQuery;
        });

        if (!filtered.length) {
            container.innerHTML = `<p class="empty-state">${allSubmitted.length ? 'No vehicles match the selected filters.' : 'No vehicles have been submitted by couriers yet.'}</p>`;
            return;
        }

        container.innerHTML = filtered.map(v => {
            const statusClass = v.approval_status === 'Approved' ? 'available' :
                v.approval_status === 'Rejected' ? 'rejected' : 'busy';
            const submitter = getCourierSubmitterName(v);
            const activeRoutesForVehicle = Object.values(routeAssignments).filter(r => r && r.vehicle_id === v.id);
            const cert = evaluateVehicleCertificates(v);

            const certBanner = cert.overall === 'expired'
                ? `<div class="cert-alert-banner cert-alert-expired">⚠ <strong>Certificate Expired:</strong> ${cert.ins.state === 'expired' ? 'Insurance' : ''}${cert.ins.state === 'expired' && cert.insp.state === 'expired' ? ' &amp; ' : ''}${cert.insp.state === 'expired' ? 'Inspection' : ''} expired. Update required before approval/dispatch.</div>`
                : cert.overall === 'outdated'
                    ? `<div class="cert-alert-banner cert-alert-outdated">⏳ <strong>Expiring Soon:</strong> ${cert.ins.state === 'outdated' ? 'Insurance' : ''}${cert.ins.state === 'outdated' && cert.insp.state === 'outdated' ? ' &amp; ' : ''}${cert.insp.state === 'outdated' ? 'Inspection' : ''} certificate is nearing expiration.</div>`
                    : `<div class="cert-alert-banner cert-alert-valid">✓ Insurance &amp; inspection certificates are valid.</div>`;

            return `<article class="vehicle-card ${cert.overall !== 'valid' ? 'vehicle-card-flagged' : ''}" id="vehicle-${esc(v.id)}">
                <div class="vehicle-card-badges">
                    <span class="badge badge-${statusClass}">${esc(v.approval_status)}</span>
                    ${cert.overall === 'expired'
                        ? '<span class="badge badge-rejected">⚠ Expired Docs</span>'
                        : cert.overall === 'outdated'
                            ? '<span class="badge badge-busy">⏳ Docs Expiring Soon</span>'
                            : '<span class="badge badge-available">✓ Docs Valid</span>'}
                </div>
                <h3>${esc(v.model)}</h3>
                <span class="plate">${esc(v.license_plate)}</span>
                <p>${esc(v.type_name)} · Submitted by <strong>${esc(submitter)}</strong></p>

                <div class="submission-details">
                    <div><span>Max Weight</span><strong>${esc(v.max_weight_kg)} kg</strong></div>
                    <div><span>Max Volume</span><strong>${esc(v.max_vol_m3)} m³</strong></div>
                    <div class="cert-cell-${cert.ins.state}">
                        <span>Insurance Exp.</span>
                        <strong>${esc(formatDateDDMMYYYY(v.insurance_expiry_date))} ${cert.ins.state === 'expired' ? '⚠' : cert.ins.state === 'outdated' ? '⏳' : ''}</strong>
                    </div>
                    <div class="cert-cell-${cert.insp.state}">
                        <span>Inspection Exp.</span>
                        <strong>${esc(formatDateDDMMYYYY(v.inspection_expiry_date))} ${cert.insp.state === 'expired' ? '⚠' : cert.insp.state === 'outdated' ? '⏳' : ''}</strong>
                    </div>
                    <div><span>Insurance Doc</span><strong>${esc(v.insurance_expiry_doc)}</strong></div>
                    <div><span>Inspection Doc</span><strong>${esc(v.inspection_expiry_doc)}</strong></div>
                </div>

                ${certBanner}

                <p class="small" style="margin-top: 8px;">
                    ${v.approval_status === 'Approved'
                        ? (activeRoutesForVehicle.length
                            ? `Shared pool · Used on ${activeRoutesForVehicle.map(r => `${esc(r.order_id)} (${esc(r.used_by_courier_name || 'Courier')})`).join(', ')}`
                            : 'Shared pool · Available to all couriers for compatible orders')
                        : v.approval_status === 'Pending'
                            ? 'Pending staff validation before couriers can select it'
                            : 'Rejected · Not selectable by couriers'}
                </p>
                ${v.approved_by ? `<p class="small">Reviewed by: <strong>${esc(v.approved_by)}</strong></p>` : ''}
                ${v.doc_updated_at ? `<p class="small">Docs last updated: ${esc(formatDateDDMMYYYY(v.doc_updated_at))}</p>` : ''}

                <div class="approval-actions">
                    <button class="btn btn-approve" data-action="approve-vehicle" data-id="${esc(v.id)}" ${v.approval_status === 'Approved' ? 'disabled' : ''}>
                        Approve
                    </button>
                    <button class="btn btn-reject" data-action="reject-vehicle" data-id="${esc(v.id)}" ${v.approval_status === 'Rejected' ? 'disabled' : ''}>
                        Reject
                    </button>
                </div>

                <div class="card-actions" style="margin-top: 12px; padding-top: 12px;">
                    <button type="button" class="text-button" data-action="update-vehicle-docs" data-id="${esc(v.id)}">
                        Update / renew certificates
                    </button>
                </div>
            </article>`;
        }).join('');
    }

    function renderParcels() {
        const filter = $('parcelFilter') ? $('parcelFilter').value : 'all';
        const found = state.parcels.filter(p => filter === 'all' || p.status === filter);
        $('parcelList').innerHTML = found.map(p => `<tr id="parcel-${p.id}">
            <td><strong>${p.id}</strong><p class="small">${esc(p.item)}</p></td>
            <td class="route">${esc(p.pickup)}<span>→ ${esc(p.drop)}</span></td>
            <td>${badge(p.status)}</td><td>${esc(courierName(p.courierId))}</td>
            <td>${p.status === 'delivered' ? '<span class="small">Completed</span>' : `<button class="btn btn-outline" data-action="parcel" data-id="${p.id}" aria-label="Assign courier to ${p.id}">${p.courierId ? 'Change' : 'Assign'}</button>`}</td>
        </tr>`).join('') || '<tr><td colspan="5">No parcels in this view.</td></tr>';
    }

    function render() {
        syncRegisteredCouriersFromUsers();
        renderStats();
        renderNotifications();
        renderCouriers();
        renderVehicles();
        renderParcels();
    }

    // =========================================================================
    // APPROVALS & UPDATES
    // =========================================================================
    function updateCourierApproval(id, newStatus) {
        const courier = state.couriers.find(c => String(c.id) === String(id));
        if (!courier) return;
        courier.approval_status = newStatus;
        courier.approved_by = staffReviewerLabel;
        if (newStatus === 'Rejected') {
            courier.status = 'offline';
        }
        syncCourierStatusToUsers(courier);
        save(`Courier ${courier.name} ${newStatus.toLowerCase()}.`);
    }

    function updateVehicleApproval(id, newStatus) {
        const list = getSubmittedVehicles();
        const vehicle = list.find(v => String(v.id) === String(id));
        if (!vehicle) return;

        if (newStatus === 'Approved') {
            const cert = evaluateVehicleCertificates(vehicle);
            if (cert.overall === 'expired') {
                toast(`Cannot approve ${vehicle.model} (${vehicle.license_plate}): insurance or inspection certificate is expired. Update certificates first.`);
                return;
            }
        }

        vehicle.approval_status = newStatus;
        vehicle.approved_by = staffReviewerLabel;

        saveSubmittedVehicles(list);
        render();
        toast(`Vehicle ${vehicle.license_plate} (${vehicle.model}) ${newStatus.toLowerCase()}.`);
    }

    function openVehicleDocUpdate(vehicleId) {
        const list = getSubmittedVehicles();
        const vehicle = list.find(v => String(v.id) === String(vehicleId));
        if (!vehicle) return;

        const form = $('docUpdateForm');
        form.reset();
        $('docUpdateError').textContent = '';
        $('docUpdateDescription').textContent = `${vehicle.model} · ${vehicle.license_plate} (Submitted by ${getCourierSubmitterName(vehicle)})`;
        form.elements.namedItem('vehicleId').value = vehicle.id;
        form.elements.namedItem('insurance_expiry_date').value = vehicle.insurance_expiry_date || '';
        form.elements.namedItem('insurance_expiry_doc').value = vehicle.insurance_expiry_doc || '';
        form.elements.namedItem('inspection_expiry_date').value = vehicle.inspection_expiry_date || '';
        form.elements.namedItem('inspection_expiry_doc').value = vehicle.inspection_expiry_doc || '';
        $('docUpdateDialog').showModal();
    }

    $('docUpdateForm')?.addEventListener('submit', event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        const list = getSubmittedVehicles();
        const vehicle = list.find(v => String(v.id) === String(data.vehicleId));
        if (!vehicle) return;

        vehicle.insurance_expiry_date = data.insurance_expiry_date.trim();
        vehicle.insurance_expiry_doc = data.insurance_expiry_doc.trim();
        vehicle.inspection_expiry_date = data.inspection_expiry_date.trim();
        vehicle.inspection_expiry_doc = data.inspection_expiry_doc.trim();
        vehicle.doc_updated_at = new Date().toISOString();

        saveSubmittedVehicles(list);

        const cert = evaluateVehicleCertificates(vehicle);
        pushStaffNotification({
            type: cert.overall === 'expired' ? 'expired' : cert.overall === 'outdated' ? 'outdated' : 'updated',
            title: `Certificates Updated · ${vehicle.model} (${vehicle.license_plate})`,
            message: `Documents updated for ${vehicle.model} (${vehicle.license_plate}): Insurance (${vehicle.insurance_expiry_doc}, exp. ${formatDateDDMMYYYY(vehicle.insurance_expiry_date)}) and Inspection (${vehicle.inspection_expiry_doc}, exp. ${formatDateDDMMYYYY(vehicle.inspection_expiry_date)}).`,
            vehicleId: vehicle.id
        });

        $('docUpdateDialog').close();
        render();
        toast(`Certificates updated for ${vehicle.model} (${vehicle.license_plate}). Notification logged.`);
    });

    // =========================================================================
    // COURIER EDITOR & PARCEL ASSIGNMENT
    // =========================================================================
    function editCourier(id) {
        const form = $('courierForm');
        form.reset();
        $('formError').textContent = '';
        const courier = state.couriers.find(c => c.id === id);
        $('courierTitle').textContent = courier ? 'Edit courier' : 'Add courier';
        for (const key of ['id', 'name', 'username', 'nif', 'phone', 'email', 'approval_status', 'status']) {
            const field = form.elements.namedItem(key);
            if (!field) continue;
            field.value = courier?.[key] || (key === 'status' ? 'available' : key === 'approval_status' ? 'Pending' : '');
        }
        $('courierDialog').showModal();
    }

    $('courierForm')?.addEventListener('submit', event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        for (const key of ['name', 'username', 'nif', 'phone', 'email']) {
            data[key] = (data[key] || '').trim();
        }
        const existing = state.couriers.find(c => c.id === data.id);
        const error = message => {
            $('formError').textContent = message;
        };
        if (!data.name || !/^[+0-9() .-]{5,30}$/.test(data.phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            return error('Enter a full name, a valid phone number and a valid email address.');
        }
        if (data.status === 'offline' && existing && activeParcels(existing.id).length) {
            return error('Reassign active parcels to another courier first.');
        }
        if (state.couriers.some(c => c.id !== data.id && c.email.toLowerCase() === data.email.toLowerCase())) {
            return error('This email address is already assigned to another courier.');
        }
        if (existing) {
            Object.assign(existing, data);
            syncCourierStatusToUsers(existing);
        } else {
            const created = {
                ...data,
                id: `CR-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
                createdAt: new Date().toISOString()
            };
            state.couriers.push(created);
            syncCourierStatusToUsers(created);
        }
        $('courierDialog').close();
        save(existing ? 'Courier details updated.' : 'New courier added.');
    });

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
            `${target.id} · ${target.item}. Only Approved and available couriers can be selected.`;

        const current = target.courierId || '';
        const options = state.couriers.map(c => {
            const isApproved = (c.approval_status || 'Approved') === 'Approved';
            return {
                id: c.id,
                label: `${c.name} · ${isApproved ? statuses[c.status] : (c.approval_status || 'Pending')}`,
                disabled: c.status === 'offline' || !isApproved
            };
        });

        select.innerHTML =
            `<option value="" ${target.status === 'picked_up' ? 'disabled' : ''}>Unassigned</option>` +
            options.map(o =>
                `<option value="${o.id}" ${o.disabled ? 'disabled' : ''}>${esc(o.label)}</option>`).join('');
        select.value = current;
        $('assignmentDialog').showModal();
    }

    $('assignmentForm')?.addEventListener('submit', event => {
        event.preventDefault();
        const { kind, target, selection } = Object.fromEntries(new FormData(event.currentTarget));
        const error = message => {
            $('assignmentError').textContent = message;
        };
        if (kind === 'parcel') {
            const parcel = state.parcels.find(p => p.id === target);
            if (!parcel || parcel.status === 'delivered') return error('This parcel cannot be changed.');
            const courier = state.couriers.find(c => c.id === selection);
            if (selection && (!courier || courier.status === 'offline' || (courier.approval_status || 'Approved') !== 'Approved')) {
                return error('Select an approved and available courier.');
            }
            if (!selection && parcel.status === 'picked_up') {
                return error('A picked-up parcel must have an assigned courier.');
            }
            parcel.courierId = selection || null;
            if (parcel.status !== 'picked_up') parcel.status = selection ? 'accepted' : 'unassigned';
        }
        $('assignmentDialog').close();
        save('Assignment saved.');
    });

    function confirmAction(title, text) {
        $('confirmTitle').textContent = title;
        $('confirmText').textContent = text;
        const dialog = $('confirmDialog');
        dialog.returnValue = 'cancel';
        dialog.showModal();
        return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
    }

    async function deleteCourier(id) {
        const courier = state.couriers.find(c => c.id === id);
        if (!courier) return;
        if (state.parcels.some(p => p.courierId === id)) {
            toast('A courier with assigned parcels cannot be deleted. Reassign their active deliveries first.');
            return;
        }
        if (!await confirmAction('Delete courier?', `${courier.name} will be deleted from the courier directory.`)) return;
        state.couriers = state.couriers.filter(c => c.id !== id);
        save('Courier deleted.');
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

        if (action === 'edit') editCourier(id);
        else if (action === 'delete') deleteCourier(id);
        else if (action === 'approve-courier') updateCourierApproval(id, 'Approved');
        else if (action === 'reject-courier') updateCourierApproval(id, 'Rejected');
        else if (action === 'approve-vehicle') updateVehicleApproval(id, 'Approved');
        else if (action === 'reject-vehicle') updateVehicleApproval(id, 'Rejected');
        else if (action === 'update-vehicle-docs') openVehicleDocUpdate(id);
        else if (action === 'mark-notif-read') markNotificationRead(id);
        else if (action === 'inspect-vehicle') {
            if ($('approvalFilter')) $('approvalFilter').value = 'all';
            if ($('certificateFilter')) $('certificateFilter').value = 'all';
            renderVehicles();
            requestAnimationFrame(() => document.getElementById(`vehicle-${id}`)?.scrollIntoView({ behavior: 'smooth' }));
        } else assignment(action, id);
    });

    $('addCourier')?.addEventListener('click', () => editCourier());
    $('markAllReadBtn')?.addEventListener('click', markAllNotificationsRead);
    $('notifFilter')?.addEventListener('change', renderNotifications);
    $('courierSearch')?.addEventListener('input', renderCouriers);
    $('courierApprovalFilter')?.addEventListener('change', renderCouriers);
    $('courierFilter')?.addEventListener('change', renderCouriers);
    $('vehicleSearch')?.addEventListener('input', renderVehicles);
    $('approvalFilter')?.addEventListener('change', renderVehicles);
    $('certificateFilter')?.addEventListener('change', renderVehicles);
    $('parcelFilter')?.addEventListener('change', renderParcels);

    $('resetDemo')?.addEventListener('click', async () => {
        if (!await confirmAction('Reset Staff demo data?',
                'Couriers, parcel assignments, vehicle submissions and certificate alerts will return to their initial values.'
            )) return;
        state = seed();
        try {
            localStorage.setItem('cms_vehicles', JSON.stringify(defaultSeedVehicles()));
            localStorage.setItem('cms_vehicles_seeded_v3_staff', '1');
            localStorage.removeItem(NOTIF_KEY);
            localStorage.removeItem('cms_staff_read_alerts');
        } catch { /* ignore */ }
        canSave = true;
        if ($('storageWarning')) $('storageWarning').hidden = true;
        if ($('courierSearch')) $('courierSearch').value = '';
        if ($('courierApprovalFilter')) $('courierApprovalFilter').value = 'all';
        if ($('courierFilter')) $('courierFilter').value = 'all';
        if ($('vehicleSearch')) $('vehicleSearch').value = '';
        if ($('approvalFilter')) $('approvalFilter').value = 'all';
        if ($('certificateFilter')) $('certificateFilter').value = 'all';
        if ($('parcelFilter')) $('parcelFilter').value = 'all';
        if ($('notifFilter')) $('notifFilter').value = 'all';
        save('Staff demo data restored.');
    });

    function nav() {
        const section = location.hash.slice(1) || 'overview';
        document.querySelectorAll('[data-nav]').forEach(link => {
            const active = link.dataset.nav === section ||
                (section.startsWith('parcel-') && link.dataset.nav === 'parcels') ||
                (section.startsWith('vehicle-') && link.dataset.nav === 'fleet');
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
        if (section.startsWith('parcel-')) {
            if ($('parcelFilter')) $('parcelFilter').value = 'all';
            renderParcels();
            requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView());
        }
    }

    window.addEventListener('hashchange', nav);
    window.addEventListener('storage', event => {
        if (event.key === 'cms_vehicles' || event.key === 'cms_route_assignments' || event.key === NOTIF_KEY || event.key === 'cms_users') {
            render();
            toast('Operational data or vehicle certificates updated.');
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

