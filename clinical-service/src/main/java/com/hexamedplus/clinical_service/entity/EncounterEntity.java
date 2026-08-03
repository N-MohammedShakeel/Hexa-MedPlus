package com.hexamedplus.clinical_service.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Set;
import java.util.LinkedHashSet;

@Entity
@Table(name = "encounters")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(exclude = {"notes", "diagnoses", "treatments", "labs", "imaging"})
public class EncounterEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @Column(name = "encounter_date", nullable = false)
    private LocalDateTime encounterDate;

    @Column(name = "encounter_type", length = 50)
    private String encounterType; // Outpatient, Inpatient, ED

    @Column(name = "chief_complaint", columnDefinition = "TEXT")
    private String chiefComplaint;

    // Vitals
    @Column(name = "blood_pressure", length = 20)
    private String bloodPressure;

    @Column(name = "heart_rate")
    private Integer heartRate;

    @Column(name = "temperature")
    private Double temperature;

    @Column(name = "o2_sat")
    private Integer o2Sat;

    @Column(name = "status", length = 50)
    @Builder.Default
    private String status = "IN_PROGRESS";

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary;

    @Column(name = "ai_codes", columnDefinition = "TEXT")
    private String aiCodes;

    /** Coding workbench draft — JSON snapshot of code states mid-review */
    @Column(name = "coding_draft", columnDefinition = "TEXT")
    private String codingDraft;

    /** Physician revision note explaining why codes were sent back */
    @Column(name = "revision_note", columnDefinition = "TEXT")
    private String revisionNote;

    /** Timestamp when physician signed the encounter */
    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    /** Timestamp when encounter was marked as billed */
    @Column(name = "billed_at")
    private LocalDateTime billedAt;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "encounter_id")
    @Builder.Default
    private Set<NoteEntity> notes = new LinkedHashSet<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "encounter_id")
    @Builder.Default
    private Set<DiagnosisEntity> diagnoses = new LinkedHashSet<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "encounter_id")
    @Builder.Default
    private Set<TreatmentEntity> treatments = new LinkedHashSet<>();
    
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "encounter_id")
    @Builder.Default
    private Set<LabEntity> labs = new LinkedHashSet<>();
    
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "encounter_id")
    @Builder.Default
    private Set<ImagingEntity> imaging = new LinkedHashSet<>();
}