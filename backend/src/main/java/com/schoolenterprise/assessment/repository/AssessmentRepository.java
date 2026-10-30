package com.schoolenterprise.assessment.repository;

import com.schoolenterprise.assessment.entity.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {
    List<Assessment> findByStatusOrderByAssessmentDateAsc(String status);

    @Query("""
            select a from Assessment a
            where (:classId        is null or a.classId        = :classId)
              and (:sectionId      is null or a.sectionId      = :sectionId)
              and (:subjectId      is null or a.subjectId      = :subjectId)
              and (:academicYearId is null or a.academicYearId = :academicYearId)
              and (:status         is null or a.status         = :status)
            order by a.assessmentDate desc
            """)
    List<Assessment> adminList(
            @Param("classId")        Long classId,
            @Param("sectionId")      Long sectionId,
            @Param("subjectId")      Long subjectId,
            @Param("academicYearId") Long academicYearId,
            @Param("status")         String status);
}
