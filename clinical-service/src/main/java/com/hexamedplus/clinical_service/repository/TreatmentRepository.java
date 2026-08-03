package com.hexamedplus.clinical_service.repository;

import com.hexamedplus.clinical_service.entity.TreatmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.UUID;

@Repository
public interface TreatmentRepository extends JpaRepository<TreatmentEntity, String> {
    List<TreatmentEntity> findByEncounterId(UUID encounterId);
}
