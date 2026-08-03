package com.hexamedplus.clinical_service.repository;

import com.hexamedplus.clinical_service.entity.CodingActivityEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CodingActivityRepository extends JpaRepository<CodingActivityEntity, UUID> {
    List<CodingActivityEntity> findByEncounterIdOrderByTimestampDesc(String encounterId);
}
