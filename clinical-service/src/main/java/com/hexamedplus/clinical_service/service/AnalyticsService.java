package com.hexamedplus.clinical_service.service;

import com.hexamedplus.clinical_service.entity.EncounterEntity;
import com.hexamedplus.clinical_service.entity.PatientEntity;
import com.hexamedplus.clinical_service.repository.EncounterRepository;
import com.hexamedplus.clinical_service.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final PatientRepository patientRepository;
    private final EncounterRepository encounterRepository;

    public Mono<Map<String, Object>> getDashboardAnalytics() {
        return Mono.fromCallable(() -> {
            long totalPatients = patientRepository.count();
            List<EncounterEntity> allEncounters = encounterRepository.findAll();

            // KPI counts
            long pendingReviews = allEncounters.stream()
                    .filter(e -> "CODING_COMPLETE".equals(e.getStatus()))
                    .count();
            long codingPending = allEncounters.stream()
                    .filter(e -> "CODING_PENDING".equals(e.getStatus()))
                    .count();
            long inProgress = allEncounters.stream()
                    .filter(e -> "IN_PROGRESS".equals(e.getStatus()))
                    .count();

            // Today's encounters
            LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
            LocalDateTime endOfDay = startOfDay.plusDays(1);
            List<EncounterEntity> todayEncounters = encounterRepository
                    .findByEncounterDateBetween(startOfDay, endOfDay);

            // Build today's encounter list — join with patient names
            // We load patients in one shot to avoid N+1
            Map<UUID, PatientEntity> patientMap = patientRepository.findAll().stream()
                    .collect(Collectors.toMap(PatientEntity::getId, p -> p));

            List<Map<String, Object>> todayList = todayEncounters.stream()
                    .map(e -> {
                        PatientEntity pt = patientMap.get(e.getPatientId());
                        String patientName = pt != null ? pt.getFirstName() + " " + pt.getLastName() : "Unknown";
                        return Map.<String, Object>of(
                                "id", e.getId().toString(),
                                "patientId", e.getPatientId().toString(),
                                "patientName", patientName,
                                "mrn", pt != null ? pt.getMrn() : "",
                                "encounterType", e.getEncounterType() != null ? e.getEncounterType() : "Visit",
                                "status", e.getStatus(),
                                "chiefComplaint", e.getChiefComplaint() != null ? e.getChiefComplaint() : "",
                                "encounterDate", e.getEncounterDate() != null
                                        ? e.getEncounterDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : ""
                        );
                    })
                    .toList();

            // Recent encounters (last 10 — for activity feed)
            List<Map<String, Object>> recentEncounters = encounterRepository.findTop10ByOrderByEncounterDateDesc()
                    .stream()
                    .map(e -> {
                        PatientEntity pt = patientMap.get(e.getPatientId());
                        String patientName = pt != null ? pt.getFirstName() + " " + pt.getLastName() : "Unknown";
                        return Map.<String, Object>of(
                                "id", e.getId().toString(),
                                "patientName", patientName,
                                "status", e.getStatus(),
                                "encounterType", e.getEncounterType() != null ? e.getEncounterType() : "Visit",
                                "encounterDate", e.getEncounterDate() != null
                                        ? e.getEncounterDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : ""
                        );
                    })
                    .toList();

            // Admissions by day of week
            List<Map<String, Object>> admissionsTrend = List.of(
                    Map.of("name", "Mon", "admissions", countByDow(allEncounters, 1)),
                    Map.of("name", "Tue", "admissions", countByDow(allEncounters, 2)),
                    Map.of("name", "Wed", "admissions", countByDow(allEncounters, 3)),
                    Map.of("name", "Thu", "admissions", countByDow(allEncounters, 4)),
                    Map.of("name", "Fri", "admissions", countByDow(allEncounters, 5)),
                    Map.of("name", "Sat", "admissions", countByDow(allEncounters, 6)),
                    Map.of("name", "Sun", "admissions", countByDow(allEncounters, 7))
            );

            // Age distribution — bucketed from each patient's actual date of birth.
            // Patients with no recorded DOB are excluded from every bucket rather
            // than guessed into one.
            LocalDate today = LocalDate.now();
            int age0to18 = 0, age19to35 = 0, age36to50 = 0, age51to70 = 0, age71plus = 0;
            for (PatientEntity p : patientMap.values()) {
                if (p.getDob() == null) {
                    continue;
                }
                int age = Period.between(p.getDob(), today).getYears();
                if (age <= 18) {
                    age0to18++;
                } else if (age <= 35) {
                    age19to35++;
                } else if (age <= 50) {
                    age36to50++;
                } else if (age <= 70) {
                    age51to70++;
                } else {
                    age71plus++;
                }
            }
            List<Map<String, Object>> patientVisits = List.of(
                    Map.of("name", "0-18", "patients", age0to18),
                    Map.of("name", "19-35", "patients", age19to35),
                    Map.of("name", "36-50", "patients", age36to50),
                    Map.of("name", "51-70", "patients", age51to70),
                    Map.of("name", "71+", "patients", age71plus)
            );

            return Map.of(
                    "kpis", Map.of(
                            "totalPatients", totalPatients,
                            "pendingReviews", pendingReviews,
                            "codingPending", codingPending,
                            "activeEncounters", inProgress,
                            "todayEncounterCount", todayEncounters.size(),
                            "clinicalAlerts", 0
                    ),
                    "charts", Map.of(
                            "admissionsTrend", admissionsTrend,
                            "patientVisits", patientVisits
                    ),
                    "todayEncounters", todayList,
                    "recentEncounters", recentEncounters
            );
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private long countByDow(List<EncounterEntity> encounters, int dayOfWeek) {
        return encounters.stream()
                .filter(e -> e.getEncounterDate() != null
                        && e.getEncounterDate().getDayOfWeek().getValue() == dayOfWeek)
                .count();
    }
}
