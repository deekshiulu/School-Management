package com.schoolenterprise.common.config;

import com.schoolenterprise.identity.entity.AppUser;
import com.schoolenterprise.identity.entity.Permission;
import com.schoolenterprise.identity.entity.Role;
import com.schoolenterprise.identity.entity.UserScope;
import com.schoolenterprise.identity.repository.AppUserRepository;
import com.schoolenterprise.identity.repository.PermissionRepository;
import com.schoolenterprise.identity.repository.RoleRepository;
import com.schoolenterprise.school.entity.AcademicYear;
import com.schoolenterprise.school.entity.School;
import com.schoolenterprise.school.repository.AcademicYearRepository;
import com.schoolenterprise.school.repository.SchoolRepository;
import com.schoolenterprise.academics.entity.Department;
import com.schoolenterprise.academics.entity.SchoolClass;
import com.schoolenterprise.academics.entity.Section;
import com.schoolenterprise.academics.entity.Subject;
import com.schoolenterprise.academics.entity.SubjectClassMapping;
import com.schoolenterprise.academics.repository.DepartmentRepository;
import com.schoolenterprise.academics.repository.SchoolClassRepository;
import com.schoolenterprise.academics.repository.SectionRepository;
import com.schoolenterprise.academics.repository.SubjectClassMappingRepository;
import com.schoolenterprise.academics.repository.SubjectRepository;
import com.schoolenterprise.student.entity.ClassHistory;
import com.schoolenterprise.student.entity.Enrollment;
import com.schoolenterprise.student.entity.Guardian;
import com.schoolenterprise.student.entity.Student;
import com.schoolenterprise.student.entity.StudentGuardian;
import com.schoolenterprise.student.repository.ClassHistoryRepository;
import com.schoolenterprise.student.repository.EnrollmentRepository;
import com.schoolenterprise.student.repository.GuardianRepository;
import com.schoolenterprise.student.repository.StudentGuardianRepository;
import com.schoolenterprise.student.repository.StudentRepository;
import com.schoolenterprise.staff.entity.Staff;
import com.schoolenterprise.staff.entity.TeacherAssignment;
import com.schoolenterprise.staff.repository.StaffRepository;
import com.schoolenterprise.staff.repository.TeacherAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Creates demo school users and workflow data the first time the app starts.
 * Logins: admin / Admin@123, teacher / Teacher@123
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private static final String[] MODULES = {
            "students", "staff", "classes", "subjects", "fees", "finance", "users", "school", "audit", "dashboard", "attendance", "assessments"
    };
    private static final String[] ACTIONS = {
            "view", "create", "edit", "delete", "approve", "publish", "export"
    };

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final AppUserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final AcademicYearRepository academicYearRepository;
    private final SchoolClassRepository classRepository;
    private final SectionRepository sectionRepository;
    private final StudentRepository studentRepository;
    private final StaffRepository staffRepository;
    private final TeacherAssignmentRepository teacherAssignmentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ClassHistoryRepository classHistoryRepository;
    private final GuardianRepository guardianRepository;
    private final StudentGuardianRepository studentGuardianRepository;
    private final PasswordEncoder passwordEncoder;
    private final DepartmentRepository departmentRepository;
    private final SubjectRepository subjectRepository;
    private final SubjectClassMappingRepository subjectClassMappingRepository;

    @Override
    @Transactional
    public void run(String... args) {
        seedPermissions();
        Role adminRole = seedRole("ADMIN", "Full school access", "FINANCIAL", true);
        seedRole("PRINCIPAL", "School academic head", "HR_RESTRICTED", true);
        Role accountant = seedRole("ACCOUNTANT", "Fee and accounts only", "FINANCIAL", false);
        grant(accountant, List.of("fees", "finance", "dashboard", "students", "school", "audit"), List.of("view", "create", "edit", "approve", "export"));
        Role classTeacher = seedRole("CLASS_TEACHER", "Assigned section students", "NORMAL", false);
        grant(classTeacher, List.of("students", "classes", "subjects", "dashboard"), List.of("view", "edit"));
        Role subjectTeacher = seedRole("SUBJECT_TEACHER", "Assigned subjects only", "NORMAL", false);
        grant(subjectTeacher, List.of("students", "subjects", "classes", "dashboard"), List.of("view"));

        School school = seedSchool();
        AcademicYear academicYear = seedYear(school);

        seedDemoUser("accountant", "accountant@school.local", "Accountant User", "Accountant@123", accountant, school.getId(), "SCHOOL");
        seedDemoUser("teacher", "teacher@school.local", "Class Teacher", "Teacher@123", classTeacher, null, null);
        seedDemoClassesAndStudents(school, academicYear);
        seedDemoSubjectsAndDepartments(school, academicYear);
        userRepository.findByUsername("teacher")
                .ifPresent(teacher -> ensureDemoTeacherWorkflow(teacher, school, academicYear));
        seedDemoPromotionData(school, academicYear);

        if (userRepository.findByUsername("admin").isEmpty()) {
            AppUser admin = new AppUser();
            admin.setUsername("admin");
            admin.setEmail("admin@school.local");
            admin.setPasswordHash(passwordEncoder.encode("Admin@123"));
            admin.setFullName("System Administrator");
            admin.setStatus("ACTIVE");
            admin.setRoles(Set.of(adminRole));
            UserScope scope = new UserScope();
            scope.setUser(admin);
            scope.setScopeType("SCHOOL");
            scope.setScopeId(school.getId());
            admin.getScopes().add(scope);
            userRepository.save(admin);
            log.info("Created demo admin user. Login with username=admin password=Admin@123");
        }
    }

    private void seedPermissions() {
        for (String module : MODULES) {
            for (String action : ACTIONS) {
                permissionRepository.findByModuleNameAndActionName(module, action).orElseGet(() -> {
                    Permission p = new Permission();
                    p.setModuleName(module);
                    p.setActionName(action);
                    p.setDescription(generateDescription(module, action));
                    p.setSensitivity("fees".equals(module) || "finance".equals(module) ? "FINANCIAL" : "staff".equals(module) ? "HR_RESTRICTED" : "NORMAL");
                    return permissionRepository.save(p);
                });
            }
        }
    }

    private String generateDescription(String module, String action) {
        return switch (module) {
            case "students" -> switch (action) {
                case "view" -> "View student profiles, admissions, and guardian details";
                case "create" -> "Add new student admission and registration records";
                case "edit" -> "Edit student information, guardian contacts, and enrollment status";
                case "delete" -> "Delete student profiles and admission records";
                case "approve" -> "Approve student admissions and class enrollments";
                case "export" -> "Export student lists and class registers";
                default -> "Publish class promotion and student academic rosters";
            };
            case "staff" -> switch (action) {
                case "view" -> "View staff directory, employee records, and designations";
                case "create" -> "Add new teachers and administrative staff";
                case "edit" -> "Manage staff information, assignments, and employment status";
                case "delete" -> "Delete staff and employee records";
                case "approve" -> "Approve staff onboarding, leave requests, and assignments";
                case "export" -> "Export staff directory and employee reports";
                default -> "Publish official notices and circulars to staff";
            };
            case "classes" -> switch (action) {
                case "view" -> "View classes, sections, and room capacities";
                case "create" -> "Add new classes and section divisions";
                case "edit" -> "Manage class names, room capacities, and section details";
                case "delete" -> "Delete unused classes and sections";
                case "approve" -> "Approve section configurations and capacity adjustments";
                case "export" -> "Export class rosters and section distribution lists";
                default -> "Publish finalized class rosters";
            };
            case "subjects" -> switch (action) {
                case "view" -> "View departments and subject catalogs";
                case "create" -> "Add academic departments and subject courses";
                case "edit" -> "Manage subjects, course codes, and department mappings";
                case "delete" -> "Delete inactive subjects and departments";
                case "approve" -> "Approve curriculum plans and subject offerings";
                case "export" -> "Export complete subject catalog and department lists";
                default -> "Publish subject curriculum and course details";
            };
            case "fees" -> switch (action) {
                case "view" -> "View fee heads, student fee accounts, and invoices";
                case "create" -> "Create fee structures, heads, and generate invoices";
                case "edit" -> "Manage fees, payment collections, and fee structures";
                case "delete" -> "Cancel unpaid invoices and remove unbilled fee items";
                case "approve" -> "Approve fee concessions, waivers, and adjustments";
                case "export" -> "Export financial summaries and fee collection reports";
                default -> "Publish fee circulars and schedule announcements";
            };
            case "finance" -> switch (action) {
                case "view" -> "View payroll, expenses, payment records, and financial summaries";
                case "create" -> "Create payroll and expense records";
                case "edit" -> "Manage payroll, expense, and finance records";
                case "delete" -> "Remove finance records where permitted";
                case "approve" -> "Approve payroll and expense payments";
                case "export" -> "Export consolidated financial reports";
                default -> "Publish finance schedules and notices";
            };
            case "users" -> switch (action) {
                case "view" -> "View administrator accounts and configured roles";
                case "create" -> "Add new portal user logins and custom roles";
                case "edit" -> "Manage user accounts, roles, and permission assignments";
                case "delete" -> "Delete user accounts and custom roles";
                case "approve" -> "Approve access and privilege elevation requests";
                case "export" -> "Export user list and role assignments";
                default -> "Publish security and access policies";
            };
            case "school" -> switch (action) {
                case "view" -> "View school profile, academic years, and school calendar";
                case "create" -> "Add academic years, terms, and calendar events";
                case "edit" -> "Manage school settings, academic terms, and calendar events";
                case "delete" -> "Delete terms and calendar events";
                case "approve" -> "Approve official annual school calendar schedules";
                case "export" -> "Export official school calendar and event lists";
                default -> "Publish official academic calendar to school portals";
            };
            case "audit" -> switch (action) {
                case "view" -> "View system audit trail and administrator action logs";
                case "create" -> "Record administrative notes in the audit log";
                case "edit" -> "Manage audit log settings and tracking policies";
                case "delete" -> "Archive or purge old audit log records";
                case "approve" -> "Approve compliance audit review reports";
                case "export" -> "Export system audit trail and compliance reports";
                default -> "Publish compliance summaries to school management";
            };
            case "dashboard" -> switch (action) {
                case "view" -> "View executive dashboard, KPI summaries, and statistics";
                case "create" -> "Create custom reports and dashboard widgets";
                case "edit" -> "Customize dashboard layout, cards, and default views";
                case "delete" -> "Delete saved custom report configurations";
                case "approve" -> "Approve periodic executive and operational summaries";
                case "export" -> "Export executive reports and summary analytics";
                default -> "Publish school-wide dashboard announcements";
            };
            default -> module + " " + action;
        };
    }

    private Role seedRole(String name, String description, String sensitivity, boolean allPermissions) {
        return roleRepository.findByName(name).orElseGet(() -> {
            Role role = new Role();
            role.setName(name);
            role.setDescription(description);
            role.setSensitivity(sensitivity);
            if (allPermissions) {
                role.setPermissions(new HashSet<>(permissionRepository.findAll()));
            }
            return roleRepository.save(role);
        });
    }

    private void grant(Role role, List<String> modules, List<String> actions) {
        Set<Permission> set = new HashSet<>(role.getPermissions());
        for (Permission p : permissionRepository.findAll()) {
            if (modules.contains(p.getModuleName()) && actions.contains(p.getActionName())) {
                set.add(p);
            }
        }
        role.setPermissions(set);
        roleRepository.save(role);
    }

    private void seedDemoUser(String username, String email, String fullName, String password, Role role,
                              Long scopeId, String scopeType) {
        if (userRepository.findByUsername(username).isPresent()) {
            return;
        }
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setStatus("ACTIVE");
        user.setRoles(Set.of(role));
        if (scopeType != null && scopeId != null) {
            UserScope scope = new UserScope();
            scope.setUser(user);
            scope.setScopeType(scopeType);
            scope.setScopeId(scopeId);
            user.getScopes().add(scope);
        }
        userRepository.save(user);
        log.info("Created demo user {} / {}", username, password);
    }

    private School seedSchool() {
        return schoolRepository.findAll().stream().findFirst().orElseGet(() -> {
            School school = new School();
            school.setName("Demo Public School");
            school.setCode("DPS001");
            school.setAddress("1 Education Road");
            school.setPhone("0000000000");
            school.setEmail("office@school.local");
            return schoolRepository.save(school);
        });
    }

    private AcademicYear seedYear(School school) {
        List<AcademicYear> years = academicYearRepository.findBySchoolId(school.getId());
        return years.stream()
                .filter(year -> year.isCurrentYear() && !"ARCHIVED".equals(year.getStatus()))
                .findFirst()
                .orElseGet(() -> years.stream()
                        .filter(year -> !"ARCHIVED".equals(year.getStatus()))
                        .findFirst()
                        .orElseGet(() -> {
                            AcademicYear year = new AcademicYear();
                            year.setSchoolId(school.getId());
                            year.setName("2026-2027");
                            year.setStartDate(LocalDate.of(2026, 4, 1));
                            year.setEndDate(LocalDate.of(2027, 3, 31));
                            year.setCurrentYear(true);
                            return academicYearRepository.save(year);
                        }));
    }

    private void seedDemoClassesAndStudents(School school, AcademicYear year) {
        String[][] assignments = {
                {"Class 1", "A", "TEST001", "Aarav", "Sharma"},
                {"Class 1", "A", "TEST002", "Ananya", "Verma"},
                {"Class 1", "A", "TEST003", "Rohan", "Gupta"},
                {"Class 1", "B", "TEST004", "Priya", "Singh"},
                {"Class 1", "B", "TEST005", "Arjun", "Kumar"},
                {"Class 6", "A", "TEST006", "Suraj", "Sharma"},
                {"Class 6", "A", "TEST007", "Rahul", "Kumar"},
                {"Class 6", "A", "TEST008", "Aman", "Singh"},
                {"Class 6", "A", "TEST009", "Neha", "Verma"},
                {"Class 6", "B", "TEST010", "Karan", "Gupta"},
                {"Class 6", "B", "TEST011", "Anjali", "Singh"},
                {"Class 6", "B", "TEST012", "Rohit", "Sharma"},
                {"Class 7", "A", "TEST013", "Aditya", "Kumar"},
                {"Class 7", "A", "TEST014", "Sneha", "Verma"},
                {"Class 7", "A", "TEST015", "Vivek", "Singh"},
                {"Class 7", "B", "TEST016", "Piyush", "Gupta"},
                {"Class 7", "B", "TEST017", "Kavya", "Sharma"},
                {"Class 7", "C", "TEST018", "Nikhil", "Kumar"},
                {"Class 7", "C", "TEST019", "Simran", "Singh"},
                {"Class 10", "A", "TEST020", "Yash", "Verma"},
                {"Class 10", "A", "TEST021", "Ishita", "Sharma"},
                {"Class 10", "A", "TEST022", "Mohit", "Kumar"},
                {"Class 10", "B", "TEST023", "Akash", "Singh"},
                {"Class 10", "B", "TEST024", "Muskan", "Gupta"},
                {"Class 12", "A", "TEST025", "Dev", "Sharma"},
                {"Class 12", "A", "TEST026", "Riya", "Kumar"},
                {"Class 12", "A", "TEST027", "Harsh", "Singh"},
                {"Class 12", "A", "TEST028", "Mehak", "Verma"},
                {"Class 12", "B", "TEST029", "Abhishek", "Gupta"},
                {"Class 12", "B", "TEST030", "Tanu", "Sharma"}
        };

        Map<String, SchoolClass> classes = new java.util.HashMap<>();
        Map<String, Section> sections = new java.util.HashMap<>();
        for (String[] assignment : assignments) {
            String className = assignment[0];
            SchoolClass schoolClass = classes.computeIfAbsent(className,
                    name -> classRepository.findBySchoolId(school.getId()).stream()
                            .filter(item -> item.getName().equalsIgnoreCase(name))
                            .findFirst()
                            .orElseGet(() -> {
                                SchoolClass created = new SchoolClass();
                                created.setSchoolId(school.getId());
                                created.setName(name);
                                created.setNumberOfClassrooms("Class 7".equals(name) ? 3 : 2);
                                return classRepository.save(created);
                            }));
            String sectionKey = schoolClass.getId() + ":" + year.getId() + ":" + assignment[1];
            Section section = sections.computeIfAbsent(sectionKey, key -> sectionRepository.findByClassId(schoolClass.getId()).stream()
                    .filter(item -> item.getAcademicYearId().equals(year.getId())
                            && item.getName().equalsIgnoreCase(assignment[1]))
                    .findFirst()
                    .orElseGet(() -> {
                        Section created = new Section();
                        created.setClassId(schoolClass.getId());
                        created.setAcademicYearId(year.getId());
                        created.setName(assignment[1]);
                        created.setStatus("ACTIVE");
                        return sectionRepository.save(created);
                    }));
            seedDemoStudent(assignment, section, schoolClass, year);
        }
        log.info("Ensured demo class workflow data for academic year {}", year.getName());
    }

    private void seedDemoStudent(String[] assignment, Section section, SchoolClass schoolClass, AcademicYear year) {
        Student student = studentRepository.findByAdmissionNumber(assignment[2]).orElse(null);
        if (student != null) {
            return;
        }

        int number = Integer.parseInt(assignment[2].substring(4));
        student = new Student();
        student.setAdmissionNumber(assignment[2]);
        student.setFirstName(assignment[3]);
        student.setLastName(assignment[4]);
        student.setDateOfBirth(LocalDate.of(2010 - (number % 10), (number % 12) + 1, (number % 27) + 1));
        student.setGender(number % 2 == 0 ? "FEMALE" : "MALE");
        student.setEmail("test" + String.format("%03d", number) + "@school.local");
        student.setPhone("987650" + String.format("%04d", number));
        student.setStatus("ACTIVE");
        student.setCurrentSectionId(section.getId());
        student = studentRepository.save(student);

        Enrollment enrollment = new Enrollment();
        enrollment.setStudentId(student.getId());
        enrollment.setSectionId(section.getId());
        enrollment.setAcademicYearId(year.getId());
        enrollment.setStatus("ENROLLED");
        enrollment.setEnrolledOn(LocalDate.now());
        enrollmentRepository.save(enrollment);

        ClassHistory history = new ClassHistory();
        history.setStudentId(student.getId());
        history.setClassId(schoolClass.getId());
        history.setSectionId(section.getId());
        history.setAcademicYearId(year.getId());
        history.setResultStatus("ONGOING");
        classHistoryRepository.save(history);

        Guardian guardian = new Guardian();
        guardian.setFullName(assignment[4] + " Parent");
        guardian.setRelationType(number % 2 == 0 ? "MOTHER" : "FATHER");
        guardian.setPhone("987650" + String.format("%04d", number + 100));
        guardian.setEmail("guardian" + String.format("%03d", number) + "@school.local");
        guardian.setAddress("Demo Residential Area");
        guardian.setOccupation("Professional");
        guardian.setStatus("ACTIVE");
        guardian = guardianRepository.save(guardian);

        StudentGuardian link = new StudentGuardian();
        link.setStudentId(student.getId());
        link.setGuardianId(guardian.getId());
        link.setRelationshipType(guardian.getRelationType());
        link.setPrimaryGuardian(true);
        link.setEmergencyContact(true);
        studentGuardianRepository.save(link);
    }

    private void ensureDemoTeacherWorkflow(AppUser teacher, School school, AcademicYear year) {
        List<Staff> linkedStaff = staffRepository.findAllByUserId(teacher.getId());
        Staff staff;
        if (linkedStaff.isEmpty()) {
            staff = new Staff();
            staff.setUserId(teacher.getId());
            staff.setEmployeeId("DEMO-TEACHER-" + teacher.getId());
            staff.setFullName(teacher.getFullName());
            staff.setEmail(teacher.getEmail());
            staff.setStatus("ACTIVE");
            staff.setStaffCategory("TEACHING");
            staff = staffRepository.save(staff);
        } else if (linkedStaff.size() == 1) {
            staff = linkedStaff.get(0);
            if ("EMP-T001".equals(staff.getEmployeeId())
                    && "Class Teacher".equalsIgnoreCase(staff.getDesignation())
                    && "ACTIVE".equals(staff.getStatus())
                    && staff.getStaffCategory() == null) {
                staff.setStaffCategory("TEACHING");
                staff = staffRepository.save(staff);
            }
        } else {
            log.warn("Skipped demo teacher assignment: teacher account is linked to multiple Staff records");
            return;
        }

        if (!"ACTIVE".equals(staff.getStatus()) || !"TEACHING".equals(staff.getStaffCategory())) {
            log.warn("Skipped demo teacher assignment: linked Staff record is not an active teaching staff member");
            return;
        }

        SchoolClass demoClass = classRepository.findBySchoolId(school.getId()).stream()
                .filter(item -> "Class 6".equalsIgnoreCase(item.getName()))
                .findFirst()
                .orElse(null);
        if (demoClass == null) {
            log.warn("Skipped demo teacher assignment: Class 6 was not found");
            return;
        }

        Section demoSection = sectionRepository.findByClassId(demoClass.getId()).stream()
                .filter(section -> year.getId().equals(section.getAcademicYearId())
                        && "A".equalsIgnoreCase(section.getName()))
                .findFirst()
                .orElse(null);
        if (demoSection == null) {
            log.warn("Skipped demo teacher assignment: Class 6 Section A was not found for {}", year.getName());
            return;
        }
        if (demoSection.getClassTeacherStaffId() != null
                && !demoSection.getClassTeacherStaffId().equals(staff.getId())) {
            log.warn("Skipped demo teacher assignment: Class 6 Section A already has a class teacher");
            return;
        }

        if (!staff.getId().equals(demoSection.getClassTeacherStaffId())) {
            demoSection.setClassTeacherStaffId(staff.getId());
            sectionRepository.save(demoSection);
        }

        Long staffId = staff.getId();
        boolean assignmentExists = teacherAssignmentRepository.findByStaffId(staffId).stream()
                .anyMatch(assignment -> staffId.equals(assignment.getStaffId())
                        && demoClass.getId().equals(assignment.getClassId())
                        && demoSection.getId().equals(assignment.getSectionId())
                        && year.getId().equals(assignment.getAcademicYearId())
                        && "CLASS_TEACHER".equals(assignment.getAssignmentType()));
        if (!assignmentExists) {
            TeacherAssignment assignment = new TeacherAssignment();
            assignment.setStaffId(staff.getId());
            assignment.setClassId(demoClass.getId());
            assignment.setSectionId(demoSection.getId());
            assignment.setAcademicYearId(year.getId());
            assignment.setAssignmentType("CLASS_TEACHER");
            assignment.setStatus("ACTIVE");
            teacherAssignmentRepository.save(assignment);
        }

        log.info("Ensured demo teacher assignment for Class 6 Section A in {}", year.getName());
    }

    private void seedDemoPromotionData(School school, AcademicYear sourceYear) {
        int sourceStartYear = sourceYear.getStartDate() == null
                ? Integer.parseInt(sourceYear.getName().substring(0, 4))
                : sourceYear.getStartDate().getYear();
        int targetStartYear = sourceStartYear + 1;
        String targetYearName = targetStartYear + "-" + (targetStartYear + 1);
        AcademicYear targetYear = academicYearRepository.findBySchoolId(school.getId()).stream()
                .filter(year -> year.getName().equalsIgnoreCase(targetYearName))
                .findFirst()
                .orElseGet(() -> {
                    AcademicYear year = new AcademicYear();
                    year.setSchoolId(school.getId());
                    year.setName(targetYearName);
                    year.setStartDate(LocalDate.of(targetStartYear, 4, 1));
                    year.setEndDate(LocalDate.of(targetStartYear + 1, 3, 31));
                    year.setCurrentYear(false);
                    year.setStatus("ACTIVE");
                    return academicYearRepository.save(year);
                });

        SchoolClass class1 = ensureDemoClass(school, "Class 1", 2);
        SchoolClass class6 = ensureDemoClass(school, "Class 6", 2);
        SchoolClass class7 = ensureDemoClass(school, "Class 7", 3);
        Section source1A = ensureDemoSection(class1, sourceYear, "A");
        Section source6A = ensureDemoSection(class6, sourceYear, "A");
        Section source6B = ensureDemoSection(class6, sourceYear, "B");
        Section target7A = ensureDemoSection(class7, targetYear, "A");
        ensureDemoSection(class7, targetYear, "B");
        Section target7C = ensureDemoSection(class7, targetYear, "C");

        ensurePromotionDemoStudent("PROMO-TEST-001", "Aarav", "Eligible", sourceYear,
                source6A, class6, null, null);
        ensurePromotionDemoStudent("PROMO-TEST-002", "Diya", "Eligible", sourceYear,
                source6B, class6, null, null);
        ensurePromotionDemoStudent("PROMO-TEST-003", "Kabir", "OtherClass", sourceYear,
                source1A, class1, null, null);
        ensurePromotionDemoStudent("PROMO-TEST-004", "Mira", "AlreadyEnrolled", sourceYear,
                source6A, class6, targetYear, target7C);

        log.info("Ensured promotion demo records: source year {}, target year {}, Class 6 -> Class 7 Section C",
                sourceYear.getName(), targetYear.getName());
    }

    private SchoolClass ensureDemoClass(School school, String name, int classroomCount) {
        return classRepository.findBySchoolId(school.getId()).stream()
                .filter(item -> item.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> {
                    SchoolClass schoolClass = new SchoolClass();
                    schoolClass.setSchoolId(school.getId());
                    schoolClass.setName(name);
                    schoolClass.setNumberOfClassrooms(classroomCount);
                    return classRepository.save(schoolClass);
                });
    }

    private Section ensureDemoSection(SchoolClass schoolClass, AcademicYear year, String name) {
        return sectionRepository.findByClassId(schoolClass.getId()).stream()
                .filter(section -> section.getAcademicYearId().equals(year.getId())
                        && section.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> {
                    Section section = new Section();
                    section.setClassId(schoolClass.getId());
                    section.setAcademicYearId(year.getId());
                    section.setName(name);
                    section.setStatus("ACTIVE");
                    return sectionRepository.save(section);
                });
    }

    private void ensurePromotionDemoStudent(String admissionNumber, String firstName, String lastName,
                                            AcademicYear sourceYear, Section sourceSection, SchoolClass sourceClass,
                                            AcademicYear existingTargetYear, Section existingTargetSection) {
        Student student = studentRepository.findByAdmissionNumber(admissionNumber).orElseGet(() -> {
            Student created = new Student();
            created.setAdmissionNumber(admissionNumber);
            created.setFirstName(firstName);
            created.setLastName(lastName);
            created.setDateOfBirth(LocalDate.of(2013, 5, 15));
            created.setGender("OTHER");
            created.setEmail(admissionNumber.toLowerCase() + "@school.local");
            created.setPhone("9000000000");
            created.setStatus("ACTIVE");
            created.setCurrentSectionId(sourceSection.getId());
            return studentRepository.save(created);
        });

        if (enrollmentRepository.findByStudentId(student.getId()).stream()
                .noneMatch(enrollment -> enrollment.getAcademicYearId().equals(sourceYear.getId()))) {
            Enrollment enrollment = new Enrollment();
            enrollment.setStudentId(student.getId());
            enrollment.setSectionId(sourceSection.getId());
            enrollment.setAcademicYearId(sourceYear.getId());
            enrollment.setStatus("ENROLLED");
            enrollment.setEnrolledOn(sourceYear.getStartDate());
            enrollmentRepository.save(enrollment);

            ClassHistory history = new ClassHistory();
            history.setStudentId(student.getId());
            history.setClassId(sourceClass.getId());
            history.setSectionId(sourceSection.getId());
            history.setAcademicYearId(sourceYear.getId());
            history.setResultStatus("ONGOING");
            classHistoryRepository.save(history);
        }

        if (existingTargetYear != null && existingTargetSection != null
                && !enrollmentRepository.existsByStudentIdAndAcademicYearId(
                        student.getId(), existingTargetYear.getId())) {
            Enrollment existingEnrollment = new Enrollment();
            existingEnrollment.setStudentId(student.getId());
            existingEnrollment.setSectionId(existingTargetSection.getId());
            existingEnrollment.setAcademicYearId(existingTargetYear.getId());
            existingEnrollment.setStatus("ENROLLED");
            existingEnrollment.setEnrolledOn(existingTargetYear.getStartDate());
            enrollmentRepository.save(existingEnrollment);
        }
    }

    private void seedDemoSubjectsAndDepartments(School school, AcademicYear academicYear) {
        Department academics = seedDepartment(school.getId(), "Academics", "ACAD", "General academic studies");
        Department languages = seedDepartment(school.getId(), "Languages", "LANG", "Language and literature studies");
        Department sciences  = seedDepartment(school.getId(), "Sciences",  "SCI",  "Natural and applied sciences");
        Department math      = seedDepartment(school.getId(), "Mathematics", "MATH", "Pure and applied mathematics");

        Subject english = seedSubject(school.getId(), languages.getId(), "English Language", "ENG-101", "Core English communication and literature");
        Subject mathematics = seedSubject(school.getId(), math.getId(), "Mathematics", "MTH-101", "Algebra, geometry, and arithmetic");
        Subject generalScience = seedSubject(school.getId(), sciences.getId(), "General Science", "SCI-101", "Physics, Chemistry, and Biology fundamentals");
        Subject socialStudies = seedSubject(school.getId(), academics.getId(), "Social Studies", "SOC-101", "History, Civics, and Geography");
        Subject compSci = seedSubject(school.getId(), sciences.getId(), "Computer Science", "CSC-101", "Information Technology and programming basics");

        List<Subject> allSubjects = List.of(english, mathematics, generalScience, socialStudies, compSci);
        List<SchoolClass> classes = classRepository.findBySchoolId(school.getId());
        for (SchoolClass sc : classes) {
            for (Subject s : allSubjects) {
                if (!subjectClassMappingRepository.existsBySubjectIdAndClassIdAndAcademicYearId(s.getId(), sc.getId(), academicYear.getId())) {
                    SubjectClassMapping mapping = new SubjectClassMapping();
                    mapping.setSubjectId(s.getId());
                    mapping.setClassId(sc.getId());
                    mapping.setAcademicYearId(academicYear.getId());
                    subjectClassMappingRepository.save(mapping);
                }
            }
        }
        log.info("Seeded standard departments, subjects, and class mappings for {}", academicYear.getName());
    }

    private Department seedDepartment(Long schoolId, String name, String code, String description) {
        return departmentRepository.findBySchoolId(schoolId).stream()
                .filter(d -> d.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> {
                    Department d = new Department();
                    d.setSchoolId(schoolId);
                    d.setName(name);
                    d.setCode(code);
                    d.setDescription(description);
                    d.setStatus("ACTIVE");
                    return departmentRepository.save(d);
                });
    }

    private Subject seedSubject(Long schoolId, Long departmentId, String name, String code, String description) {
        return subjectRepository.findBySchoolId(schoolId).stream()
                .filter(s -> s.getCode().equalsIgnoreCase(code) || s.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> {
                    Subject s = new Subject();
                    s.setSchoolId(schoolId);
                    s.setDepartmentId(departmentId);
                    s.setName(name);
                    s.setCode(code);
                    s.setDescription(description);
                    s.setStatus("ACTIVE");
                    return subjectRepository.save(s);
                });
    }
}