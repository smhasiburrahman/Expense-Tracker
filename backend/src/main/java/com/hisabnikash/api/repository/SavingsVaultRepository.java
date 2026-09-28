package com.hisabnikash.api.repository;

import com.hisabnikash.api.entity.SavingsVault;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavingsVaultRepository extends JpaRepository<SavingsVault, Long> {
    List<SavingsVault> findByUserIdAndDeletedAtIsNull(Long userId);
}
