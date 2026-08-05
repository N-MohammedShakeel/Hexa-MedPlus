package com.hexamedplus.document_service.repository;

import com.hexamedplus.document_service.entity.DocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<DocumentEntity, UUID> {
    List<DocumentEntity> findByTargetMrnOrderByUploadedAtDesc(String targetMrn);
    List<DocumentEntity> findByDocumentTypeAndExpiryDateBeforeAndStatusNot(String documentType, LocalDate date, String status);
    List<DocumentEntity> findByParentDocumentIdIsNotNullAndStatusAndUploadedAtBefore(String status, LocalDateTime uploadedBefore);
    List<DocumentEntity> findByParentDocumentId(UUID parentDocumentId);
}
