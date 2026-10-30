package com.schoolenterprise.attendance.controller;

import com.schoolenterprise.attendance.service.AdminAttendanceService;
import com.schoolenterprise.common.api.ApiResponse;
import com.schoolenterprise.common.security.ExcludeTeacherRoles;
import com.schoolenterprise.common.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/attendance")
@RequiredArgsConstructor
@ExcludeTeacherRoles
@RequirePermission(module = "students", action = "view")
public class AdminAttendanceController {

    private final AdminAttendanceService adminAttendanceService;

    /**
     * GET /api/admin/attendance/summary?sectionId=1&fromDate=2025-01-01&toDate=2025-01-31
     * Returns aggregate present/absent/late totals for the given section and date range.
     */
    @GetMapping("/summary")
    public ApiResponse<?> getSummary(
            @RequestParam Long sectionId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ApiResponse.ok(adminAttendanceService.adminSummary(sectionId, fromDate, toDate));
    }

    /**
     * GET /api/admin/attendance/daily?sectionId=1&date=2025-01-15
     * Returns per-student attendance records for the given section on a specific date.
     */
    @GetMapping("/daily")
    public ApiResponse<?> getDaily(
            @RequestParam Long sectionId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(adminAttendanceService.adminDaily(sectionId, date));
    }
}
