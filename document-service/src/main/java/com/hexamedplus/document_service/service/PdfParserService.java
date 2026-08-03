package com.hexamedplus.document_service.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.util.regex.Pattern;

/**
 * Multi-format document text extractor with built-in PII masking.
 * Supports: PDF, DOCX, DOC, TXT. Flags low-confidence extractions for HITL.
 */
@Service
@Slf4j
public class PdfParserService {

    // PII masking patterns
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("(\\(\\d{3}\\)[\\s.-]?|\\d{3}[-.\\s])\\d{3}[-.\\s]\\d{4}");
    private static final Pattern SSN_PATTERN =
            Pattern.compile("\\b\\d{3}-\\d{2}-\\d{4}\\b");
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}");
    private static final Pattern DATE_OF_BIRTH_PATTERN =
            Pattern.compile("\\b(DOB|Date of Birth|Born)[:\\s]+\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{4}\\b",
                    Pattern.CASE_INSENSITIVE);

    // Minimum characters for "useful" extraction — below this, flag as REQUIRES_VERIFICATION
    private static final int LOW_CONFIDENCE_THRESHOLD = 150;

    public ParseResult extractText(File file) {
        String fileName = file.getName().toLowerCase();
        long startTime = System.currentTimeMillis();
        log.info("Starting local CPU parsing for file: {}", file.getName());

        String rawText;
        String parseWarning = null;

        try {
            if (fileName.endsWith(".pdf")) {
                rawText = parsePdf(file);
            } else if (fileName.endsWith(".docx")) {
                rawText = parseDocx(file);
            } else if (fileName.endsWith(".doc")) {
                rawText = parseDoc(file);
            } else if (fileName.endsWith(".txt")) {
                rawText = Files.readString(file.toPath());
            } else {
                log.warn("Unsupported file format: {}", file.getName());
                rawText = "";
                parseWarning = "Unsupported file format — stored but not indexed.";
            }
        } catch (Exception e) {
            log.error("Failed to parse file {}: {}", file.getName(), e.getMessage());
            rawText = "";
            parseWarning = "Parse error: " + e.getMessage();
        }

        // Apply PII masking to extracted text
        String maskedText = maskPii(rawText);
        long elapsed = System.currentTimeMillis() - startTime;
        log.info("Parsed {} characters in {} ms for file: {}", maskedText.length(), elapsed, file.getName());

        // Low-confidence detection — flag for human review
        boolean requiresVerification = maskedText.trim().length() < LOW_CONFIDENCE_THRESHOLD;
        if (requiresVerification && parseWarning == null) {
            parseWarning = "Limited text extracted — human verification recommended (possible image-only document).";
            log.warn("Low-confidence extraction for {}: only {} chars — flagging as REQUIRES_VERIFICATION",
                    file.getName(), maskedText.trim().length());
        }

        return new ParseResult(maskedText, requiresVerification, parseWarning);
    }

    // --- Format-specific parsers ---

    private String parsePdf(File file) throws IOException {
        try (PDDocument document = PDDocument.load(file)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String parseDocx(File file) throws Exception {
        try (FileInputStream fis = new FileInputStream(file);
             XWPFDocument doc = new XWPFDocument(fis);
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        }
    }

    private String parseDoc(File file) throws Exception {
        try (FileInputStream fis = new FileInputStream(file);
             HWPFDocument doc = new HWPFDocument(fis);
             WordExtractor extractor = new WordExtractor(doc)) {
            return extractor.getText();
        }
    }

    // --- PII Masking ---

    private String maskPii(String text) {
        if (text == null || text.isEmpty()) return text;
        text = PHONE_PATTERN.matcher(text).replaceAll("[PHONE]");
        text = SSN_PATTERN.matcher(text).replaceAll("[SSN]");
        text = EMAIL_PATTERN.matcher(text).replaceAll("[EMAIL]");
        text = DATE_OF_BIRTH_PATTERN.matcher(text).replaceAll("$1: [DOB]");
        return text;
    }

    // --- Result record ---

    public record ParseResult(
            String extractedText,
            boolean requiresVerification,
            String warning
    ) {}
}