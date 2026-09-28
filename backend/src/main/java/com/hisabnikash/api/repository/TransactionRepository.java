package com.hisabnikash.api.repository;

import com.hisabnikash.api.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserIdOrderByTransactionDateDesc(Long userId);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(t.convertedAmount), 0) FROM Transaction t WHERE t.category.id = :categoryId AND t.transactionType = :type AND t.transactionDate >= :startDate AND t.transactionDate <= :endDate")
    java.math.BigDecimal sumByCategoryAndTypeAndDateBetween(@org.springframework.data.repository.query.Param("categoryId") Long categoryId, @org.springframework.data.repository.query.Param("type") com.hisabnikash.api.entity.Transaction.TransactionType type, @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);

}
