package com.hexamedplus.document_service.controller;


import com.hexamedplus.document_service.kafka.DocumentEventPublisher;
import com.hexamedplus.document_service.service.PdfParserService;
import com.hexamedplus.document_service.service.StorageService;
import com.hexamedplus.document_service.service.DocumentProgressService;
import com.hexamedplus.document_service.service.GuidelineLifecycleService;
import com.hexamedplus.document_service.entity.DocumentEntity;
import com.hexamedplus.document_service.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.http.codec.multipart.FormFieldPart;
import org.springframework.http.codec.multipart.Part;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final StorageService storageService;
    private final PdfParserService pdfParserService;
    private final DocumentEventPublisher eventPublisher;
    private final DocumentRepository documentRepository;
    private final DocumentProgressService progressService;
    private final GuidelineLifecycleService lifecycleService;

    @GetMapping(value = "/progress/{jobId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<org.springframework.http.codec.ServerSentEvent<String>> streamProgress(@PathVariable String jobId) {
        return progressService.getProgressStream(jobId)
                .map(msg -> org.springframework.http.codec.ServerSentEvent.<String>builder()
                        .data(msg)
                        .build());
    }

    @GetMapping("/download")
    public Mono<ResponseEntity<InputStreamResource>> downloadFile(@RequestParam String fileKey, @RequestParam(required = false, defaultValue = "false") boolean inline) {
        return Mono.fromCallable(() -> {
            java.io.InputStream is = storageService.getFileStream(fileKey);
            String disposition = inline ? "inline" : "attachment";
            MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
            String lower = fileKey.toLowerCase();
            if (lower.endsWith(".pdf")) mediaType = MediaType.APPLICATION_PDF;
            else if (lower.endsWith(".png")) mediaType = MediaType.IMAGE_PNG;
            else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mediaType = MediaType.IMAGE_JPEG;

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + fileKey + "\"")
                    .contentType(mediaType)
                    .body(new InputStreamResource(is));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @GetMapping
    public Mono<ResponseEntity<java.util.List<DocumentEntity>>> getAllDocuments(@RequestParam(required = false) String category) {
        return Mono.fromCallable(() -> {
            if (category != null && !category.isEmpty()) {
                return documentRepository.findAll().stream()
                        .filter(d -> category.equals(d.getCategory()))
                        .toList();
            }
            return documentRepository.findAll();
        })
        .subscribeOn(Schedulers.boundedElastic())
        .map(ResponseEntity::ok);
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Void>> deleteDocument(@PathVariable String id) {
        return Mono.fromRunnable(() -> {
            documentRepository.findById(java.util.UUID.fromString(id)).ifPresent(doc -> {
                try {
                    storageService.deleteFile(doc.getFileKey());
                } catch (Exception e) {
                    log.error("Failed to delete file from MinIO: {}", doc.getFileKey(), e);
                }
                documentRepository.deleteById(doc.getId());
                // Purge any pgvector chunks embedded for this document — otherwise the AI
                // keeps retrieving content for a document that no longer exists.
                eventPublisher.publishGuidelineRetiredEvent(doc.getFileKey());
            });
        })
        .subscribeOn(Schedulers.boundedElastic())
        .then(Mono.just(ResponseEntity.noContent().<Void>build()));
    }

    @org.springframework.web.bind.annotation.PutMapping("/{id}/status")
    public Mono<ResponseEntity<Void>> updateDocumentStatus(@PathVariable String id, @RequestParam String status) {
        return Mono.fromRunnable(() -> {
            documentRepository.findById(java.util.UUID.fromString(id)).ifPresent(doc -> {
                doc.setStatus(status);
                documentRepository.save(doc);
            });
        })
        .subscribeOn(Schedulers.boundedElastic())
        .then(Mono.just(ResponseEntity.ok().<Void>build()));
    }

    @DeleteMapping("/by-file-key/{fileKey}")
    public Mono<ResponseEntity<Void>> deleteDocumentByFileKey(@PathVariable String fileKey) {
        return Mono.fromRunnable(() -> {
            documentRepository.findAll().stream()
                .filter(d -> fileKey.equals(d.getFileKey()))
                .findFirst()
                .ifPresent(doc -> {
                    try { storageService.deleteFile(doc.getFileKey()); } catch (Exception e) {
                        log.warn("Could not delete file from storage for key {}: {}", fileKey, e.getMessage());
                    }
                    documentRepository.deleteById(doc.getId());
                    eventPublisher.publishGuidelineRetiredEvent(doc.getFileKey());
                    log.info("Cascaded delete for document with fileKey: {}", fileKey);
                });
        })
        .subscribeOn(Schedulers.boundedElastic())
        .then(Mono.just(ResponseEntity.noContent().<Void>build()));
    }

    @org.springframework.web.bind.annotation.PutMapping("/by-file-key/{fileKey}/status")
    public Mono<ResponseEntity<Void>> updateDocumentStatusByFileKey(@PathVariable String fileKey, @RequestParam String status) {
        return Mono.fromRunnable(() -> {
            documentRepository.findAll().stream()
                .filter(d -> fileKey.equals(d.getFileKey()))
                .findFirst()
                .ifPresent(doc -> {
                    doc.setStatus(status);
                    documentRepository.save(doc);
                    log.info("Updated status to '{}' for document with fileKey: {}", status, fileKey);
                });
        })
        .subscribeOn(Schedulers.boundedElastic())
        .then(Mono.just(ResponseEntity.ok().<Void>build()));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Map<String, String>> uploadAndParse(
            @RequestPart("file") FilePart filePart,
            @RequestPart(value = "mrn", required = false) String mrn,
            @RequestPart(value = "documentType", required = false) String documentType,
            @RequestPart(value = "specialty", required = false) String specialty,
            @RequestPart(value = "expiryDate", required = false) String expiryDate,
            @RequestParam(value = "jobId", required = false) String jobId) {
        return processUpload(filePart, mrn, documentType, specialty, parseExpiry(expiryDate), 1, null, jobId);
    }

    /**
     * Uploads a new version of an existing GUIDELINE document, retiring the old one
     * (status=RETIRED + a "guideline.retired" Kafka event so ai-service drops its
     * pgvector embeddings) once the new version's upload pipeline succeeds.
     */
    @PostMapping(value = "/{id}/supersede", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Map<String, String>> supersedeDocument(
            @PathVariable String id,
            @RequestPart("file") FilePart filePart,
            @RequestPart(value = "expiryDate", required = false) String expiryDate,
            @RequestParam(value = "jobId", required = false) String jobId) {

        return Mono.fromCallable(() -> documentRepository.findById(java.util.UUID.fromString(id))
                        .orElseThrow(() -> new java.util.NoSuchElementException("Document not found: " + id)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(oldDoc -> processUpload(
                        filePart, "HOSPITAL_WIDE", "GUIDELINE", oldDoc.getSpecialty(),
                        parseExpiry(expiryDate), (oldDoc.getVersion() != null ? oldDoc.getVersion() : 1) + 1, oldDoc.getId(), jobId
                ).doOnSuccess(result -> lifecycleService.retire(oldDoc)));
    }

    @GetMapping("/{id}/versions")
    public Mono<ResponseEntity<java.util.List<DocumentEntity>>> getVersionHistory(@PathVariable String id) {
        return Mono.fromCallable(() -> {
                    DocumentEntity current = documentRepository.findById(java.util.UUID.fromString(id))
                            .orElseThrow(() -> new java.util.NoSuchElementException("Document not found: " + id));

                    java.util.List<DocumentEntity> chain = new java.util.ArrayList<>();

                    // Walk ancestors (oldest first)
                    DocumentEntity cursor = current;
                    while (cursor.getParentDocumentId() != null) {
                        cursor = documentRepository.findById(cursor.getParentDocumentId()).orElse(null);
                        if (cursor == null) break;
                        chain.add(0, cursor);
                    }

                    chain.add(current);

                    // Walk descendants (newest last)
                    DocumentEntity tail = current;
                    var children = documentRepository.findByParentDocumentId(tail.getId());
                    while (!children.isEmpty()) {
                        DocumentEntity child = children.get(0);
                        chain.add(child);
                        tail = child;
                        children = documentRepository.findByParentDocumentId(tail.getId());
                    }

                    return chain;
                })
                .subscribeOn(Schedulers.boundedElastic())
                .map(ResponseEntity::ok);
    }

    @PostMapping("/admin/retire-expired")
    public Mono<ResponseEntity<Map<String, Object>>> triggerExpirySweep() {
        return Mono.fromCallable(() -> {
                    int retiredCount = lifecycleService.retireExpiredGuidelines();
                    return Map.<String, Object>of("retiredCount", retiredCount);
                })
                .subscribeOn(Schedulers.boundedElastic())
                .map(ResponseEntity::ok);
    }

    private java.time.LocalDate parseExpiry(String expiryDate) {
        return (expiryDate != null && !expiryDate.isBlank()) ? java.time.LocalDate.parse(expiryDate) : null;
    }

    private Mono<Map<String, String>> processUpload(
            FilePart filePart, String mrn, String documentType, String specialty,
            java.time.LocalDate expiryDate, Integer version, UUID parentDocumentId, String jobId) {

        String actualJobId = jobId != null ? jobId : java.util.UUID.randomUUID().toString();
        progressService.getProgressStream(actualJobId);
        progressService.emitProgress(actualJobId, "Initializing secure upload...");

        String originalFilename = filePart.filename();

        // Write FilePart to a temp file so existing services can use InputStream
        Path tempDir;
        try {
            tempDir = Files.createTempDirectory("doc-upload-");
        } catch (Exception e) {
            return Mono.error(e);
        }
        Path tempFile = tempDir.resolve(originalFilename);

        return filePart.transferTo(tempFile)
                .then(Mono.fromCallable(() -> {
                    File file = tempFile.toFile();
                    long fileSize = file.length();

                    progressService.emitProgress(actualJobId, "Transferring file to secure vault...");
                    // 1. Save raw file to MinIO (S3)
                    String storageKey = storageService.uploadFile(file, originalFilename);

                    progressService.emitProgress(actualJobId, "Extracting document text...");
                    // 2. Parse text locally using CPU (PDFBox / Apache POI)
                    PdfParserService.ParseResult parseResult = pdfParserService.extractText(file);
                    String extractedText = parseResult.extractedText();

                    // Warn via SSE if extraction was low-confidence
                    if (parseResult.requiresVerification()) {
                        progressService.emitProgress(actualJobId,
                                "⚠️ Limited text extracted — human verification recommended.");
                    }

                    progressService.emitProgress(actualJobId, "Queuing document for AI analysis...");

                    progressService.emitProgress(actualJobId, "Finalizing Document...");

                    // Map documentType to a human-readable category
                    String resolvedDocType = documentType != null ? documentType : "UNKNOWN";
                    String resolvedCategory = switch (resolvedDocType) {
                        case "GUIDELINE" -> "Clinical Protocol";
                        case "LAB_REPORT" -> "Lab Reports";
                        case "IMAGING" -> "Imaging";
                        case "DISCHARGE_SUMMARY" -> "Discharge Summaries";
                        case "CLINICAL_NOTE" -> "Clinical Notes";
                        default -> "Other Documents";
                    };

                    // Determine final status based on parse confidence
                    String docStatus = parseResult.requiresVerification() ? "REQUIRES_VERIFICATION" : "COMPLETED";

                    // 3. Save Document to DB
                    DocumentEntity doc = DocumentEntity.builder()
                            .fileName(originalFilename)
                            .fileKey(storageKey)
                            .documentType(resolvedDocType)
                            .category(resolvedCategory)
                            .specialty(specialty != null ? specialty : "General Medicine")
                            .status(docStatus)
                            .fileSize(fileSize)
                            .targetMrn(mrn != null ? mrn : "HOSPITAL_WIDE")
                            .uploadedAt(java.time.LocalDateTime.now())
                            .version(version != null ? version : 1)
                            .expiryDate(expiryDate)
                            .parentDocumentId(parentDocumentId)
                            .build();
                    documentRepository.save(doc);

                    // Clean up temp file
                    try { Files.deleteIfExists(tempFile); Files.deleteIfExists(tempDir); } catch (Exception ignored) {}

                    // 4. Return results
                    return Map.of(
                            "fileKey", storageKey,
                            "extractedText", extractedText,
                            "fileName", originalFilename,
                            "mrn", mrn != null ? mrn : "UNKNOWN",
                            "documentType", documentType != null ? documentType : "UNKNOWN",
                            "jobId", actualJobId
                    );
                }))
                .subscribeOn(Schedulers.boundedElastic())
                .doOnSuccess(result -> {
                    progressService.emitProgress(actualJobId, "Upload and processing complete.");
                    progressService.completeJob(actualJobId);

                    eventPublisher.publishDocumentParsedEvent(
                            result.get("fileKey"),
                            result.get("extractedText"),
                            result.get("mrn"),
                            result.get("documentType")
                    );
                })
                .doOnError(error -> {
                    progressService.emitProgress(actualJobId, "Error: " + error.getMessage());
                    progressService.completeJob(actualJobId);
                    // Clean up temp file on error
                    try { Files.deleteIfExists(tempFile); Files.deleteIfExists(tempDir); } catch (Exception ignored) {}
                });
    }
}