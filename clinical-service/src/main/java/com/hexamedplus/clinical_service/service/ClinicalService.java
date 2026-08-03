package com.hexamedplus.clinical_service.service;

import com.hexamedplus.clinical_service.dto.PatientDto;
import com.hexamedplus.clinical_service.entity.PatientEntity;
import com.hexamedplus.clinical_service.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClinicalService {

    private final PatientRepository patientRepository;

    // Convert Entity to Response DTO (Manual mapper to avoid extra dependencies)
    private PatientDto.Response mapToResponse(PatientEntity entity) {
        List<String> allergies = entity.getAllergies() == null || entity.getAllergies().isEmpty()
                ? List.of() : Arrays.asList(entity.getAllergies().split("\\|"));

        List<String> meds = entity.getActiveMedications() == null || entity.getActiveMedications().isEmpty()
                ? List.of() : Arrays.asList(entity.getActiveMedications().split("\\|"));

        return PatientDto.Response.builder()
                .id(entity.getId().toString())
                .mrn(entity.getMrn())
                .firstName(entity.getFirstName())
                .lastName(entity.getLastName())
                .dob(entity.getDob())
                .gender(entity.getGender())
                .allergies(allergies)
                .activeMedications(meds)
                .archived(entity.isArchived())
                .archivedAt(entity.getArchivedAt())
                .build();
    }

    // Convert Request DTO to Entity
    private PatientEntity mapToEntity(PatientDto.Request request) {
        return PatientEntity.builder()
                .mrn(request.getMrn())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dob(request.getDob())
                .gender(request.getGender())
                .allergies(String.join("|", request.getAllergies()))
                .activeMedications(String.join("|", request.getActiveMedications()))
                .build();
    }

    // FLUX: Get All Patients, filtered by archived flag
    // Schedulers.boundedElastic() is CRITICAL here so JPA blocking doesn't freeze WebFlux
    public Flux<PatientDto.Response> getAllPatients(boolean archived) {
        return Flux.defer(() -> Flux.fromIterable(patientRepository.findByArchived(archived)))
                .subscribeOn(Schedulers.boundedElastic())
                .map(this::mapToResponse);
    }

    // MONO: Get Patient By ID
    public Mono<PatientDto.Response> getPatientById(String id) {
        return Mono.fromCallable(() -> patientRepository.findById(UUID.fromString(id)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> optional.map(Mono::just).orElse(Mono.empty()))
                .map(this::mapToResponse);
    }

    // MONO: Get Patient By MRN (used by the frontend to detect a returning/archived patient)
    public Mono<PatientDto.Response> getPatientByMrn(String mrn) {
        return Mono.fromCallable(() -> patientRepository.findByMrn(mrn))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> optional.map(Mono::just).orElse(Mono.empty()))
                .map(this::mapToResponse);
    }

    // MONO: Create Patient
    public Mono<PatientDto.Response> createPatient(PatientDto.Request request) {
        return Mono.fromCallable(() -> patientRepository.save(mapToEntity(request)))
                .subscribeOn(Schedulers.boundedElastic())
                .map(this::mapToResponse);
    }

    // MONO: Archive Patient — removes them from the active workspace without touching history
    public Mono<PatientDto.Response> archivePatient(String id) {
        return Mono.fromCallable(() -> {
                    PatientEntity entity = patientRepository.findById(UUID.fromString(id))
                            .orElseThrow(() -> new NoSuchElementException("Patient not found: " + id));
                    entity.setArchived(true);
                    entity.setArchivedAt(LocalDateTime.now());
                    return patientRepository.save(entity);
                })
                .subscribeOn(Schedulers.boundedElastic())
                .map(this::mapToResponse);
    }

    // MONO: Unarchive Patient — brings a returning patient back into the active workspace
    public Mono<PatientDto.Response> unarchivePatient(String id) {
        return Mono.fromCallable(() -> {
                    PatientEntity entity = patientRepository.findById(UUID.fromString(id))
                            .orElseThrow(() -> new NoSuchElementException("Patient not found: " + id));
                    entity.setArchived(false);
                    entity.setArchivedAt(null);
                    return patientRepository.save(entity);
                })
                .subscribeOn(Schedulers.boundedElastic())
                .map(this::mapToResponse);
    }
}