package com.hexamedplus.clinical_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "patients")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PatientEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(unique = true, nullable = false, length = 20)
    private String mrn; // Medical Record Number

    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(nullable = false, length = 100)
    private String lastName;

    @Column(name = "date_of_birth")
    private LocalDate dob;

    @Column(length = 10)
    private String gender;
    
    @Column(length = 100)
    private String department;
    
    @Column(length = 50)
    private String status;
    
    @Column(length = 20)
    private String room;
    
    @Column(name = "admission_date")
    private LocalDateTime admissionDate;

    // JPA doesn't have a native JSON type for Postgres without specific hibernate types,
    // but for simple arrays, we can use a simple string delimiter or @JdbcTypeCode if using Hibernate 6.1+
    // For simplicity in a hackathon, we store as a comma-separated string and parse in DTO.
    @Column(name = "allergies", columnDefinition = "TEXT")
    private String allergies;

    @Column(name = "active_medications", columnDefinition = "TEXT")
    private String activeMedications;

    @Column(name = "is_archived", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean archived = false;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;
}