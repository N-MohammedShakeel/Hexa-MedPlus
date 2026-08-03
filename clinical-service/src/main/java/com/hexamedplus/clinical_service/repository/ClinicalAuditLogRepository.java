package com.hexamedplus.clinical_service.repository;

import com.hexamedplus.clinical_service.entity.ClinicalAuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.UUID;

@Repository
public interface ClinicalAuditLogRepository extends JpaRepository<ClinicalAuditLogEntity, String> {
    List<ClinicalAuditLogEntity> findByEncounterId(String encounterId);
    List<ClinicalAuditLogEntity> findByUserId(String userId);
}
