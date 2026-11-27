<?php
declare(strict_types=1);

// CLI-only export of explicitly authorized non-sensitive reference data.
// Usage: php scripts/export_csv.php vehicle_types output.csv
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("CLI only\n");
}
require_once __DIR__ . '/../api/src/Database.php';
use CourierFlow\Database;

$exportable = [
    'vehicle_types' => ['id', 'name', 'max_weight_kg', 'max_volume_m3'],
    'pricing_settings' => ['id', 'base_fee', 'rate_per_km', 'rate_per_kg', 'volumetric_factor'],
];
$table = $argv[1] ?? '';
$destination = $argv[2] ?? '';
if (!isset($exportable[$table]) || $destination === '') {
    fwrite(STDERR, "Usage: php scripts/export_csv.php <vehicle_types|pricing_settings> <output.csv>\n");
    exit(1);
}
if (is_file($destination)) {
    fwrite(STDERR, "Refusing to overwrite existing file: {$destination}\n");
    exit(1);
}
$columns = $exportable[$table];
try {
    $pdo = Database::connection();
    // Table and column identifiers come only from the fixed allowlist above.
    $sql = 'SELECT ' . implode(', ', $columns) . ' FROM ' . $table . ' ORDER BY id';
    $rows = $pdo->query($sql);
    $handle = fopen($destination, 'x'); // Exclusive create: no overwrite
    if ($handle === false) {
        throw new RuntimeException('Cannot create destination CSV');
    }
    try {
        fputcsv($handle, $columns, ',', '"', '');
        foreach ($rows as $row) {
            $values = array_map(static function (string $column) use ($row): string {
                $value = (string)($row[$column] ?? '');
                // Prevent spreadsheet formula execution when CSV is opened in Excel.
                return preg_match('/^[\s]*[=+@\-]/u', $value) ? "'" . $value : $value;
            }, $columns);
            fputcsv($handle, $values, ',', '"', '');
        }
    } finally {
        fclose($handle);
    }
    echo "Export complete: {$destination}\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'Export failed: ' . $error->getMessage() . "\n");
    exit(1);
}
