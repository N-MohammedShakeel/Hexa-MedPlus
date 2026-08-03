package com.hexamedplus.clinical_service.controller;

import com.hexamedplus.clinical_service.dto.EncounterDto;
import com.hexamedplus.clinical_service.entity.CodingActivityEntity;
import com.hexamedplus.clinical_service.repository.CodingActivityRepository;
import com.hexamedplus.clinical_service.service.EncounterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/encounters")
@RequiredArgsConstructor
public class EncounterController {

    private final EncounterService encounterService;
    private final CodingActivityRepository codingActivityRepository;

    // GET /api/encounters/patient/{patientId}
    @GetMapping("/patient/{patientId}")
    public Flux<EncounterDto.Response> getPatientEncounters(@PathVariable String patientId) {
        return encounterService.getEncountersByPatientId(patientId);
    }

    // GET /api/encounters
    @GetMapping
    public Flux<EncounterDto.Response> getAllEncounters() {
        return encounterService.getAllEncounters();
    }

    // GET /api/encounters/{id}
    @GetMapping("/{id}")
    public Mono<EncounterDto.Response> getEncounter(@PathVariable String id) {
        return encounterService.getEncounterById(id);
    }

    // POST /api/encounters
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<EncounterDto.Response> createEncounter(@RequestBody EncounterDto.Request request) {
        return encounterService.createEncounter(request);
    }

