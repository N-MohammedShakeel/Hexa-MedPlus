package com.hexamedplus.clinical_service.repository;

import com.hexamedplus.clinical_service.entity.EncounterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface EncounterRepository extends JpaRepository<EncounterEntity, UUID> {
    // Custom query to get all encounters for a specific patient, ordered by newest first
    List<EncounterEntity> findByPatientIdOrderByEncounterDateDesc(UUID patientId);
    
    List<EncounterEntity> findAll();
    
    java.util.Optional<EncounterEntity> findById(UUID id);
    
    long countByStatus(String status);

    // Today's encounters — used by dashboard
    List<EncounterEntity> findByEncounterDateBetween(LocalDateTime start, LocalDateTime end);

    // Recent encounters for dashboard activity feed
    List<EncounterEntity> findTop10ByOrderByEncounterDateDesc();
}