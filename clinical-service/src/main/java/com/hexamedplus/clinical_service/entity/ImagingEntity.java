package com.hexamedplus.clinical_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "imaging")
@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImagingEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String modality; // e.g. "X-RAY", "MRI", "CT"

    @Column(nullable = false)
    private String bodyPart; // e.g. "Chest", "Brain"

    @Column(nullable = false)
    private LocalDateTime imagingDate;

    @Column(columnDefinition = "TEXT")
    private String reportText; // Radiologist's interpretation

    private String status; // e.g. "FINAL", "PRELIMINARY"

    private String dicomUrl; // Link to actual images if available

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "encounter_id", nullable = false)
    private EncounterEntity encounter;
}
