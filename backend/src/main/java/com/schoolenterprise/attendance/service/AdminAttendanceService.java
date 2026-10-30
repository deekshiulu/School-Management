package com.schoolenterprise.attendance.service;

import com.schoolenterprise.attendance.entity.AttendanceRecord;
import com.schoolenterprise.attendance.repository.AttendanceRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminAttendanceService {

    private final AttendanceRecordRepository attendanceRecordRepository;

    /**
     * Returns aggregated attendance counts (PRESENT, ABSENT, LATE, total)
     * for a section over the given inclusive date range.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> adminSummary(Long sectionId, LocalDate fromDate, LocalDate toDate) {
        long present = 0;
        long absent  = 0;
        long late    = 0;
        long total   = 0;

        for (Object[] row : attendanceRecordRepository.summarizeBySectionAndDateRange(
                sectionId, fromDate, toDate)) {
            String status = ((String) row[0]).toUpperCase(Locale.ROOT);
            long count = ((Number) row[1]).longValue();
            total += count;
            switch (status) {
                case "PRESENT" -> present += count;
                case "ABSENT"  -> absent  += count;
                case "LATE"    -> late    += count;
                default        -> { }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sectionId", sectionId);
        result.put("fromDate",  fromDate);
        result.put("toDate",    toDate);
        result.put("present",   present);
        result.put("absent",    absent);
        result.put("late",      late);
        result.put("total",     total);
        return result;
    }

    /**
     * Returns the full per-student attendance roster for a section on a single date.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> adminDaily(Long sectionId, LocalDate date) {
        List<AttendanceRecord> records =
                attendanceRecordRepository.findBySectionIdAndAttendanceDate(sectionId, date);

        return records.stream().map(record -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("studentId",       record.getStudentId());
            entry.put("sectionId",       record.getSectionId());
            entry.put("attendanceDate",  record.getAttendanceDate());
            entry.put("status",          record.getStatus());
            entry.put("markedByStaffId", record.getMarkedByStaffId());
            return entry;
        }).toList();
    }
}
