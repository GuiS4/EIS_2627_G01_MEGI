<?php
declare(strict_types=1);
namespace CourierFlow\Repositories;

use PDO;
use InvalidArgumentException;

final class VehicleRepository {
    public function __construct(private PDO $pdo) {}

    public function findById(int $id): ?array {
        $stmt = $this->pdo->prepare('SELECT v.*, t.name AS vehicle_type, t.max_weight_kg, t.max_volume_m3 FROM vehicles v JOIN vehicle_types t ON t.id = v.vehicle_type_id WHERE v.id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findByCourier(int $courierId): array {
        $stmt = $this->pdo->prepare('SELECT v.*, t.name AS vehicle_type, t.max_weight_kg, t.max_volume_m3 FROM vehicles v JOIN vehicle_types t ON t.id = v.vehicle_type_id WHERE v.courier_id = :courier_id ORDER BY v.id DESC');
        $stmt->execute(['courier_id' => $courierId]);
        return $stmt->fetchAll();
    }

    public function create(array $data): int {
        $required = ['courier_id', 'vehicle_type_id', 'model', 'license_plate', 'insurance_expiry_date', 'inspection_expiry_date', 'insurance_document_name', 'inspection_document_name'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                throw new InvalidArgumentException("Missing vehicle field: $field");
            }
        }
        $stmt = $this->pdo->prepare('INSERT INTO vehicles (courier_id, vehicle_type_id, model, license_plate, insurance_expiry_date, inspection_expiry_date, insurance_document_name, inspection_document_name) VALUES (:courier_id, :vehicle_type_id, :model, :license_plate, :insurance_expiry_date, :inspection_expiry_date, :insurance_document_name, :inspection_document_name)');
        $stmt->execute(array_intersect_key($data, array_flip($required)));
        return (int)$this->pdo->lastInsertId();
    }

    public function setApproval(int $vehicleId, string $status, int $reviewerId): bool {
        if (!in_array($status, ['Approved','Rejected'], true)) {
            throw new InvalidArgumentException('Invalid approval status');
        }
        $stmt = $this->pdo->prepare('UPDATE vehicles SET approval_status = :status, approved_by = :reviewer WHERE id = :id');
        $stmt->execute(['status' => $status, 'reviewer' => $reviewerId, 'id' => $vehicleId]);
        return $stmt->rowCount() > 0;
    }

    // The BLL must also ensure the courier is approved and eligible for allocation.
    public function findEligibleForCourier(int $courierId): array {
        $stmt = $this->pdo->prepare("SELECT v.*, t.name AS vehicle_type, t.max_weight_kg, t.max_volume_m3 FROM vehicles v JOIN vehicle_types t ON t.id = v.vehicle_type_id WHERE v.courier_id = :courier AND v.approval_status = 'Approved' AND v.insurance_expiry_date >= CURRENT_DATE() AND v.inspection_expiry_date >= CURRENT_DATE()");
        $stmt->execute(['courier' => $courierId]);
        return $stmt->fetchAll();
    }
}