    // PUT /api/encounters/{id}/status
    @PutMapping("/{id}/status")
    public Mono<EncounterDto.Response> updateEncounterStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        // Auto-log status transitions as activity events
        Mono.fromRunnable(() -> {
            if ("CODING_PENDING".equals(newStatus)) {
                logActivity(id, "System", "SYSTEM", "ENCOUNTER_SIGNED", null,
                        "Encounter signed by physician — sent to coding queue");
            } else if ("CODING_COMPLETE".equals(newStatus)) {
                logActivity(id, "Medical Coder", "USER", "SUBMITTED_FOR_REVIEW", null,
                        "Codes submitted for physician review");
            } else if ("BILLING_READY".equals(newStatus)) {
                logActivity(id, "Physician", "USER", "APPROVED_FOR_BILLING", null,
                        "Codes approved — encounter ready for billing");
            }
        }).subscribeOn(Schedulers.boundedElastic()).subscribe();
        return encounterService.updateEncounterStatus(id, newStatus);
    }

    // PUT /api/encounters/{id}/ai-data
    @PutMapping("/{id}/ai-data")
    public Mono<EncounterDto.Response> updateEncounterAiData(@PathVariable String id, @RequestBody Map<String, String> body) {
        return encounterService.updateEncounterAiData(id, body.get("aiSummary"), body.get("aiCodes"));
    }

    // PUT /api/encounters/{id}/codes — Persist approved codes as JSON to aiCodes column
    @PutMapping("/{id}/codes")
    public Mono<EncounterDto.Response> updateEncounterCodes(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            String codesJson = new com.fasterxml.jackson.databind.ObjectMapper()
                    .writeValueAsString(body.get("codes"));
            return encounterService.updateEncounterAiData(id, null, codesJson);
        } catch (Exception e) {
            return Mono.error(e);
        }
    }

    // PUT /api/encounters/{id}/coding-draft — Save coding workbench draft state
    @PutMapping("/{id}/coding-draft")
    public Mono<EncounterDto.Response> saveCodingDraft(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            String draftJson = new com.fasterxml.jackson.databind.ObjectMapper()
                    .writeValueAsString(body.get("draft"));
            Mono.fromRunnable(() -> logActivity(id, "Medical Coder", "USER", "DRAFT_SAVED", null,
                    "Coding draft saved at " + LocalDateTime.now()))
                .subscribeOn(Schedulers.boundedElastic()).subscribe();
            return encounterService.saveCodingDraft(id, draftJson);
        } catch (Exception e) {
            return Mono.error(e);
        }
    }

    // PUT /api/encounters/{id}/vitals — Manual vitals entry
    @PutMapping("/{id}/vitals")
    public Mono<EncounterDto.Response> updateVitals(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return encounterService.updateVitals(id, body);
    }

    // PUT /api/encounters/{id}/request-revision — Physician requests code revision
    @PutMapping("/{id}/request-revision")
    public Mono<EncounterDto.Response> requestRevision(@PathVariable String id, @RequestBody Map<String, String> body) {
        String note = body.getOrDefault("revisionNote", "Please review the submitted codes.");
        Mono.fromRunnable(() -> logActivity(id, "Physician", "USER", "REVISION_REQUESTED", null, note))
            .subscribeOn(Schedulers.boundedElastic()).subscribe();
        return encounterService.requestRevision(id, note);
    }

    // PUT /api/encounters/{id}/approve-billing — Physician approves codes for billing
    @PutMapping("/{id}/approve-billing")
    public Mono<EncounterDto.Response> approveBilling(@PathVariable String id) {
        Mono.fromRunnable(() -> logActivity(id, "Physician", "USER", "APPROVED_FOR_BILLING", null,
                "Codes approved — ready for billing submission"))
            .subscribeOn(Schedulers.boundedElastic()).subscribe();
        return encounterService.updateEncounterStatus(id, "BILLING_READY");
    }

    // GET /api/encounters/{id}/coding-activity — Fetch coding audit log
    @GetMapping("/{id}/coding-activity")
    public Mono<List<CodingActivityEntity>> getCodingActivity(@PathVariable String id) {
        return Mono.fromCallable(() ->
            codingActivityRepository.findByEncounterIdOrderByTimestampDesc(id)
        ).subscribeOn(Schedulers.boundedElastic());
    }

    // POST /api/encounters/{id}/coding-activity — Log a coding action
    @PostMapping("/{id}/coding-activity")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<CodingActivityEntity> logCodingActivity(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return Mono.fromCallable(() -> {
            CodingActivityEntity event = CodingActivityEntity.builder()
                    .encounterId(id)
                    .actorName(String.valueOf(body.getOrDefault("actorName", "Medical Coder")))
                    .actorType(String.valueOf(body.getOrDefault("actorType", "USER")))
                    .action(String.valueOf(body.get("action")))
                    .codeRef(body.containsKey("codeRef") ? String.valueOf(body.get("codeRef")) : null)
                    .details(body.containsKey("details") ? String.valueOf(body.get("details")) : null)
                    .timestamp(LocalDateTime.now())
                    .build();
            return codingActivityRepository.save(event);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    // POST /api/encounters/validate-note — Drug interaction & guideline alerts
    @PostMapping("/validate-note")
    public Mono<Map<String, Object>> validateNote(@RequestBody Map<String, String> body) {
        String content = body.getOrDefault("content", "").toLowerCase();
        String alertMessage = "";

        if (content.contains("warfarin") && (content.contains("nsaid") || content.contains("ibuprofen") || content.contains("aspirin"))) {
            alertMessage = "⚠️ Drug Interaction Alert: Concurrent use of Warfarin with NSAIDs/Aspirin significantly increases bleeding risk. Consider GI-protective therapy and INR monitoring per ACC anticoagulation guidelines.";
        } else if (content.contains("warfarin") && content.contains("amoxicillin")) {
            alertMessage = "⚠️ Drug Interaction Alert: Amoxicillin may potentiate the anticoagulant effect of Warfarin. Monitor INR closely during antibiotic therapy.";
        } else if (content.contains("glp-1") && content.contains("metformin")) {
            alertMessage = "⚠️ Clinical Guideline Alert: ADA Standards of Care recommends verifying renal function (eGFR) prior to initiating GLP-1 agonists in patients already on Metformin.";
        } else if (content.contains("insulin") && content.contains("metformin")) {
            alertMessage = "ℹ️ Guideline Note: Combining insulin with Metformin is standard per ADA guidelines but requires monitoring for hypoglycemia. Ensure patient education on symptom recognition.";
        } else if ((content.contains("penicillin") || content.contains("amoxicillin")) && content.contains("allerg")) {
            alertMessage = "🚨 Critical Alert: Patient documentation mentions allergy — verify penicillin allergy status before prescribing amoxicillin or any beta-lactam antibiotic.";
        } else if ((content.contains("nsaid") || content.contains("ibuprofen")) &&
                   (content.contains("hypertension") || content.contains("heart failure") || content.contains("ckd") || content.contains("renal"))) {
            alertMessage = "⚠️ Clinical Alert: NSAIDs should be used with caution in patients with hypertension, heart failure, or CKD. Consider acetaminophen as an alternative per ACC/AHA guidelines.";
        }

        return Mono.just(Map.of("hasAlert", !alertMessage.isEmpty(), "alertMessage", alertMessage));
    }

    // --- Private helper ---
    private void logActivity(String encounterId, String actorName, String actorType,
                             String action, String codeRef, String details) {
        try {
            codingActivityRepository.save(CodingActivityEntity.builder()
                    .encounterId(encounterId)
                    .actorName(actorName)
                    .actorType(actorType)
                    .action(action)
                    .codeRef(codeRef)
                    .details(details)
                    .timestamp(LocalDateTime.now())
                    .build());
        } catch (Exception ex) {
            // Non-critical — don't fail the main operation
        }
    }
}