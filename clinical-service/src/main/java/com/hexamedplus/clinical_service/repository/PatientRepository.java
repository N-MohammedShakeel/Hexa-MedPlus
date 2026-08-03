package com.hexamedplus.clinical_service.repository;


import com.hexamedplus.clinical_service.entity.PatientEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientRepository extends JpaRepository<PatientEntity, UUID> {
    List<PatientEntity> findByArchived(boolean archived);
    Optional<PatientEntity> findByMrn(String mrn);
}