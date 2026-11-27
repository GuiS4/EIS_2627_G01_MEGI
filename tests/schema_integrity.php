<?php
declare(strict_types=1);
/**
 * CourierFlow P1: schema and referential integrity checks.
 * Read-only metadata checks + negative INSERT checks inside a rolled-back transaction.
 * Run only against a LOCAL development database; never against production.
 */
require_once __DIR__ . '/../api/src/Database.php';
use CourierFlow\Database;

function check(bool $ok, string $label): void {
    if (!$ok) throw new RuntimeException($label);
    echo "PASS: {$label}\n";
}
function mustReject(PDO $pdo, string $sql, array $params, string $label): void {
    $pdo->exec('SAVEPOINT integrity_case');
    try {
        $s = $pdo->prepare($sql);
        $s->execute($params);
        throw new RuntimeException("Unexpectedly accepted invalid data: {$label}");
    } catch (PDOException $e) {
        // SQLSTATE 23xxx = integrity constraint; 23000 covers MySQL duplicate/FK/CHECK.
        if (substr((string)$e->getCode(), 0, 2) !== '23') throw $e;
        echo "PASS: {$label}\n";
    } finally {
        $pdo->exec('ROLLBACK TO SAVEPOINT integrity_case');
        $pdo->exec('RELEASE SAVEPOINT integrity_case');
    }
}

$pdo = null;
try {
    $pdo = Database::connection();
    $databaseName = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
    check($databaseName === 'courierflow', 'Connected to expected database courierflow');

    $expectedTables = [
        'users','vehicle_types','vehicles','products','pricing_settings',
        'routes','orders','order_products','payments','dispatch_proposals',
        'reweighting_incidents','route_stops','proof_of_delivery',
    ];
    $tables = $pdo->query("SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'")
                  ->fetchAll(PDO::FETCH_KEY_PAIR);
    $missing = array_values(array_diff($expectedTables, array_keys($tables)));
    check($missing === [], 'All 13 required tables present' . ($missing ? ': '.implode(',',$missing) : ''));
    foreach ($expectedTables as $table) {
        check(strcasecmp((string)$tables[$table], 'InnoDB') === 0, "InnoDB storage: {$table}");
    }
    $foreignKeys = (int)$pdo->query("SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE()")->fetchColumn();
    check($foreignKeys >= 15, 'Foreign key constraints present (at least 15)');

    $seed = $pdo->query("SELECT name FROM vehicle_types WHERE name IN ('Bike','Moto','Van','Truck')")->fetchAll(PDO::FETCH_COLUMN);
    check(count(array_unique($seed)) === 4, 'Four expected vehicle types seeded');
    check((int)$pdo->query('SELECT COUNT(*) FROM pricing_settings WHERE id = 1')->fetchColumn() === 1, 'Pricing record id=1 seeded');

    $pdo->beginTransaction();
    $nonce = bin2hex(random_bytes(7));
    $username = 'integrity_'.$nonce;
    $email = 'integrity_'.$nonce.'@example.test';
    $insertUser = $pdo->prepare("INSERT INTO users (name, username, email, password_hash, role) VALUES ('Integrity Test', :username, :email, :hash, 'client')");
    $insertUser->execute(['username'=>$username, 'email'=>$email, 'hash'=>password_hash($nonce, PASSWORD_DEFAULT)]);
    $clientId = (int)$pdo->lastInsertId();
    check($clientId > 0, 'Temporary user inserted inside transaction');

    mustReject($pdo,
        "INSERT INTO users (name, username, email, password_hash, role) VALUES ('Duplicate Test', :username, :email, 'dummy', 'client')",
        ['username'=>$username, 'email'=>'new_'.$email],
        'Duplicate username rejected');
    mustReject($pdo,
        "INSERT INTO users (name, username, email, password_hash, role) VALUES ('Duplicate Test', :username, :email, 'dummy', 'client')",
        ['username'=>'new_'.$username, 'email'=>$email],
        'Duplicate email rejected');
    // A FOREIGN KEY test that cannot accidentally collide with a real integer ID.
    mustReject($pdo,
        'INSERT INTO products (client_id, description, category, weight_kg, volume_m3) VALUES (0, :descr, :cat, 1, 0.01)',
        ['descr'=>'Orphan product', 'cat'=>'Test'],
        'Product with nonexistent client rejected');
    mustReject($pdo,
        'INSERT INTO vehicle_types (name, max_weight_kg, max_volume_m3) VALUES (:name, 0, 0.5)',
        ['name'=>'Invalid_'.$nonce],
        'Zero maximum weight rejected by CHECK constraint');

    echo "ALL INTEGRITY TESTS PASSED; temporary data will be rolled back.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "FAILED: {$error->getMessage()}\n");
    $exitCode = 1;
} finally {
    if ($pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
}
exit($exitCode ?? 0);
