package com.hexamedplus.clinical_service.controller;

import com.hexamedplus.clinical_service.dto.UserDto;
import com.hexamedplus.clinical_service.entity.UserEntity;
import com.hexamedplus.clinical_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Slf4j
@RestController
@RequestMapping("/api/clinical/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping
    public Flux<UserDto.Response> getAllUsers() {
        return Flux.fromIterable(userRepository.findAll())
                .map(this::mapToResponse)
                .subscribeOn(Schedulers.boundedElastic());
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<UserDto.Response>> getUserById(@PathVariable String id) {
        return Mono.fromCallable(() -> userRepository.findById(id))
                .subscribeOn(Schedulers.boundedElastic())
                .map(opt -> opt.map(entity -> ResponseEntity.ok(mapToResponse(entity)))
                        .orElse(ResponseEntity.notFound().build()));
    }
    
    @GetMapping("/username/{username}")
    public Mono<ResponseEntity<UserDto.Response>> getUserByUsername(@PathVariable String username) {
        return Mono.fromCallable(() -> userRepository.findByUsername(username))
                .subscribeOn(Schedulers.boundedElastic())
                .map(opt -> opt.map(entity -> ResponseEntity.ok(mapToResponse(entity)))
                        .orElse(ResponseEntity.notFound().build()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<UserDto.Response> createUser(@RequestBody UserDto.Request request) {
        return Mono.fromCallable(() -> {
            UserEntity entity = UserEntity.builder()
                    .username(request.getUsername())
                    .email(request.getEmail())
                    .fullName(request.getFullName())
                    .role(request.getRole() != null ? request.getRole() : "PHYSICIAN")
                    .specialty(request.getSpecialty())
                    .profileImageKey(request.getProfileImageKey())
                    .build();
            return mapToResponse(userRepository.save(entity));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @PutMapping("/{id}")
    public Mono<ResponseEntity<UserDto.Response>> updateUser(@PathVariable String id, @RequestBody UserDto.Request request) {
        return Mono.fromCallable(() -> userRepository.findById(id))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(opt -> {
                    if (opt.isPresent()) {
                        UserEntity entity = opt.get();
                        if (request.getFullName() != null) entity.setFullName(request.getFullName());
                        if (request.getEmail() != null) entity.setEmail(request.getEmail());
                        if (request.getSpecialty() != null) entity.setSpecialty(request.getSpecialty());
                        if (request.getProfileImageKey() != null) entity.setProfileImageKey(request.getProfileImageKey());
                        
                        return Mono.fromCallable(() -> ResponseEntity.ok(mapToResponse(userRepository.save(entity))))
                                .subscribeOn(Schedulers.boundedElastic());
                    } else {
                        return Mono.just(ResponseEntity.notFound().build());
                    }
                });
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Void>> deleteUser(@PathVariable String id) {
        return Mono.fromCallable(() -> {
            if (userRepository.existsById(id)) {
                userRepository.deleteById(id);
                return ResponseEntity.noContent().<Void>build();
            }
            return ResponseEntity.notFound().<Void>build();
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private UserDto.Response mapToResponse(UserEntity entity) {
        return UserDto.Response.builder()
                .id(entity.getId())
                .username(entity.getUsername())
                .email(entity.getEmail())
                .fullName(entity.getFullName())
                .role(entity.getRole())
                .specialty(entity.getSpecialty())
                .profileImageKey(entity.getProfileImageKey())
                .build();
    }
}
