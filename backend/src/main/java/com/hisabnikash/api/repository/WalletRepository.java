package com.hisabnikash.api.repository;

import com.hisabnikash.api.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, Long> {
    List<Wallet> findByUserId(Long userId);
    List<Wallet> findByUserIdAndIsArchivedFalse(Long userId);

    @org.springframework.data.jpa.repository.Query("SELECT w FROM Wallet w WHERE w.user.id = :userId AND LOWER(w.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Wallet> searchWallets(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("keyword") String keyword);
}
