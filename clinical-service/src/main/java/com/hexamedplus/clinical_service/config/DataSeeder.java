package com.hexamedplus.clinical_service.config;

import com.hexamedplus.clinical_service.entity.PatientEntity;
import com.hexamedplus.clinical_service.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final PatientRepository patientRepository;

    @Override
    public void run(String... args) throws Exception {
        if (patientRepository.count() == 0) {
            log.info("Seeding initial patient data...");

            PatientEntity p1 = PatientEntity.builder()
                    .mrn("MRN-849201")
                    .firstName("James")
                    .lastName("Wilson")
                    .dob(LocalDate.of(1955, 3, 14))
                    .gender("Male")
                    .department("Cardiology")
                    .status("Active")
                    .room("301-A")
                    .admissionDate(LocalDateTime.now().minusDays(1))
                    .allergies("Penicillin")
                    .activeMedications("Lisinopril, Aspirin")
                    .build();

            PatientEntity p2 = PatientEntity.builder()
                    .mrn("MRN-339201")
                    .firstName("Maria")
                    .lastName("Garcia")
                    .dob(LocalDate.of(1982, 8, 22))
                    .gender("Female")
                    .department("Endocrinology")
                    .status("Inactive")
                    .room("Outpatient")
                    .admissionDate(LocalDateTime.now().minusDays(5))
                    .allergies("Sulfa")
                    .activeMedications("Metformin, Insulin")
                    .build();

            PatientEntity p3 = PatientEntity.builder()
                    .mrn("MRN-112948")
                    .firstName("Robert")
                    .lastName("Chen")
                    .dob(LocalDate.of(1968, 11, 2))
                    .gender("Male")
                    .department("General Medicine")
                    .status("Active")
                    .room("402-B")
                    .admissionDate(LocalDateTime.now())
                    .allergies("None")
                    .activeMedications("Atorvastatin")
                    .build();

            PatientEntity p4 = PatientEntity.builder()
                    .mrn("MRN-449293")
                    .firstName("Sarah")
                    .lastName("Johnson")
                    .dob(LocalDate.of(1990, 1, 15))
                    .gender("Female")
                    .department("Neurology")
                    .status("Active")
                    .room("501-A")
                    .admissionDate(LocalDateTime.now().minusHours(4))
                    .allergies("Latex")
                    .activeMedications("Ibuprofen")
                    .build();

            patientRepository.saveAll(Arrays.asList(p1, p2, p3, p4));
            log.info("Successfully seeded 4 patients.");
        } else {
            log.info("Database already contains patient data.");
        }
    }
}
