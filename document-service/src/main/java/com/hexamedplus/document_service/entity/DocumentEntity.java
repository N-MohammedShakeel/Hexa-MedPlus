package com.hexamedplus.document_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_uploads")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DocumentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String fileName;
    private String fileKey; // MinIO object key
    private String documentType; // PDF, DOCX, DICOM, etc.
    private String category; // Protocol, Clinical Note, Lab Report, etc.
    private String status; // PROCESSING, COMPLETED, FAILED, REQUIRES_VERIFICATION
    private Long fileSize; 
    
    private String targetMrn; // Which patient this belongs to
    private String specialty;  // Medical specialty tag (e.g., Cardiology, Endocrinology)
    private String customDocName; // Doctor-typed display name, used for "Other Documents" uploads

    private LocalDateTime uploadedAt;

    // ── Guideline lifecycle (versioning / expiry / retirement) ──────────────
    @Builder.Default
    private Integer version = 1;
    private java.time.LocalDate expiryDate;
    private LocalDateTime retiredAt;
    private UUID parentDocumentId; // links a superseding version back to the one it replaces
}
