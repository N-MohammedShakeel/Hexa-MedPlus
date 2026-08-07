package com.hexamedplus.clinical_service.service;

import com.hexamedplus.clinical_service.dto.PatientNoteDto;
import com.hexamedplus.clinical_service.entity.PatientTagNoteEntity;
import com.hexamedplus.clinical_service.repository.EncounterRepository;
import com.hexamedplus.clinical_service.repository.PatientTagNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientTagNoteService {

    private final PatientTagNoteRepository repository;
    private final EncounterRepository encounterRepository;

    /**
     * Once an encounter is signed, its notes become a permanent record — legally,
     * corrections happen via a new addendum note, never by editing the original in
     * place. Notes with no encounterId (pre-existing, or written with no active
     * encounter) are unscoped and never blocked by this.
     */
    private void assertNotSigned(UUID encounterId) {
        if (encounterId == null) return;
        encounterRepository.findById(encounterId).ifPresent(encounter -> {
            if (encounter.getSignedAt() != null) {
                throw new ResponseStatusException(HttpStatus.LOCKED,
                        "This note belongs to a signed encounter and cannot be modified — add an addendum instead.");
            }
        });
    }

    public List<PatientNoteDto.Response> getNotesByMrn(String mrn) {
        return repository.findByPatientMrnOrderByCreatedAtDesc(mrn)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PatientNoteDto.Response createNote(String mrn, PatientNoteDto.Request request) {
        // If this note is tied to a document (documentFileKey set), update the existing
        // note for that document instead of inserting a duplicate — a doctor re-verifying
        // an edited document should update the same note, not pile up copies.
        if (request.getDocumentFileKey() != null) {
            PatientTagNoteEntity existing = repository
                    .findByPatientMrnAndDocumentFileKey(mrn, request.getDocumentFileKey())
                    .orElse(null);
            if (existing != null) {
                assertNotSigned(existing.getEncounterId());
                existing.setTag(request.getTag());
                existing.setCustomTag(request.getCustomTag());
                existing.setContent(request.getContent());
                if (request.getStatus() != null) {
                    existing.setStatus(request.getStatus());
                }
                return toResponse(repository.save(existing));
            }
        }

        // A brand-new note is always allowed, signed encounter or not — this is
        // exactly how an addendum gets written after signing.
        PatientTagNoteEntity entity = PatientTagNoteEntity.builder()
                .patientMrn(mrn)
                .tag(request.getTag())
                .customTag(request.getCustomTag())
                .content(request.getContent())
                .status(request.getStatus() != null ? request.getStatus() : "Active")
                .documentFileKey(request.getDocumentFileKey())
                .encounterId(request.getEncounterId() != null ? UUID.fromString(request.getEncounterId()) : null)
                .build();
        return toResponse(repository.save(entity));
    }

    @Transactional
    public PatientNoteDto.Response updateNoteStatus(String mrn, String noteId, PatientNoteDto.StatusUpdate update) {
        PatientTagNoteEntity entity = repository.findById(UUID.fromString(noteId))
                .orElseThrow(() -> new RuntimeException("Note not found: " + noteId));
        assertNotSigned(entity.getEncounterId());
        if (update.getStatus() != null) {
            entity.setStatus(update.getStatus());
        }
        // Save doctor comment if provided
        if (update.getComment() != null) {
            entity.setComment(update.getComment());
        }
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void deleteNote(String mrn, String noteId) {
        PatientTagNoteEntity entity = repository.findById(UUID.fromString(noteId))
                .orElseThrow(() -> new RuntimeException("Note not found: " + noteId));
        // Security: verify it actually belongs to this MRN
        if (!entity.getPatientMrn().equals(mrn)) {
            throw new RuntimeException("Note does not belong to patient " + mrn);
        }
        assertNotSigned(entity.getEncounterId());
        repository.delete(entity);
    }

    private PatientNoteDto.Response toResponse(PatientTagNoteEntity e) {
        return PatientNoteDto.Response.builder()
                .id(e.getId().toString())
                .patientMrn(e.getPatientMrn())
                .tag(e.getTag())
                .customTag(e.getCustomTag())
                .content(e.getContent())
                .comment(e.getComment())
                .status(e.getStatus())
                .documentFileKey(e.getDocumentFileKey())
                .encounterId(e.getEncounterId() != null ? e.getEncounterId().toString() : null)
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
