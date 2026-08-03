package com.hexamedplus.document_service.service;

import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DocumentProgressService {

    // Map of jobId -> Sink
    private final Map<String, Sinks.Many<String>> sinks = new ConcurrentHashMap<>();

    public Flux<String> getProgressStream(String jobId) {
        return sinks.computeIfAbsent(jobId, id -> Sinks.many().multicast().onBackpressureBuffer())
                .asFlux();
    }

    public void emitProgress(String jobId, String message) {
        Sinks.Many<String> sink = sinks.get(jobId);
        if (sink != null) {
            sink.tryEmitNext(message);
        }
    }

    public void completeJob(String jobId) {
        Sinks.Many<String> sink = sinks.remove(jobId);
        if (sink != null) {
            sink.tryEmitComplete();
        }
    }
}
