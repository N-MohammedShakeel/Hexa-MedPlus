package com.hexamedplus.clinical_service.controller;

import com.hexamedplus.clinical_service.dto.PatientNoteDto;
import com.hexamedplus.clinical_service.service.PatientTagNoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST API for per-patient clinical notes with tags:
 *   GET    /api/clinical/patients/{mrn}/notes          → list all notes for a patient
 *   POST   /api/clinical/patients/{mrn}/notes          → create a new tagged note
 *   PUT    /api/clinical/patients/{mrn}/notes/{noteId} → update note status / comment
 *   DELETE /api/clinical/patients/{mrn}/notes/{noteId} → delete a note
 */
@RestController
@RequestMapping("/api/clinical/patients")
@RequiredArgsConstructor
public class PatientTagNoteController {

    private final PatientTagNoteService service;

    @GetMapping("/{mrn}/notes")
    public ResponseEntity<List<PatientNoteDto.Response>> getNotes(@PathVariable String mrn) {
        return ResponseEntity.ok(service.getNotesByMrn(mrn));
    }

    @PostMapping("/{mrn}/notes")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<PatientNoteDto.Response> createNote(
            @PathVariable String mrn,
            @RequestBody PatientNoteDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createNote(mrn, request));
    }

    @PutMapping("/{mrn}/notes/{noteId}")
    public ResponseEntity<PatientNoteDto.Response> updateNote(
            @PathVariable String mrn,
            @PathVariable String noteId,
            @RequestBody PatientNoteDto.StatusUpdate update) {
        return ResponseEntity.ok(service.updateNoteStatus(mrn, noteId, update));
    }

    @DeleteMapping("/{mrn}/notes/{noteId}")
    public ResponseEntity<Void> deleteNote(
            @PathVariable String mrn,
            @PathVariable String noteId) {
        service.deleteNote(mrn, noteId);
        return ResponseEntity.noContent().build();
    }
}
