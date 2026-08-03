package com.hexamedplus.clinical_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Persists every action taken in the Coding Workbench for HIPAA audit compliance.
 * Tracks who did what to which code and when.
 */
@Entity
@Table(name = "coding_activity_log")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CodingActivityEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String encounterId;

    /** "AI Engine", "Medical Coder", "Dr. Smith", "System" */
    private String actorName;

    /** "AI", "USER", "SYSTEM" */
    private String actorType;

    /**
     * Action type — one of:
     * ENCOUNTER_OPENED, AI_CODES_GENERATED, CODE_APPROVED, CODE_REJECTED,
     * CODE_MODIFIED, CODE_ADDED, CODE_DELETED, DRAFT_SAVED, SUBMITTED_FOR_REVIEW,
     * REVISION_REQUESTED, APPROVED_FOR_BILLING
     */
    @Column(nullable = false)
    private String action;

    /** Code reference e.g. "E11.9" or null for system events */
    private String codeRef;

    /** Optional additional context e.g. modification details or revision note */
    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(nullable = false)
    private LocalDateTime timestamp;
}
