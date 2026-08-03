package com.hexamedplus.clinical_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "clinical_audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicalAuditLogEntity {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    private String id;

    @Column(nullable = false)
    private String userId; // The doctor/actor who performed the action

    @Column(nullable = false)
    private String encounterId;

    @Column(nullable = false)
    private String action; // e.g. APPROVE_DIAGNOSIS, REJECT_TREATMENT, SUBMIT_FOR_REVIEW

    @Column(columnDefinition = "TEXT")
    private String details; // Detailed JSON or description of what was changed

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
