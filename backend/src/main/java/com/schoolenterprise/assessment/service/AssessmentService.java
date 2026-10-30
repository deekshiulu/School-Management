package com.schoolenterprise.assessment.service;

import com.schoolenterprise.academics.entity.SchoolClass;
import com.schoolenterprise.academics.entity.Section;
import com.schoolenterprise.academics.entity.Subject;
import com.schoolenterprise.academics.repository.SchoolClassRepository;
import com.schoolenterprise.academics.repository.SectionRepository;
import com.schoolenterprise.academics.repository.SubjectClassMappingRepository;
import com.schoolenterprise.academics.repository.SubjectRepository;
import com.schoolenterprise.audit.service.AuditService;
import com.schoolenterprise.assessment.dto.AssessmentRequest;
import com.schoolenterprise.assessment.dto.AssessmentResponse;
import com.schoolenterprise.assessment.entity.Assessment;
import com.schoolenterprise.assessment.repository.AssessmentRepository;
import com.schoolenterprise.common.exception.AppException;
import com.schoolenterprise.common.security.AppUserDetails;
import com.schoolenterprise.common.security.PermissionService;
import com.schoolenterprise.common.security.TeacherScope;
import com.schoolenterprise.common.security.TeacherScopeResolver;
import com.schoolenterprise.school.entity.AcademicYear;
import com.schoolenterprise.school.repository.AcademicYearRepository;
import com.schoolenterprise.staff.entity.TeacherAssignment;
import com.schoolenterprise.staff.repository.TeacherAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssessmentService {
    private final AssessmentRepository assessmentRepository;
    private final PermissionService permissionService;
    private final TeacherScopeResolver teacherScopeResolver;
    private final TeacherAssignmentRepository teacherAssignmentRepository;
    private final SchoolClassRepository classRepository;
    private final SectionRepository sectionRepository;
    private final SubjectRepository subjectRepository;
    private final SubjectClassMappingRepository subjectClassMappingRepository;
    private final AcademicYearRepository academicYearRepository;
    private final AuditService auditService;

    @Transactional
    public AssessmentResponse create(AssessmentRequest request) {
        if (!permissionService.isAdmin()) {
            throw AppException.forbidden("Only an Admin may schedule assessments");
        }
        String status = request.status().trim().toUpperCase();
        if (!"DRAFT".equals(status) && !"PUBLISHED".equals(status)) {
            throw AppException.badRequest("Assessment status must be DRAFT or PUBLISHED");
        }

        SchoolClass schoolClass = classRepository.findById(request.classId())
                .orElseThrow(() -> AppException.notFound("Class not found"));
        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> AppException.notFound("Subject not found"));
        AcademicYear year = academicYearRepository.findById(request.academicYearId())
                .orElseThrow(() -> AppException.notFound("Academic year not found"));
        Section section = request.sectionId() == null ? null : sectionRepository.findById(request.sectionId())
                .orElseThrow(() -> AppException.notFound("Section not found"));

        if (!"ACTIVE".equals(year.getStatus()) || !"ACTIVE".equals(subject.getStatus())
                || (section != null && !"ACTIVE".equals(section.getStatus()))) {
            throw AppException.badRequest("Assessment class, section, subject and academic year must be active");
        }
        if (schoolClass.getSchoolId() == null || !schoolClass.getSchoolId().equals(year.getSchoolId())
                || !schoolClass.getSchoolId().equals(subject.getSchoolId())) {
            throw AppException.badRequest("Assessment class, subject and academic year must belong to the same school");
        }
        if (section != null && (!request.classId().equals(section.getClassId())
                || !request.academicYearId().equals(section.getAcademicYearId()))) {
            throw AppException.badRequest("Assessment section must match its class and academic year");
        }
        if (request.assessmentDate().isBefore(year.getStartDate())
                || request.assessmentDate().isAfter(year.getEndDate())) {
            throw AppException.badRequest("Assessment date must fall within the selected academic year");
        }
        if (!subjectClassMappingRepository.existsBySubjectIdAndClassIdAndAcademicYearId(
                subject.getId(), schoolClass.getId(), year.getId())) {
            throw AppException.badRequest("Subject is not assigned to the selected class and academic year");
        }

        Assessment assessment = new Assessment();
        assessment.setTitle(request.title().trim());
        assessment.setClassId(schoolClass.getId());
        assessment.setSectionId(section == null ? null : section.getId());
        assessment.setSubjectId(subject.getId());
        assessment.setAcademicYearId(year.getId());
        assessment.setAssessmentDate(request.assessmentDate());
        assessment.setMaxMarks(request.maxMarks());
        assessment.setStatus(status);
        Assessment saved = assessmentRepository.save(assessment);
        auditService.record("assessments", "create", "Assessment", saved.getId(),
                "Scheduled assessment for class " + saved.getClassId()
                        + " and academic year " + saved.getAcademicYearId());
        return response(saved);
    }

    @Transactional
    public AssessmentResponse update(Long id, AssessmentRequest request) {
        if (!permissionService.isAdmin()) {
            throw AppException.forbidden("Only an Admin may update assessments");
        }
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Assessment not found: " + id));

        SchoolClass schoolClass = classRepository.findById(request.classId())
                .orElseThrow(() -> AppException.notFound("Class not found: " + request.classId()));
        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> AppException.notFound("Subject not found: " + request.subjectId()));
        AcademicYear year = academicYearRepository.findById(request.academicYearId())
                .orElseThrow(() -> AppException.notFound("Academic year not found: " + request.academicYearId()));
        Section section = request.sectionId() == null ? null : sectionRepository.findById(request.sectionId())
                .orElseThrow(() -> AppException.notFound("Section not found: " + request.sectionId()));

        if (!"ACTIVE".equals(year.getStatus()) || !"ACTIVE".equals(subject.getStatus())
                || (section != null && !"ACTIVE".equals(section.getStatus()))) {
            throw AppException.badRequest("Assessment class, section, subject and academic year must be active");
        }
        if (section != null && (!request.classId().equals(section.getClassId())
                || !request.academicYearId().equals(section.getAcademicYearId()))) {
            throw AppException.badRequest("Assessment section must match its class and academic year");
        }

        assessment.setTitle(request.title().trim());
        assessment.setClassId(schoolClass.getId());
        assessment.setSectionId(section == null ? null : section.getId());
        assessment.setSubjectId(subject.getId());
        assessment.setAcademicYearId(year.getId());
        assessment.setAssessmentDate(request.assessmentDate());
        assessment.setMaxMarks(request.maxMarks());
        if (request.status() != null && !request.status().isBlank()) {
            assessment.setStatus(request.status().trim().toUpperCase());
        }

        Assessment saved = assessmentRepository.save(assessment);
        auditService.record("assessments", "edit", "Assessment", saved.getId(),
                "Updated assessment: " + saved.getTitle());
        return response(saved);
    }

    @Transactional(readOnly = true)
    public List<AssessmentResponse> adminList(Long classId, Long sectionId, Long subjectId,
                                              Long academicYearId, String status) {
        if (!permissionService.isAdmin()) {
            throw AppException.forbidden("Only an Admin may view all assessments");
        }
        String normalizedStatus = (status == null || status.isBlank()) ? null : status.trim().toUpperCase();
        return assessmentRepository.adminList(classId, sectionId, subjectId, academicYearId, normalizedStatus)
                .stream()
                .map(this::response)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssessmentResponse adminGet(Long id) {
        if (!permissionService.isAdmin()) {
            throw AppException.forbidden("Only an Admin may access this endpoint");
        }
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Assessment not found"));
        return response(assessment);
    }

    @Transactional
    public AssessmentResponse publish(Long id) {
        if (!permissionService.isAdmin()) {
            throw AppException.forbidden("Only an Admin may publish assessments");
        }
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Assessment not found"));
        if ("PUBLISHED".equals(assessment.getStatus())) {
            throw AppException.badRequest("Assessment is already published");
        }
        assessment.setStatus("PUBLISHED");
        Assessment saved = assessmentRepository.save(assessment);
        auditService.record("assessments", "publish", "Assessment", saved.getId(),
                "Published assessment: " + saved.getTitle());
        return response(saved);
    }

    @Transactional
    public AssessmentResponse unpublish(Long id) {
        if (!permissionService.isAdmin()) {
            throw AppException.forbidden("Only an Admin may unpublish assessments");
        }
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Assessment not found"));
        if ("DRAFT".equals(assessment.getStatus())) {
            throw AppException.badRequest("Assessment is already a draft");
        }
        assessment.setStatus("DRAFT");
        Assessment saved = assessmentRepository.save(assessment);
        auditService.record("assessments", "unpublish", "Assessment", saved.getId(),
                "Unpublished assessment: " + saved.getTitle());
        return response(saved);
    }

    @Transactional(readOnly = true)
    public List<AssessmentResponse> teacherAssessments() {
        TeacherScope scope = teacherScope();
        return assessmentRepository.findByStatusOrderByAssessmentDateAsc("PUBLISHED").stream()
                .filter(assessment -> allowed(assessment, scope))
                .map(this::response)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssessmentResponse teacherAssessment(Long id) {
        TeacherScope scope = teacherScope();
        Assessment assessment = assessmentRepository.findById(id)
                .filter(value -> "PUBLISHED".equals(value.getStatus()) && allowed(value, scope))
                .orElseThrow(() -> AppException.notFound("Assessment not found"));
        return response(assessment);
    }

    private TeacherScope teacherScope() {
        AppUserDetails user = permissionService.currentUser();
        if (!permissionService.isTeacher(user)) {
            throw AppException.forbidden("Teacher access is required");
        }
        return teacherScopeResolver.resolve(user);
    }

    private boolean allowed(Assessment assessment, TeacherScope scope) {
        if (!scope.academicYearIds().contains(assessment.getAcademicYearId())) {
            return false;
        }
        return teacherAssignmentRepository.findByStaffId(scope.staffId()).stream()
                .filter(assignment -> scope.assignmentIds().contains(assignment.getId())
                        && "ACTIVE".equals(assignment.getStatus())
                        && assessment.getClassId().equals(assignment.getClassId())
                        && assessment.getAcademicYearId().equals(assignment.getAcademicYearId()))
                .anyMatch(assignment -> assignmentAllowsAssessment(assignment, assessment, scope));
    }

    private boolean assignmentAllowsAssessment(TeacherAssignment assignment, Assessment assessment,
                                               TeacherScope scope) {
        if (assignment.getSubjectId() != null
                && !assignment.getSubjectId().equals(assessment.getSubjectId())) {
            return false;
        }
        if (assessment.getSectionId() == null) {
            return true;
        }
        if (!scope.sectionIds().contains(assessment.getSectionId())) {
            return false;
        }
        return assignment.getSectionId() == null
                || assessment.getSectionId().equals(assignment.getSectionId());
    }

    private AssessmentResponse response(Assessment assessment) {
        SchoolClass schoolClass = classRepository.findById(assessment.getClassId()).orElse(null);
        Section section = assessment.getSectionId() == null ? null
                : sectionRepository.findById(assessment.getSectionId()).orElse(null);
        Subject subject = subjectRepository.findById(assessment.getSubjectId()).orElse(null);
        AcademicYear year = academicYearRepository.findById(assessment.getAcademicYearId()).orElse(null);
        return new AssessmentResponse(assessment.getId(), assessment.getTitle(), assessment.getClassId(),
                schoolClass == null ? null : schoolClass.getName(), assessment.getSectionId(),
                section == null ? null : section.getName(), assessment.getSubjectId(),
                subject == null ? null : subject.getName(), assessment.getAcademicYearId(),
                year == null ? null : year.getName(), assessment.getAssessmentDate(),
                assessment.getMaxMarks(), assessment.getStatus());
    }
}
