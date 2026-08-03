package com.hexamedplus.clinical_service.dto;

import lombok.*;
import java.time.LocalDateTime;

public class PatientNoteDto {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        private String tag;         // PRESCRIPTION | CLINICAL_NOTE | HISTORY | CUSTOM
        private String customTag;   // for custom tags
        private String content;
        private String status;      // Active | Resolved | Under Observation | Past (Cured)
        private String comment;     // optional doctor comment
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class StatusUpdate {
        private String status;
        private String comment;     // doctor comment / observation on this note
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private String id;
        private String patientMrn;
        private String tag;
        private String customTag;
        private String content;
        private String status;
        private String comment;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
