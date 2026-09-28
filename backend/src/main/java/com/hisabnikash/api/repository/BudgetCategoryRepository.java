package com.hisabnikash.api.repository;

import com.hisabnikash.api.entity.BudgetCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BudgetCategoryRepository extends JpaRepository<BudgetCategory, Long> {
    List<BudgetCategory> findByUserId(Long userId);
    
    @org.springframework.data.jpa.repository.Query("SELECT c FROM BudgetCategory c WHERE c.user.id = :userId AND LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<BudgetCategory> searchCategories(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("keyword") String keyword);
}
