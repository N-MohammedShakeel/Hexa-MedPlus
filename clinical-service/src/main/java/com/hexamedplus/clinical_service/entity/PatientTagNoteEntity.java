package com.hexamedplus.clinical_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "patient_tag_notes")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PatientTagNoteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** Patient MRN (links to patient without FK constraint for flexibility) */
    @Column(name = "patient_mrn", nullable = false, length = 30)
    private String patientMrn;

    /** Tag type: PRESCRIPTION | CLINICAL_NOTE | HISTORY | CUSTOM */
    @Column(name = "tag", nullable = false, length = 30)
    private String tag;

    /** Custom label when tag = CUSTOM */
    @Column(name = "custom_tag", length = 100)
    private String customTag;

    /** Note content / details */
    @Column(columnDefinition = "TEXT")
    private String content;

    /** Doctor comment / annotation on this note */
    @Column(columnDefinition = "TEXT")
    private String comment;

    /** Lifecycle status: Active | Current Medication | Missed Doses | Resolved | Past (Cured) | Under Observation */
    @Column(name = "status", length = 50)
    private String status;

    /**
     * fileKey of the source document (ai-service), when this note was generated from
     * a verified upload. Lets a re-verified/edited document update its existing note
     * instead of creating a duplicate — see PatientTagNoteService.createNote.
     */
    @Column(name = "document_file_key")
    private String documentFileKey;

    /**
     * The encounter that was IN_PROGRESS when this note was written. Nullable —
     * pre-existing notes and notes written with no active encounter stay unscoped
     * and are never subject to the sign-lock in PatientTagNoteService.
     */
    @Column(name = "encounter_id")
    private UUID encounterId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
