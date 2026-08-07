package com.hexamedplus.clinical_service.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class PatientDto {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        private String mrn;
        private String firstName;
        private String lastName;
        private LocalDate dob;
        private String gender;
        private String department;
        private String primaryDiagnosis;
        private String status;
        private String room;
        private LocalDateTime admissionDate;
        private List<String> allergies;
        private List<String> activeMedications;
    }

    /** Partial update — only non-null fields are applied. Used by PatientController's PUT /{id}. */
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateRequest {
        private String department;
        private String primaryDiagnosis;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private String id;
        private String mrn;
        private String firstName;
        private String lastName;
        private LocalDate dob;
        private String gender;
        private String department;
        private String primaryDiagnosis;
        private String status;
        private String room;
        private LocalDateTime admissionDate;
        private List<String> allergies;
        private List<String> activeMedications;
        private boolean archived;
        private LocalDateTime archivedAt;
        private LocalDateTime unarchivedAt;
    }
}