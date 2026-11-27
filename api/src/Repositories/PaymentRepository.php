<?php
declare(strict_types=1);
namespace CourierFlow\Repositories;

use PDO;
use InvalidArgumentException;

final class PaymentRepository {
    public function __construct(private PDO $pdo) {}

    public function findById(int $id): ?array {
        $stmt = $this->pdo->prepare('SELECT * FROM payments WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findByOrder(int $orderId): array {
        $stmt = $this->pdo->prepare('SELECT * FROM payments WHERE order_id = :order ORDER BY created_at, id');
        $stmt->execute(['order' => $orderId]);
        return $stmt->fetchAll();
    }

    public function createPending(int $orderId, string $amount, string $kind = 'Initial'): int {
        if (!in_array($kind, ['Initial', 'Adjustment'], true)) throw new InvalidArgumentException('Invalid payment kind');
        if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $amount) || (float)$amount <= 0) {
            throw new InvalidArgumentException('Amount must be a positive decimal string with at most 2 fractional digits');
        }
        $stmt = $this->pdo->prepare("INSERT INTO payments (order_id,amount,payment_kind,status) VALUES (:order_id,:amount,:kind,'Pending')");
        $stmt->execute(['order_id' => $orderId, 'amount' => $amount, 'kind' => $kind]);
        return (int)$this->pdo->lastInsertId();
    }

    // Only the Payment BLL should call this after authoritative gateway verification.
    public function finalize(int $paymentId, string $status, ?string $gatewayReference): bool {
        if (!in_array($status, ['Succeeded','Failed'], true)) throw new InvalidArgumentException('Invalid payment status');
        if ($status === 'Succeeded' && (!$gatewayReference || trim($gatewayReference) === '')) {
            throw new InvalidArgumentException('Successful payment requires gateway reference');
        }
        $stmt = $this->pdo->prepare("UPDATE payments SET status = :status, gateway_reference = :ref WHERE id = :id AND status = 'Pending'");
        $stmt->execute(['status' => $status, 'ref' => $gatewayReference, 'id' => $paymentId]);
        return $stmt->rowCount() === 1;
    }
}
