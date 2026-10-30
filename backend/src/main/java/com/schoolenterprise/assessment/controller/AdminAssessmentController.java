package com.schoolenterprise.assessment.controller;

import com.schoolenterprise.assessment.dto.AssessmentRequest;
import com.schoolenterprise.assessment.dto.AssessmentResponse;
import com.schoolenterprise.assessment.service.AssessmentService;
import com.schoolenterprise.common.api.ApiResponse;
import com.schoolenterprise.common.security.ExcludeTeacherRoles;
import com.schoolenterprise.common.security.RequirePermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/assessments")
@RequiredArgsConstructor
@ExcludeTeacherRoles
public class AdminAssessmentController {

    private final AssessmentService assessmentService;

    /** POST /api/admin/assessments — create a new assessment (DRAFT or PUBLISHED). */
    @PostMapping
    @RequirePermission(module = "assessments", action = "create")
    public ApiResponse<AssessmentResponse> create(@Valid @RequestBody AssessmentRequest request) {
        return ApiResponse.ok(assessmentService.create(request));
    }

    /** PUT /api/admin/assessments/{id} — update an existing assessment. */
    @PutMapping("/{id}")
    @RequirePermission(module = "assessments", action = "edit")
    public ApiResponse<AssessmentResponse> update(@PathVariable Long id, @Valid @RequestBody AssessmentRequest request) {
        return ApiResponse.ok(assessmentService.update(id, request));
    }

    /**
     * GET /api/admin/assessments — list all assessments with optional filters.
     * Params: classId, sectionId, subjectId, academicYearId, status
     */
    @GetMapping
    @RequirePermission(module = "assessments", action = "view")
    public ApiResponse<List<AssessmentResponse>> list(
            @RequestParam(required = false) Long classId,
            @RequestParam(required = false) Long sectionId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Long academicYearId,
            @RequestParam(required = false) String status) {
        return ApiResponse.ok(assessmentService.adminList(classId, sectionId, subjectId, academicYearId, status));
    }

    /** GET /api/admin/assessments/{id} — fetch a single assessment by id. */
    @GetMapping("/{id}")
    @RequirePermission(module = "assessments", action = "view")
    public ApiResponse<AssessmentResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(assessmentService.adminGet(id));
    }

    /**
     * PUT /api/admin/assessments/{id}/publish — change status from DRAFT → PUBLISHED.
     * Teachers will immediately see this assessment in their portal.
     */
    @PutMapping("/{id}/publish")
    @RequirePermission(module = "assessments", action = "publish")
    public ApiResponse<AssessmentResponse> publish(@PathVariable Long id) {
        return ApiResponse.ok(assessmentService.publish(id));
    }

    /**
     * PUT /api/admin/assessments/{id}/unpublish — change status from PUBLISHED → DRAFT.
     * The assessment becomes invisible to teachers immediately.
     */
    @PutMapping("/{id}/unpublish")
    @RequirePermission(module = "assessments", action = "publish")
    public ApiResponse<AssessmentResponse> unpublish(@PathVariable Long id) {
        return ApiResponse.ok(assessmentService.unpublish(id));
    }
}
