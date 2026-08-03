package com.hexamedplus.clinical_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "clinical_notes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NoteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "encounter_id", nullable = false)
    private UUID encounterId;

    @Column(name = "note_type", nullable = false, length = 50)
    private String noteType; // H&P, Progress, Discharge

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private String author;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "is_prescription")
    private Boolean isPrescription;

    @Column(name = "is_clinical_note")
    private Boolean isClinicalNote;

    @Column(name = "current_medication", columnDefinition = "TEXT")
    private String currentMedication;

    @Column(columnDefinition = "TEXT")
    private String history;

    @Column(name = "additional_review", columnDefinition = "TEXT")
    private String additionalReview;
}