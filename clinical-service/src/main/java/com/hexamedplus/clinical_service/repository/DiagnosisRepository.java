package com.hexamedplus.clinical_service.repository;

import com.hexamedplus.clinical_service.entity.DiagnosisEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.UUID;

@Repository
public interface DiagnosisRepository extends JpaRepository<DiagnosisEntity, String> {
    List<DiagnosisEntity> findByEncounterId(UUID encounterId);
}
