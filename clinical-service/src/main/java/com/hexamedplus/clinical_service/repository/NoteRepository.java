package com.hexamedplus.clinical_service.repository;

import com.hexamedplus.clinical_service.entity.NoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface NoteRepository extends JpaRepository<NoteEntity, UUID> {
    // Fetch notes for an encounter, oldest first (so UI reads chronologically)
    List<NoteEntity> findByEncounterIdOrderByCreatedAtAsc(UUID encounterId);
}