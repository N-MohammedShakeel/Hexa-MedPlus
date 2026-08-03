package com.hexamedplus.clinical_service.controller;

import com.hexamedplus.clinical_service.dto.NoteDto;
import com.hexamedplus.clinical_service.service.NoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    // GET /api/notes/encounter/{encounterId}
    @GetMapping("/encounter/{encounterId}")
    public Flux<NoteDto.Response> getEncounterNotes(@PathVariable String encounterId) {
        return noteService.getNotesByEncounterId(encounterId);
    }

    // POST /api/notes
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<NoteDto.Response> createNote(@RequestBody NoteDto.Request request) {
        return noteService.createNote(request);
    }

    // PUT /api/notes/{noteId}
    @PutMapping("/{noteId}")
    public Mono<NoteDto.Response> updateNote(@PathVariable String noteId, @RequestBody NoteDto.Request request) {
        return noteService.updateNote(noteId, request);
    }

    // DELETE /api/notes/{noteId}
    @DeleteMapping("/{noteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteNote(@PathVariable String noteId) {
        return noteService.deleteNote(noteId);
    }
}