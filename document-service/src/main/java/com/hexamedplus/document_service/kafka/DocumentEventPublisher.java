package com.hexamedplus.document_service.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${document-service.public-url:http://localhost:8082}")
    private String publicUrl;

    public void publishDocumentParsedEvent(String fileKey, String extractedText, String mrn, String documentType, String customDocName) {
        log.info("Publishing document.parsed event for MRN: {}", mrn);

        Map<String, String> payload = new HashMap<>();
        payload.put("fileKey", fileKey);
        payload.put("extractedText", extractedText);
        payload.put("mrn", mrn != null ? mrn : "UNKNOWN");
        payload.put("documentType", documentType != null ? documentType : "UNKNOWN");
        payload.put("fileUrl", publicUrl + "/api/documents/download?fileKey=" + fileKey);
        if (customDocName != null) {
            payload.put("customDocName", customDocName);
        }

        kafkaTemplate.send("document.parsed", payload);
    }

    public void publishGuidelineRetiredEvent(String fileKey) {
        log.info("Publishing guideline.retired event for fileKey: {}", fileKey);
        kafkaTemplate.send("guideline.retired", Map.of("fileKey", fileKey));
    }
}
