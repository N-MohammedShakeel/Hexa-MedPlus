package com.hexamedplus.clinical_service.service;

import com.hexamedplus.clinical_service.dto.NoteDto;
import com.hexamedplus.clinical_service.entity.NoteEntity;
import com.hexamedplus.clinical_service.kafka.NoteEventPublisher;
import com.hexamedplus.clinical_service.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NoteService {

    private final NoteRepository noteRepository;
    private final NoteEventPublisher noteEventPublisher; // Injected for Event-Driven Arch!

    private NoteDto.Response mapToResponse(NoteEntity entity) {
        return NoteDto.Response.builder()
                .id(entity.getId().toString())
                .encounterId(entity.getEncounterId().toString())
                .noteType(entity.getNoteType())
                .content(entity.getContent())
                .author(entity.getAuthor())
                .createdAt(entity.getCreatedAt())
                .isPrescription(entity.getIsPrescription())
                .isClinicalNote(entity.getIsClinicalNote())
                .currentMedication(entity.getCurrentMedication())
                .history(entity.getHistory())
                .additionalReview(entity.getAdditionalReview())
                .build();
    }

    // Get all notes for an encounter
    public Flux<NoteDto.Response> getNotesByEncounterId(String encounterId) {
        return Flux.defer(() -> Flux.fromIterable(
                        noteRepository.findByEncounterIdOrderByCreatedAtAsc(UUID.fromString(encounterId))
                )).subscribeOn(Schedulers.boundedElastic())
                .map(this::mapToResponse);
    }

    // Create Note AND trigger Kafka event
    public Mono<NoteDto.Response> createNote(NoteDto.Request request) {
        return Mono.fromCallable(() -> {
                    // Set creation time before saving
                    NoteEntity entity = NoteEntity.builder()
                            .encounterId(UUID.fromString(request.getEncounterId()))
                            .noteType(request.getNoteType())
                            .content(request.getContent())
                            .author(request.getAuthor())
                            .createdAt(LocalDateTime.now())
                            .isPrescription(request.getIsPrescription())
                            .isClinicalNote(request.getIsClinicalNote())
                            .currentMedication(request.getCurrentMedication())
                            .history(request.getHistory())
                            .additionalReview(request.getAdditionalReview())
                            .build();
                    return noteRepository.save(entity);
                })
                .subscribeOn(Schedulers.boundedElastic())
                .map(this::mapToResponse)
                .doOnSuccess(response -> {
                    // ★ THE MAGIC MOMENT ★
                    // As soon as the note is saved to Postgres, fire an event to Kafka!
                    log.info("Note saved successfully. Publishing Kafka event for Note ID: {}", response.getId());
                    noteEventPublisher.publishNoteCreatedEvent(
                            response.getId(),
                            response.getEncounterId(),
                            response.getContent()
                    );
                });
    }

    // Update Note
    public Mono<NoteDto.Response> updateNote(String noteId, NoteDto.Request request) {
        return Mono.fromCallable(() -> {
            NoteEntity entity = noteRepository.findById(UUID.fromString(noteId))
                    .orElseThrow(() -> new RuntimeException("Note not found"));
            entity.setContent(request.getContent());
            entity.setIsPrescription(request.getIsPrescription());
            entity.setIsClinicalNote(request.getIsClinicalNote());
            entity.setCurrentMedication(request.getCurrentMedication());
            entity.setHistory(request.getHistory());
            entity.setAdditionalReview(request.getAdditionalReview());
            return noteRepository.save(entity);
        })
        .subscribeOn(Schedulers.boundedElastic())
        .map(this::mapToResponse)
        .doOnSuccess(response -> {
            log.info("Note updated successfully. Publishing Kafka event for Note ID: {}", response.getId());
            noteEventPublisher.publishNoteCreatedEvent(
                    response.getId(),
                    response.getEncounterId(),
                    response.getContent()
            );
        });
    }

    // Delete Note
    public Mono<Void> deleteNote(String noteId) {
        return Mono.fromRunnable(() -> {
            noteRepository.deleteById(UUID.fromString(noteId));
            log.info("Note deleted successfully. Note ID: {}", noteId);
        })
        .subscribeOn(Schedulers.boundedElastic())
        .then();
    }
}