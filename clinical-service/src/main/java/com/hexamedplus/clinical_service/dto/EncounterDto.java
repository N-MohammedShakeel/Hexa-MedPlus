package com.hexamedplus.clinical_service.dto;

import lombok.*;
import java.time.LocalDateTime;

public class EncounterDto {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        private String patientId;
        private LocalDateTime encounterDate;
        private String encounterType;
        private String chiefComplaint;
        private String bloodPressure;
        private Integer heartRate;
        private Double temperature;
        private Integer o2Sat;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private String id;
        private String patientId;
        private LocalDateTime encounterDate;
        private String encounterType;
        private String chiefComplaint;
        private String bloodPressure;
        private Integer heartRate;
        private Double temperature;
        private Integer o2Sat;
        private String status;
        private String aiSummary;
        private String aiCodes;
        private String codingDraft;      // JSON snapshot of code review progress
        private String revisionNote;     // Physician note when requesting revision
        private java.util.List<NoteDto.Response> notes;
        private java.util.List<LabDto> labs;
        private java.util.List<ImagingDto> imaging;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LabDto {
        private String id;
        private String testName;
        private String resultValue;
        private String unit;
        private String referenceRange;
        private LocalDateTime resultDate;
        private String status;
        private boolean isAbnormal;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ImagingDto {
        private String id;
        private String modality;
        private String bodyPart;
        private LocalDateTime imagingDate;
        private String reportText;
        private String status;
        private String dicomUrl;
    }
}