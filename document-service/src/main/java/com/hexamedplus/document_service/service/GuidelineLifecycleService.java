package com.hexamedplus.document_service.service;

import com.hexamedplus.document_service.entity.DocumentEntity;
import com.hexamedplus.document_service.kafka.DocumentEventPublisher;
import com.hexamedplus.document_service.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Retires expired guideline documents so the AI never retrieves outdated
 * protocols. Runs daily; also exposed for manual/immediate retirement from
 * the "Supersede" upload flow in DocumentController.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GuidelineLifecycleService {

    private final DocumentRepository documentRepository;
    private final DocumentEventPublisher eventPublisher;

    @Scheduled(cron = "0 0 3 * * *")
    public void retireExpiredGuidelines() {
        var expired = documentRepository.findByDocumentTypeAndExpiryDateBeforeAndStatusNot(
                "GUIDELINE", LocalDate.now(), "RETIRED");

        if (expired.isEmpty()) return;

        log.info("Retiring {} expired guideline(s)", expired.size());
        for (DocumentEntity doc : expired) {
            retire(doc);
        }
    }

    public void retire(DocumentEntity doc) {
        doc.setStatus("RETIRED");
        doc.setRetiredAt(LocalDateTime.now());
        documentRepository.save(doc);
        eventPublisher.publishGuidelineRetiredEvent(doc.getFileKey());
        log.info("Retired guideline '{}' (fileKey={})", doc.getFileName(), doc.getFileKey());
    }
}
