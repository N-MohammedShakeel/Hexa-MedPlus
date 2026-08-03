package com.hexamedplus.clinical_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class UserDto {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        private String username;
        private String email;
        private String fullName;
        private String role;
        private String specialty;
        private String profileImageKey;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private String id;
        private String username;
        private String email;
        private String fullName;
        private String role;
        private String specialty;
        private String profileImageKey;
    }
}
