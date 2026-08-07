package com.hexamedplus.clinical_service.controller;

import com.hexamedplus.clinical_service.dto.PatientDto;
import com.hexamedplus.clinical_service.service.ClinicalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final ClinicalService clinicalService;

    @GetMapping
    public Flux<PatientDto.Response> getPatients(@RequestParam(defaultValue = "false") boolean archived) {
        return clinicalService.getAllPatients(archived);
    }

    @GetMapping("/{id}")
    public Mono<PatientDto.Response> getPatient(@PathVariable String id) {
        return clinicalService.getPatientById(id);
    }

    @GetMapping("/mrn/{mrn}")
    public Mono<PatientDto.Response> getPatientByMrn(@PathVariable String mrn) {
        return clinicalService.getPatientByMrn(mrn);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<PatientDto.Response> createPatient(@RequestBody PatientDto.Request request) {
        return clinicalService.createPatient(request);
    }

    @PutMapping("/{id}")
    public Mono<PatientDto.Response> updatePatient(@PathVariable String id, @RequestBody PatientDto.UpdateRequest request) {
        return clinicalService.updatePatient(id, request);
    }

    @PutMapping("/{id}/archive")
    public Mono<PatientDto.Response> archivePatient(@PathVariable String id) {
        return clinicalService.archivePatient(id);
    }

    @PutMapping("/{id}/unarchive")
    public Mono<PatientDto.Response> unarchivePatient(@PathVariable String id) {
        return clinicalService.unarchivePatient(id);
    }
}