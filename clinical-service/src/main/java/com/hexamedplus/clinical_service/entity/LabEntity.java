package com.hexamedplus.clinical_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "labs")
@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String testName;

    @Column(nullable = false)
    private String resultValue;

    private String unit;

    private String referenceRange;

    @Column(nullable = false)
    private LocalDateTime resultDate;

    private String status; // e.g. "FINAL", "PRELIMINARY"

    private boolean isAbnormal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "encounter_id", nullable = false)
    private EncounterEntity encounter;
}
