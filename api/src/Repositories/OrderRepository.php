<?php
declare(strict_types=1);
namespace CourierFlow\Repositories;

use PDO;
use InvalidArgumentException;

final class OrderRepository {
    public function __construct(private PDO $pdo) {}

    public function findById(int $id): ?array {
        $stmt = $this->pdo->prepare('SELECT * FROM orders WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findByClient(int $clientId): array {
        $stmt = $this->pdo->prepare('SELECT * FROM orders WHERE client_id = :client ORDER BY created_at DESC, id DESC');
        $stmt->execute(['client' => $clientId]);
        return $stmt->fetchAll();
    }

    public function findPaidAvailable(int $limit = 50): array {
        if ($limit < 1 || $limit > 500) throw new InvalidArgumentException('Limit must be 1..500');
        $stmt = $this->pdo->prepare("SELECT * FROM orders WHERE payment_status = 'Paid' AND status = 'Pending' AND route_id IS NULL ORDER BY created_at ASC, id ASC LIMIT :lim");
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function create(array $data): int {
        $required = ['client_id','origin_address','destination_address','origin_lat','origin_lng','destination_lat','destination_lng','distance_km','declared_weight_kg','volume_m3','total_price'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || $data[$field] === '') throw new InvalidArgumentException("Missing order field: $field");
        }
        $stmt = $this->pdo->prepare('INSERT INTO orders (client_id,origin_address,destination_address,origin_lat,origin_lng,destination_lat,destination_lng,distance_km,declared_weight_kg,volume_m3,total_price) VALUES (:client_id,:origin_address,:destination_address,:origin_lat,:origin_lng,:destination_lat,:destination_lng,:distance_km,:declared_weight_kg,:volume_m3,:total_price)');
        $stmt->execute(array_intersect_key($data, array_flip($required)));
        return (int)$this->pdo->lastInsertId();
    }

    public function setPaymentStatus(int $id, string $status): bool {
        if (!in_array($status, ['Unpaid', 'Pending', 'Paid', 'Failed'], true)) throw new InvalidArgumentException('Invalid payment status');
        $stmt = $this->pdo->prepare('UPDATE orders SET payment_status = :status WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);
        return $stmt->rowCount() > 0;
    }
}
