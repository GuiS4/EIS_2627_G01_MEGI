<?php
declare(strict_types=1);

// CLI-only import of vehicle type reference data, with default dry-run.
// Usage: php scripts/import_vehicle_types.php database/samples/vehicle_types.csv [--apply]
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("CLI only\n");
}
require_once __DIR__ . '/../api/src/Database.php';
use CourierFlow\Database;

$path = $argv[1] ?? '';
$apply = ($argv[2] ?? '') === '--apply';
if ($path === '' || !is_file($path) || (isset($argv[2]) && !$apply)) {
    fwrite(STDERR, "Usage: php scripts/import_vehicle_types.php <file.csv> [--apply]\n");
    exit(1);
}
$handle = fopen($path, 'rb');
if ($handle === false) {
    fwrite(STDERR, "Cannot open CSV\n");
    exit(1);
}
try {
    $header = fgetcsv($handle, 0, ',', '"', '');
    if ($header !== ['name', 'max_weight_kg', 'max_volume_m3']) {
        throw new RuntimeException('Expected header: name,max_weight_kg,max_volume_m3');
    }
    $records = [];
    $seen = [];
    $line = 1;
    while (($fields = fgetcsv($handle, 0, ',', '"', '')) !== false) {
        ++$line;
        if ($fields === [null]) continue;
        if (count($fields) !== 3) throw new RuntimeException("Line {$line}: expected exactly 3 columns");
        [$name, $weight, $volume] = array_map('trim', $fields);
        if ($name === '' || strlen($name) > 60) throw new RuntimeException("Line {$line}: invalid name");
        if (!preg_match('/^\d{1,9}(?:\.\d{1,3})?$/D', $weight) || (float)$weight <= 0) {
            throw new RuntimeException("Line {$line}: invalid weight (max 3 decimal places)");
        }
        if (!preg_match('/^\d{1,7}(?:\.\d{1,5})?$/D', $volume) || (float)$volume <= 0) {
            throw new RuntimeException("Line {$line}: invalid volume (max 5 decimal places)");
        }
        $key = strtolower($name);
        if (isset($seen[$key])) throw new RuntimeException("Line {$line}: duplicated type name");
        $seen[$key] = true;
        $records[] = [$name, $weight, $volume];
    }
    echo count($records) . " validated vehicle type(s).\n";
    if (!$apply) {
        echo "DRY RUN — nothing changed. Add --apply to insert or update rows.\n";
        exit(0);
    }
    $pdo = Database::connection();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO vehicle_types (name,max_weight_kg,max_volume_m3) VALUES (?,?,?) ON DUPLICATE KEY UPDATE max_weight_kg=VALUES(max_weight_kg), max_volume_m3=VALUES(max_volume_m3)');
        foreach ($records as $record) $stmt->execute($record);
        $pdo->commit();
        echo "Applied " . count($records) . " row(s) successfully.\n";
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
} catch (Throwable $error) {
    fwrite(STDERR, 'Import failed: ' . $error->getMessage() . "\n");
    exit(1);
} finally {
    fclose($handle);
}
