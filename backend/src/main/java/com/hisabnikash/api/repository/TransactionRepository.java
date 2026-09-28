package com.hisabnikash.api.repository;

import com.hisabnikash.api.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserIdOrderByTransactionDateDesc(Long userId);
    List<Transaction> findByUserIdAndTransactionDateBetweenOrderByTransactionDateDesc(Long userId, java.time.LocalDate startDate, java.time.LocalDate endDate);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(t.convertedAmount), 0) FROM Transaction t WHERE t.category.id = :categoryId AND t.transactionType = :type AND t.transactionDate >= :startDate AND t.transactionDate <= :endDate")
    java.math.BigDecimal sumByCategoryAndTypeAndDateBetween(@org.springframework.data.repository.query.Param("categoryId") Long categoryId, @org.springframework.data.repository.query.Param("type") com.hisabnikash.api.entity.Transaction.TransactionType type, @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);

    @org.springframework.data.jpa.repository.Query("SELECT t FROM Transaction t " +
            "LEFT JOIN t.category c " +
            "LEFT JOIN t.wallet w " +
            "WHERE t.user.id = :userId AND (" +
            "LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(COALESCE(c.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(COALESCE(w.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(COALESCE(t.sourceNote, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
            ") ORDER BY t.transactionDate DESC")
    List<Transaction> searchTransactions(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("keyword") String keyword);
}
