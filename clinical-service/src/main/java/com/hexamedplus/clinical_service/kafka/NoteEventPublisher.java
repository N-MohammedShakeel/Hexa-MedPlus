package com.hexamedplus.clinical_service.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class NoteEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private static final String TOPIC = "clinical.note.created";
    private static final String DELETED_TOPIC = "clinical.note.deleted";

    public void publishNoteCreatedEvent(String noteId, String encounterId, String content) {
        Map<String, String> event = Map.of(
                "noteId", noteId,
                "encounterId", encounterId,
                "triggeredBy", "clinical-service",
                "timestamp", java.time.Instant.now().toString()
                // Note: We don't put the full content in Kafka to save RAM,
                // AI Engine will fetch it from DB if needed
        );

        log.info("Publishing event to {}: {}", TOPIC, event);
        kafkaTemplate.send(TOPIC, noteId, event);
    }

    public void publishNoteDeletedEvent(String noteId) {
        Map<String, String> event = Map.of(
                "noteId", noteId,
                "triggeredBy", "clinical-service",
                "timestamp", java.time.Instant.now().toString()
        );

        log.info("Publishing event to {}: {}", DELETED_TOPIC, event);
        kafkaTemplate.send(DELETED_TOPIC, noteId, event);
    }
}