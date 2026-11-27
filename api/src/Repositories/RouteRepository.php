<?php
declare(strict_types=1);
namespace CourierFlow\Repositories;

use PDO;

final class RouteRepository {
    public function __construct(private PDO $pdo) {}

    public function findById(int $id): ?array {
        $stmt = $this->pdo->prepare('SELECT * FROM routes WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findOrders(int $routeId): array {
        $stmt = $this->pdo->prepare('SELECT * FROM orders WHERE route_id = :route ORDER BY id');
        $stmt->execute(['route' => $routeId]);
        return $stmt->fetchAll();
    }

    public function findStops(int $routeId): array {
        $stmt = $this->pdo->prepare('SELECT * FROM route_stops WHERE route_id = :route ORDER BY stop_sequence ASC');
        $stmt->execute(['route' => $routeId]);
        return $stmt->fetchAll();
    }

    public function create(int $courierId, int $vehicleId): int {
        $stmt = $this->pdo->prepare('INSERT INTO routes (courier_id, vehicle_id) VALUES (:courier, :vehicle)');
        $stmt->execute(['courier' => $courierId, 'vehicle' => $vehicleId]);
        return (int)$this->pdo->lastInsertId();
    }

    // Call inside an explicit transaction after checking payment, capacity and assignments in the BLL.
    public function attachOrder(int $routeId, int $orderId): bool {
        $stmt = $this->pdo->prepare('UPDATE orders SET route_id = :route WHERE id = :order AND route_id IS NULL');
        $stmt->execute(['route' => $routeId, 'order' => $orderId]);
        return $stmt->rowCount() === 1;
    }

    public function addStop(int $routeId, int $orderId, int $sequence, string $type, float $latitude, float $longitude): int {
        if (!in_array($type, ['Pickup', 'Dropoff'], true)) throw new \InvalidArgumentException('Invalid stop type');
        $stmt = $this->pdo->prepare('INSERT INTO route_stops (route_id,order_id,stop_sequence,stop_type,latitude,longitude) VALUES (:route,:order_id,:seq,:type,:lat,:lng)');
        $stmt->execute(['route' => $routeId, 'order_id' => $orderId, 'seq' => $sequence, 'type' => $type, 'lat' => $latitude, 'lng' => $longitude]);
        return (int)$this->pdo->lastInsertId();
    }
}
