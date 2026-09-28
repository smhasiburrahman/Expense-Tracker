package com.hisabnikash.api.repository;

import com.hisabnikash.api.entity.NotificationRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Repository
public interface NotificationReadRepository extends JpaRepository<NotificationRead, Long> {

    List<NotificationRead> findByUserId(Long userId);

    boolean existsByUserIdAndAlertId(Long userId, String alertId);

    @Query("SELECT r.alertId FROM NotificationRead r WHERE r.user.id = :userId")
    Set<String> findAlertIdsByUserId(@Param("userId") Long userId);

    @Transactional
    @Modifying
    @Query("DELETE FROM NotificationRead r WHERE r.user.id = :userId AND r.alertId = :alertId")
    void deleteByUserIdAndAlertId(@Param("userId") Long userId, @Param("alertId") String alertId);

    @Transactional
    @Modifying
    @Query("DELETE FROM NotificationRead r WHERE r.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
