<?php
declare(strict_types=1);
namespace CourierFlow\Repositories;

use PDO;
use InvalidArgumentException;

final class UserRepository {
    public function __construct(private PDO $pdo) {}

    public function findById(int $id): ?array {
        $stmt = $this->pdo->prepare('SELECT id, name, username, email, phone, nif, role, approval_status, approved_by, last_lat, last_lng, created_at FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    // For authentication only; never expose the returned password_hash to an API response.
    public function findForAuthentication(string $email): ?array {
        $stmt = $this->pdo->prepare('SELECT id, name, username, email, password_hash, role, approval_status FROM users WHERE email = :email');
        $stmt->execute(['email' => trim(strtolower($email))]);
        return $stmt->fetch() ?: null;
    }

    public function create(array $data): int {
        foreach (['name', 'username', 'email', 'password_hash', 'role'] as $field) {
            if (!isset($data[$field]) || !is_string($data[$field]) || trim($data[$field]) === '') {
                throw new InvalidArgumentException("Missing or invalid user field: $field");
            }
        }
        if (!in_array($data['role'], ['client','courier','staff','admin'], true)) {
            throw new InvalidArgumentException('Unsupported role');
        }
        $stmt = $this->pdo->prepare('INSERT INTO users (name, username, email, password_hash, phone, nif, role, approval_status) VALUES (:name, :username, :email, :password_hash, :phone, :nif, :role, :approval_status)');
        $stmt->execute([
            'name' => trim($data['name']), 'username' => trim($data['username']),
            'email' => trim(strtolower($data['email'])), 'password_hash' => $data['password_hash'],
            'phone' => $data['phone'] ?? null, 'nif' => $data['nif'] ?? null,
            'role' => $data['role'], 'approval_status' => $data['approval_status'] ?? 'Pending',
        ]);
        return (int)$this->pdo->lastInsertId();
    }

    // Authorization (reviewer role, account ownership) belongs in the BLL.
    public function setApproval(int $userId, string $status, int $reviewerId): bool {
        if (!in_array($status, ['Approved', 'Rejected'], true)) {
            throw new InvalidArgumentException('Invalid approval status');
        }
        $stmt = $this->pdo->prepare('UPDATE users SET approval_status = :status, approved_by = :reviewer WHERE id = :id');
        $stmt->execute(['status' => $status, 'reviewer' => $reviewerId, 'id' => $userId]);
        return $stmt->rowCount() > 0;
    }
}
