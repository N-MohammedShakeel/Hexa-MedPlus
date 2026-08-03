package com.hexamedplus.clinical_service.service;

import com.hexamedplus.clinical_service.dto.EncounterDto;
import com.hexamedplus.clinical_service.entity.EncounterEntity;
import com.hexamedplus.clinical_service.repository.EncounterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EncounterService {

    private final EncounterRepository encounterRepository;

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
                        entity.setStatus(status);
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

    // Physician requests revision — sets status to CODING_REVISION and saves note
    public Mono<EncounterDto.Response> requestRevision(String id, String revisionNote) {
        return Mono.fromCallable(() -> encounterRepository.findById(UUID.fromString(id)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> {
                    if (optional.isPresent()) {
                        EncounterEntity entity = optional.get();
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