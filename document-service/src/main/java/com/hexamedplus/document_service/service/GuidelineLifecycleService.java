package com.hexamedplus.document_service.service;

import com.hexamedplus.document_service.entity.DocumentEntity;
import com.hexamedplus.document_service.kafka.DocumentEventPublisher;
import com.hexamedplus.document_service.repository.DocumentRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Retires expired guideline documents so the AI never retrieves outdated
 * protocols. Runs daily; also exposed for manual/immediate retirement from
 * the "Supersede" upload flow in DocumentController.
 *
 * Also reconciles the supersede race condition: a superseding upload's
 * pgvector re-embedding happens asynchronously (via Kafka, in ai-service),
 * but the old version is retired as soon as the new file is stored/parsed —
 * not once it's actually confirmed embedded. If the embed step failed or
 * lagged, this job detects the gap and retries it.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GuidelineLifecycleService {

    private final DocumentRepository documentRepository;
    private final DocumentEventPublisher eventPublisher;
    private final StorageService storageService;
    private final PdfParserService pdfParserService;

    @Value("${ai-service.url:http://localhost:8083}")
    private String aiServiceUrl;

    private WebClient webClient;

    @PostConstruct
    void init() {
        webClient = WebClient.builder().baseUrl(aiServiceUrl).build();
    }

    @Scheduled(cron = "0 0 3 * * *")
    public int retireExpiredGuidelines() {
        var expired = documentRepository.findByDocumentTypeAndExpiryDateBeforeAndStatusNot(
                "GUIDELINE", LocalDate.now(), "RETIRED");

        if (expired.isEmpty()) return 0;

        log.info("Retiring {} expired guideline(s)", expired.size());
        for (DocumentEntity doc : expired) {
            retire(doc);
        }
        return expired.size();
    }

    public void retire(DocumentEntity doc) {
        doc.setStatus("RETIRED");
        doc.setRetiredAt(LocalDateTime.now());
        documentRepository.save(doc);
        eventPublisher.publishGuidelineRetiredEvent(doc.getFileKey());
        log.info("Retired guideline '{}' (fileKey={})", doc.getFileName(), doc.getFileKey());
    }

    @Scheduled(fixedRate = 600_000)
    public void reconcileSupersedingUploads() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(5);
        var candidates = documentRepository.findByParentDocumentIdIsNotNullAndStatusAndUploadedAtBefore(
                "COMPLETED", threshold);

        for (DocumentEntity doc : candidates) {
            checkAndRetryEmbedding(doc);
        }
    }

    private void checkAndRetryEmbedding(DocumentEntity doc) {
        Boolean hasEmbeddings;
        try {
            hasEmbeddings = webClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/api/ai/rag/has-embeddings")
                            .queryParam("fileKey", doc.getFileKey())
                            .build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .map(body -> Boolean.TRUE.equals(body.get("hasEmbeddings")))
                    // If ai-service is unreachable, assume embeddings are fine rather than retry-storming
                    .onErrorReturn(true)
                    .block(Duration.ofSeconds(5));
        } catch (Exception e) {
            log.error("Reconciliation check failed for fileKey={}: {}", doc.getFileKey(), e.getMessage());
            return;
        }

        if (Boolean.FALSE.equals(hasEmbeddings)) {
            log.warn("Guideline '{}' (fileKey={}) has no pgvector embeddings 5+ minutes after superseding upload — retrying ingestion",
                    doc.getFileName(), doc.getFileKey());
            retryIngestion(doc);
        }
    }

    private void retryIngestion(DocumentEntity doc) {
        Path tempFile = null;
        try (InputStream is = storageService.getFileStream(doc.getFileKey())) {
            tempFile = Files.createTempFile("reconcile-", "-" + doc.getFileName());
            Files.copy(is, tempFile, StandardCopyOption.REPLACE_EXISTING);

            PdfParserService.ParseResult parseResult = pdfParserService.extractText(tempFile.toFile());
            eventPublisher.publishDocumentParsedEvent(
                    doc.getFileKey(), parseResult.extractedText(), doc.getTargetMrn(), doc.getDocumentType());
            log.info("Re-published document.parsed for fileKey={} as a reconciliation retry", doc.getFileKey());
        } catch (Exception e) {
            log.error("Failed to retry ingestion for fileKey={}: {}", doc.getFileKey(), e.getMessage());
        } finally {
            if (tempFile != null) {
                try { Files.deleteIfExists(tempFile); } catch (Exception ignored) {}
            }
        }
    }
}
