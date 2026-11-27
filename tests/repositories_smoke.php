<?php
declare(strict_types=1);
// Integration test: requires local MySQL, rolls back ALL test writes.
require_once __DIR__ . '/../api/src/Database.php';
foreach (['UserRepository', 'VehicleRepository', 'OrderRepository', 'RouteRepository', 'PaymentRepository'] as $name) {
    require_once __DIR__ . '/../api/src/Repositories/' . $name . '.php';
}

use CourierFlow\Database;
use CourierFlow\Repositories\UserRepository;
use CourierFlow\Repositories\VehicleRepository;
use CourierFlow\Repositories\OrderRepository;
use CourierFlow\Repositories\RouteRepository;
use CourierFlow\Repositories\PaymentRepository;

function ensure(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
    echo "PASS: $message\n";
}

$pdo = null;
try {
    $pdo = Database::connection();
    $pdo->beginTransaction();
    $users = new UserRepository($pdo);
    $vehicles = new VehicleRepository($pdo);
    $orders = new OrderRepository($pdo);
    $routes = new RouteRepository($pdo);
    $payments = new PaymentRepository($pdo);
    $nonce = bin2hex(random_bytes(5));
    $hash = password_hash('IntegrationOnly-' . $nonce, PASSWORD_DEFAULT);
    $courier = $users->create(['name'=>'Smoke Courier','username'=>'smoke_c_'.$nonce,'email'=>'courier_'.$nonce.'@example.test','password_hash'=>$hash,'role'=>'courier']);
    $client = $users->create(['name'=>'Smoke Client','username'=>'smoke_l_'.$nonce,'email'=>'client_'.$nonce.'@example.test','password_hash'=>$hash,'role'=>'client', 'approval_status'=>'Approved']);
    $staff = $users->create(['name'=>'Smoke Staff','username'=>'smoke_s_'.$nonce,'email'=>'staff_'.$nonce.'@example.test','password_hash'=>$hash,'role'=>'staff', 'approval_status'=>'Approved']);
    ensure($users->findById($courier)['role'] === 'courier', 'Create/read user');
    ensure(password_verify('IntegrationOnly-'.$nonce, $users->findForAuthentication('courier_'.$nonce.'@example.test')['password_hash']), 'Hash verified');
    ensure($users->setApproval($courier, 'Approved', $staff), 'Approve courier');
    $typeId = $pdo->query("SELECT id FROM vehicle_types WHERE name = 'Van' LIMIT 1")->fetchColumn();
    ensure((bool)$typeId, 'Van type exists');
    $vehicleId = $vehicles->create([
        'courier_id'=>$courier, 'vehicle_type_id'=>(int)$typeId, 'model'=>'Test Van', 'license_plate'=>'TEST-'.$nonce,
        'insurance_expiry_date'=>'2030-12-31','inspection_expiry_date'=>'2030-12-31',
        'insurance_document_name'=>'test-insurance.pdf','inspection_document_name'=>'test-inspection.pdf',
    ]);
    ensure($vehicles->findById($vehicleId)['vehicle_type'] === 'Van', 'Create/read vehicle with type');
    ensure($vehicles->setApproval($vehicleId, 'Approved', $staff), 'Approve vehicle');
    ensure(count($vehicles->findEligibleForCourier($courier)) === 1, 'Eligible vehicle list');
    $orderId = $orders->create([
        'client_id'=>$client,'origin_address'=>'FEUP','destination_address'=>'Porto Centre',
        'origin_lat'=>41.178,'origin_lng'=>-8.598,'destination_lat'=>41.15,'destination_lng'=>-8.61,
        'distance_km'=>5,'declared_weight_kg'=>3,'volume_m3'=>0.01,'total_price'=>5.7,
    ]);
    ensure($orders->findById($orderId)['payment_status'] === 'Unpaid', 'Create unpaid order');
    $paymentId = $payments->createPending($orderId, '5.70');
    ensure(count($payments->findByOrder($orderId)) === 1, 'Create payment');
    ensure($payments->finalize($paymentId, 'Succeeded', 'TEST-'.$nonce), 'Finalize verified sample payment');
    // This status update is illustrative only: real BLL must verify payment and run both writes atomically.
    ensure($orders->setPaymentStatus($orderId, 'Paid'), 'Update payment status');
    ensure(count($orders->findPaidAvailable()) >= 1, 'Find paid orders awaiting assignment');
    $routeId = $routes->create($courier, $vehicleId);
    ensure($routes->attachOrder($routeId, $orderId), 'Attach order to route');
    ensure($routes->addStop($routeId, $orderId, 1, 'Pickup', 41.178, -8.598) > 0, 'Insert route stop');
    ensure(count($routes->findStops($routeId)) === 1, 'Read ordered stops');
    ensure(count($routes->findOrders($routeId)) === 1, 'Read pooled route orders');
    echo "ALL TESTS PASSED; rolling back sample data.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'FAILED: '.$error->getMessage()."\n");
    $exitCode = 1;
} finally {
    if ($pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
}
exit($exitCode ?? 0);
