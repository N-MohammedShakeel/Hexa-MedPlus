package com.hexamedplus.clinical_service.service;

import com.hexamedplus.clinical_service.dto.EncounterDto;
import com.hexamedplus.clinical_service.entity.EncounterEntity;
import com.hexamedplus.clinical_service.repository.EncounterRepository;
import com.hexamedplus.clinical_service.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EncounterService {

    private final EncounterRepository encounterRepository;
    private final PatientRepository patientRepository;

    // Legal encounter status graph. Nothing in this codebase previously validated
    // that a status change made sense given the encounter's *current* status —
    // any string could be written from any state via the generic /status endpoint
    // (e.g. a freshly created encounter could jump straight to BILLED, archiving
    // the patient, with one call). Every status-changing method below now checks
    // against this map before writing.
    private static final Map<String, Set<String>> LEGAL_TRANSITIONS = Map.of(
            "IN_PROGRESS", Set.of("CODING_PENDING"),
            "CODING_PENDING", Set.of("CODING_COMPLETE"),
            "CODING_COMPLETE", Set.of("CODING_REVISION", "BILLING_READY"),
            "CODING_REVISION", Set.of("CODING_COMPLETE"),
            "BILLING_READY", Set.of("BILLED"),
            "BILLED", Set.of()
    );

    private void assertLegalTransition(String from, String to) {
        if (from != null && from.equals(to)) {
            return; // idempotent no-op re-write of the same status — harmless, allow
        }
        if (!LEGAL_TRANSITIONS.getOrDefault(from, Set.of()).contains(to)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Illegal encounter status transition: " + from + " -> " + to);
        }
    }

    private EncounterDto.Response mapToResponse(EncounterEntity entity) {
        return EncounterDto.Response.builder()
                .id(entity.getId().toString())
                .patientId(entity.getPatientId().toString())
                .encounterDate(entity.getEncounterDate())
                .encounterType(entity.getEncounterType())
                .chiefComplaint(entity.getChiefComplaint())
                .bloodPressure(entity.getBloodPressure())
                .heartRate(entity.getHeartRate())
                .temperature(entity.getTemperature())
                .o2Sat(entity.getO2Sat())
                .status(entity.getStatus())
                .aiSummary(entity.getAiSummary())
                .aiCodes(entity.getAiCodes())
                .codingDraft(entity.getCodingDraft())
                .revisionNote(entity.getRevisionNote())
                .signedAt(entity.getSignedAt())
                .signedBy(entity.getSignedBy())
                .notes(entity.getNotes() != null ? entity.getNotes().stream().map(n ->
                    com.hexamedplus.clinical_service.dto.NoteDto.Response.builder()
                        .id(n.getId().toString())
                        .encounterId(n.getEncounterId().toString())
                        .noteType(n.getNoteType())
                        .author(n.getAuthor())
                        .content(n.getContent())
                        .createdAt(n.getCreatedAt())
                        .build()
                ).toList() : new java.util.ArrayList<com.hexamedplus.clinical_service.dto.NoteDto.Response>())
                .labs(entity.getLabs() != null ? entity.getLabs().stream().map(l -> 
                    EncounterDto.LabDto.builder()
                        .id(l.getId())
                        .testName(l.getTestName())
                        .resultValue(l.getResultValue())
                        .unit(l.getUnit())
                        .referenceRange(l.getReferenceRange())
                        .resultDate(l.getResultDate())
                        .status(l.getStatus())
                        .isAbnormal(l.isAbnormal())
                        .build()
                ).toList() : new java.util.ArrayList<EncounterDto.LabDto>())
                .imaging(entity.getImaging() != null ? entity.getImaging().stream().map(i -> 
                    EncounterDto.ImagingDto.builder()
                        .id(i.getId())
                        .modality(i.getModality())
                        .bodyPart(i.getBodyPart())
                        .imagingDate(i.getImagingDate())
                        .reportText(i.getReportText())
                        .status(i.getStatus())
                        .dicomUrl(i.getDicomUrl())
                        .build()
                ).toList() : new java.util.ArrayList<EncounterDto.ImagingDto>())
                .build();
    }

    private EncounterEntity mapToEntity(EncounterDto.Request request) {
        return EncounterEntity.builder()
                .patientId(UUID.fromString(request.getPatientId()))
                .encounterDate(request.getEncounterDate())
                .encounterType(request.getEncounterType())
                .chiefComplaint(request.getChiefComplaint())
                .build();
    }

    // Get all encounters for a specific patient
    public Flux<EncounterDto.Response> getEncountersByPatientId(String patientId) {
        return Flux.defer(() -> Flux.fromIterable(
                        encounterRepository.findByPatientIdOrderByEncounterDateDesc(UUID.fromString(patientId))
                )).subscribeOn(Schedulers.boundedElastic())
                .map(this::mapToResponse);
    }

    // Get all encounters across all patients
    public Flux<EncounterDto.Response> getAllEncounters() {
        return Flux.defer(() -> Flux.fromIterable(encounterRepository.findAll()))
                .subscribeOn(Schedulers.boundedElastic())
                .map(this::mapToResponse);
    }

    // Get single encounter details
    public Mono<EncounterDto.Response> getEncounterById(String id) {
        return Mono.fromCallable(() -> encounterRepository.findById(UUID.fromString(id)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> optional.map(Mono::just).orElse(Mono.empty()))
                .map(this::mapToResponse);
    }

    // Create new encounter
    public Mono<EncounterDto.Response> createEncounter(EncounterDto.Request request) {
        return Mono.fromCallable(() -> encounterRepository.save(mapToEntity(request)))
                .subscribeOn(Schedulers.boundedElastic())
                .map(this::mapToResponse);
    }

    // Update encounter status
    public Mono<EncounterDto.Response> updateEncounterStatus(String id, String status) {
        return Mono.fromCallable(() -> encounterRepository.findById(UUID.fromString(id)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> {
                    if (optional.isPresent()) {
                        EncounterEntity entity = optional.get();
                        assertLegalTransition(entity.getStatus(), status);
                        entity.setStatus(status);

                        // A resubmission always closes out the current revision cycle —
                        // clear the note so it doesn't linger stale for the next one.
                        if ("CODING_COMPLETE".equals(status)) {
                            entity.setRevisionNote(null);
                        }

                        if ("BILLED".equals(status)) {
                            entity.setBilledAt(java.time.LocalDateTime.now());
                            patientRepository.findById(entity.getPatientId()).ifPresent(p -> {
                                p.setArchived(true);
                                p.setArchivedAt(java.time.LocalDateTime.now());
                                patientRepository.save(p);
                            });
                        }
                        
                        return Mono.fromCallable(() -> encounterRepository.save(entity))
                                .subscribeOn(Schedulers.boundedElastic());
                    }
                    return Mono.empty();
                })
                .map(this::mapToResponse);
    }

    // Update AI Data (Summary and Codes)
    public Mono<EncounterDto.Response> updateEncounterAiData(String id, String aiSummary, String aiCodes) {
        return Mono.fromCallable(() -> encounterRepository.findById(UUID.fromString(id)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> {
                    if (optional.isPresent()) {
                        EncounterEntity entity = optional.get();
                        if (aiSummary != null) entity.setAiSummary(aiSummary);
                        if (aiCodes != null) entity.setAiCodes(aiCodes);
                        return Mono.fromCallable(() -> encounterRepository.save(entity))
                                .subscribeOn(Schedulers.boundedElastic());
                    }
                    return Mono.empty();
                })
                .map(this::mapToResponse);
    }

    // Save coding workbench draft
    public Mono<EncounterDto.Response> saveCodingDraft(String id, String draftJson) {
        return Mono.fromCallable(() -> encounterRepository.findById(UUID.fromString(id)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> {
                    if (optional.isPresent()) {
                        EncounterEntity entity = optional.get();
                        entity.setCodingDraft(draftJson);
                        return Mono.fromCallable(() -> encounterRepository.save(entity))
                                .subscribeOn(Schedulers.boundedElastic());
                    }
                    return Mono.empty();
                })
                .map(this::mapToResponse);
    }

    // Update vitals from manual entry
    public Mono<EncounterDto.Response> updateVitals(String id, java.util.Map<String, Object> vitals) {
        return Mono.fromCallable(() -> encounterRepository.findById(UUID.fromString(id)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> {
                    if (optional.isPresent()) {
                        EncounterEntity entity = optional.get();
                        if (vitals.containsKey("bloodPressure"))
                            entity.setBloodPressure(String.valueOf(vitals.get("bloodPressure")));
                        if (vitals.containsKey("heartRate"))
                            entity.setHeartRate(Integer.parseInt(String.valueOf(vitals.get("heartRate"))));
                        if (vitals.containsKey("temperature"))
                            entity.setTemperature(Double.parseDouble(String.valueOf(vitals.get("temperature"))));
                        if (vitals.containsKey("o2Sat"))
                            entity.setO2Sat(Integer.parseInt(String.valueOf(vitals.get("o2Sat"))));
                        return Mono.fromCallable(() -> encounterRepository.save(entity))
                                .subscribeOn(Schedulers.boundedElastic());
                    }
                    return Mono.empty();
                })
                .map(this::mapToResponse);
    }

    // Physician signs & locks the encounter — this is the real, server-enforced lock;
    // the notes API (PatientTagNoteService.assertNotSigned) refuses further edits to
    // any note whose encounterId points at a row with signedAt set. Auto-routes to
    // the coding queue in the same step, matching how signing works today (just for
    // real this time).
    public Mono<EncounterDto.Response> signEncounter(String id, String signedBy) {
        return Mono.fromCallable(() -> encounterRepository.findById(UUID.fromString(id)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> {
                    if (optional.isPresent()) {
                        EncounterEntity entity = optional.get();
                        assertLegalTransition(entity.getStatus(), "CODING_PENDING");
                        entity.setSignedAt(java.time.LocalDateTime.now());
                        entity.setSignedBy(signedBy);
                        entity.setStatus("CODING_PENDING");
                        return Mono.fromCallable(() -> encounterRepository.save(entity))
                                .subscribeOn(Schedulers.boundedElastic());
                    }
                    return Mono.empty();
                })
                .map(this::mapToResponse);
    }

    // Physician requests revision — sets status to CODING_REVISION and saves note
    public Mono<EncounterDto.Response> requestRevision(String id, String revisionNote) {
        return Mono.fromCallable(() -> encounterRepository.findById(UUID.fromString(id)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> {
                    if (optional.isPresent()) {
                        EncounterEntity entity = optional.get();
                        assertLegalTransition(entity.getStatus(), "CODING_REVISION");
                        entity.setStatus("CODING_REVISION");
                        entity.setRevisionNote(revisionNote);
                        return Mono.fromCallable(() -> encounterRepository.save(entity))
                                .subscribeOn(Schedulers.boundedElastic());
                    }
                    return Mono.empty();
                })
                .map(this::mapToResponse);
    }
}