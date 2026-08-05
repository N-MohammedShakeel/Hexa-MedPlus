package com.hexamedplus.clinical_service.dto;

import lombok.*;
import java.time.LocalDateTime;

public class PatientNoteDto {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        private String tag;       // PRESCRIPTION | CLINICAL_NOTE | HISTORY | CUSTOM
        private String customTag; // label when tag = CUSTOM
        private String content;
        private String status;    // Active | Current Medication | Missed Doses | Resolved | Past (Cured) | Under Observation
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class StatusUpdate {
        private String status;
        private String comment;   // doctor annotation/comment on the note
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private String id;
        private String patientMrn;
        private String tag;
        private String customTag;
        private String content;
        private String comment;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
