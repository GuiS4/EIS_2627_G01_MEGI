<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/src/Database.php';

use CourierFlow\Database;

try {
    $db = Database::connection();
    $tables = $db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    $expected = ['users','vehicle_types','vehicles','products','pricing_settings','routes','orders','order_products','payments','dispatch_proposals','proof_of_delivery','reweighting_incidents','route_stops'];
    $missing = array_values(array_diff($expected, $tables));
    $settings = $db->query('SELECT base_fee,rate_per_km,rate_per_kg,volumetric_factor FROM pricing_settings WHERE id=1')->fetch();
    echo "Connected to MySQL successfully.\n";
    echo 'Tables found: ' . count($tables) . "\n";
    echo 'Missing required tables: ' . ($missing ? implode(', ', $missing) : 'none') . "\n";
    echo 'Pricing defaults: ' . json_encode($settings, JSON_UNESCAPED_SLASHES) . "\n";
    exit($missing || !$settings ? 1 : 0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Database test failed: ' . $e->getMessage() . "\n");
    exit(1);
}
