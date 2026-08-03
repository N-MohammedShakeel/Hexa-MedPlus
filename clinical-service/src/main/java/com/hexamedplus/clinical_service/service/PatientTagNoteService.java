package com.hexamedplus.clinical_service.service;

import com.hexamedplus.clinical_service.dto.PatientNoteDto;
import com.hexamedplus.clinical_service.entity.PatientTagNoteEntity;
import com.hexamedplus.clinical_service.repository.PatientTagNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientTagNoteService {

    private final PatientTagNoteRepository repository;

    public List<PatientNoteDto.Response> getNotesByMrn(String mrn) {
        return repository.findByPatientMrnOrderByCreatedAtDesc(mrn)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PatientNoteDto.Response createNote(String mrn, PatientNoteDto.Request request) {
        PatientTagNoteEntity entity = PatientTagNoteEntity.builder()
                .patientMrn(mrn)
                .tag(request.getTag())
                .customTag(request.getCustomTag())
                .content(request.getContent())
                .status(request.getStatus() != null ? request.getStatus() : "Active")
                .comment(request.getComment())
                .build();
        return toResponse(repository.save(entity));
    }

    @Transactional
    public PatientNoteDto.Response updateNoteStatus(String mrn, String noteId, PatientNoteDto.StatusUpdate update) {
        PatientTagNoteEntity entity = repository.findById(UUID.fromString(noteId))
                .orElseThrow(() -> new RuntimeException("Note not found: " + noteId));
        if (update.getStatus() != null) {
            entity.setStatus(update.getStatus());
        }
        if (update.getComment() != null) {
            entity.setComment(update.getComment());
        }
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void deleteNote(String mrn, String noteId) {
        PatientTagNoteEntity entity = repository.findById(UUID.fromString(noteId))
                .orElseThrow(() -> new RuntimeException("Note not found: " + noteId));
        if (!entity.getPatientMrn().equals(mrn)) {
            throw new RuntimeException("Note does not belong to patient: " + mrn);
        }
        repository.deleteById(entity.getId());
    }

    private PatientNoteDto.Response toResponse(PatientTagNoteEntity e) {
        return PatientNoteDto.Response.builder()
                .id(e.getId().toString())
                .patientMrn(e.getPatientMrn())
                .tag(e.getTag())
                .customTag(e.getCustomTag())
                .content(e.getContent())
                .status(e.getStatus())
                .comment(e.getComment())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
