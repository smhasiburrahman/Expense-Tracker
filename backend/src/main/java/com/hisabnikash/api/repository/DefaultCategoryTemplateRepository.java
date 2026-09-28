package com.hisabnikash.api.repository;

import com.hisabnikash.api.entity.DefaultCategoryTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DefaultCategoryTemplateRepository extends JpaRepository<DefaultCategoryTemplate, Long> {
}
