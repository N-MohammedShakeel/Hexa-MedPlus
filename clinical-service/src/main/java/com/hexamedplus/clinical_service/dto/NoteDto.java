package com.hexamedplus.clinical_service.dto;

import lombok.*;
import java.time.LocalDateTime;

public class NoteDto {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        private String encounterId;
        private String noteType; // H&P, Progress, Discharge
        private String content;
        private String author;
        private Boolean isPrescription;
        private Boolean isClinicalNote;
        private String currentMedication;
        private String history;
        private String additionalReview;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private String id;
        private String encounterId;
        private String noteType;
        private String content;
        private String author;
        private LocalDateTime createdAt;
        private Boolean isPrescription;
        private Boolean isClinicalNote;
        private String currentMedication;
        private String history;
        private String additionalReview;
    }
}