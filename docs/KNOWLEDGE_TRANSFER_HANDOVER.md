# 📋 Official Technical Lead Knowledge Transfer (KT) & Handover Report

**Project:** School Enterprise & Teacher Portal Integration  
**Role:** Technical Lead (Integration Specialist covering for Suraj)  
**Date of Handover:** November 19, 2026  
**Repository:** `https://github.com/deekshiulu/School-Management.git`  
**Current Git HEAD:** `12f8661`  
**Primary Integration Status:** Modules A, B, C, and D are **100% complete, unified, and verified**.

---

## 1. 🎯 Summary of Deliverables

During this sprint, the two previously decoupled repositories—**School Enterprise Administrator Portal** (React 18 / JavaScript) and **Teacher Portal** (React 19 / TypeScript)—were unified with the **Spring Boot 3.3 / Java 21 modular monolith backend**.

### Core Deliverables Completed:

1. **Module C: Attendance Integration (End-to-End)**
   - Designed and built the missing Admin Attendance REST APIs in Spring Boot.
   - Built the Administrator Bento Grid `AttendancePage.jsx` with single-day registers, date-range aggregate metrics, and real-time student filtering.
   - Resolved the critical roster bug where enrolled students were filtered out due to status mismatch (`"ENROLLED"` vs `"ACTIVE"`).
   - Integrated full bidirectional persistence between Teacher Portal marks and Admin analytics.

2. **Module D: Assessments & Reports Integration (End-to-End)**
   - Built full Admin Assessment governance: Creation, Editing, Draft vs. Published lifecycle management, and Unpublishing.
   - Implemented strict visibility rules: Drafts remain confidential to Admin; Published exams become visible to teachers strictly scoped to their assigned classes.
   - Added class-subject mapping validation and fallback handling in the Admin assessment builder.

3. **Database Seeding & Curriculum Architecture**
   - Expanded `DataSeeder.java` to seed academic departments (*Academics, Languages, Sciences, Mathematics*) and subjects (*English Language, Mathematics, General Science, Social Studies, Computer Science*).
   - Automatically seeded `subject_class_mapping` relationships for the active academic year, populating previously empty dropdowns.
   - Added `"attendance"` and `"assessments"` to system permission matrices.

4. **Multi-Tier Orchestration & Production Gateway**
   - Created `start.js`, `start.bat`, and `start.ps1` to launch all 3 tiers (Backend + Admin + Teacher) concurrently via `npm start`.
   - Created `build.js` for unified production building (compiles both React apps and builds the Spring Boot executable fat JAR in ~2 minutes).
   - Created `server.js` (Production Gateway & Reverse Proxy) serving both SPAs from port `3000` with zero CORS friction.

5. **Hardware & Port Collision Resolution**
   - Diagnosed machine-level port conflict where Steam CEF (`steamwebhelper.exe`) was claiming port `8080`.
   - Safely shifted backend to dedicated port `8085` across Spring Boot, Vite proxies, and orchestrators.
   - Added hostname sanitization to auto-correct browser typos in custom API URL storage.

---

## 2. 📁 Inventory of Modified & Created Files

### Files Created from Scratch (New Deliverables)

| Full File Path | Layer / Module | Purpose |
| :--- | :--- | :--- |
| `backend/src/main/java/com/schoolenterprise/attendance/controller/AdminAttendanceController.java` | Backend (Controller) | Admin REST controller exposing daily roster and date-range summary endpoints. Guarded by `@ExcludeTeacherRoles`. |
| `backend/src/main/java/com/schoolenterprise/attendance/service/AdminAttendanceService.java` | Backend (Service) | Business service calculating present/absent/late aggregates and daily section rosters. |
| `frontend/src/pages/AttendancePage.jsx` | Frontend (Admin) | 1,288-line production Bento Grid dashboard for class attendance registers, quick filters, and date-range analytics. |
| `frontend/src/pages/AssessmentsPage.jsx` | Frontend (Admin) | 1,834-line production exam management page supporting creation, editing, publishing, and metric tiles. |
| `frontend/src/styles/admin-workspace.css` | Frontend (Admin) | 2,378-line enterprise stylesheet containing design tokens, Bento grids, glassmorphism, and responsive tables. |
| `frontend/src/components/AdminModal.jsx` | Frontend (Shared) | Accessible modal dialog with focus management, backdrop blur, and animated enter/exit transitions. |
| `frontend/src/components/ToastStack.jsx` | Frontend (Shared) | Animated toast notification system for success, error, and info banners. |
| `frontend/src/components/AdminIcons.jsx` | Frontend (Shared) | SVG icon library ensuring consistent iconography across admin modules. |
| `frontend/src/utils/adminDates.js` | Frontend (Shared) | Date manipulation utilities (ISO formatting, preset ranges: 7d, 30d, month-to-date). |
| `start.js` | Infrastructure | Cross-platform Node.js multi-process runner with colored logging and process cleanup. |
| `start.bat` & `start.ps1` | Infrastructure | Windows batch and PowerShell launchers for one-click development startup. |
| `build.js` | Infrastructure | Unified production build script (Vite builds + Maven package). |
| `server.js` | Infrastructure | Node.js production reverse proxy gateway serving Admin at `/` and Teacher at `/teacher/`. |
| `package.json` & `package-lock.json` (Root) | Infrastructure | Root npm manifest managing repository-level scripts. |

---

### Existing Files Modified & Enhancements Made

| Full File Path | Layer | Specific Changes Made |
| :--- | :--- | :--- |
| `backend/.../assessment/controller/AdminAssessmentController.java` | Backend | Added `PUT /{id}` (edit assessment), `PUT /{id}/publish`, and `PUT /{id}/unpublish`. Corrected `@RequirePermission` action from `"update"` to `"edit"` and `"publish"`. |
| `backend/.../assessment/service/AssessmentService.java` | Backend | Added `update(id, request)`, `publish(id)`, and `unpublish(id)` methods with audit logging and class/subject validation. |
| `backend/.../assessment/repository/AssessmentRepository.java` | Backend | Added query methods for status-based filtering and scoped queries. |
| `backend/.../common/config/DataSeeder.java` | Backend | Added `"attendance"` and `"assessments"` to `MODULES`. Implemented `seedDemoSubjectsAndDepartments()` to seed 4 departments, 5 subjects, and `subject_class_mapping`. |
| `backend/src/main/resources/application-dev.properties` | Backend | Configured `server.port=8085` to avoid Steam port collision. |
| `frontend/src/routes/AppRoutes.jsx` | Frontend | Registered routes `/attendance` and `/assessments`. Enforced `TeacherPortalNotice` redirect for teacher tokens. |
| `frontend/src/layout/Layout.jsx` | Frontend | Added "Attendance" and "Assessments" navigation links under the Administration sidebar group. |
| `frontend/src/styles.css` | Frontend | Added custom 5px dark scrollbars for `.sidebar nav` and global thin scrollbars across all table containers. |
| `frontend/src/api/client.js` | Frontend | Added auto-correction for URL typos (`locslhost` $\rightarrow$ `localhost`) and updated GitHub Pages default port to `8085`. |
| `frontend/src/pages/LoginPage.jsx` | Frontend | Updated default backend dev proxy label to `localhost:8085`. |
| `frontend/vite.config.js` | Frontend | Pinned strict port `5173`. Updated `/api` proxy target to `http://localhost:8085`. |
| `frontend/package.json` | Frontend | Added `lucide-react` dependency for dashboard iconography. |
| `School-Teacher-Portal-main/.../vite.config.ts` | Frontend | Pinned strict port `5174`. Updated `/api` proxy target to `http://localhost:8085`. |
| `School-Teacher-Portal-main/.../tsconfig.app.json` | Frontend | Added `"composite": true` to resolve TypeScript project reference build errors. |
| `School-Teacher-Portal-main/.../tsconfig.node.json` | Frontend | Updated module resolution to `"bundler"` and removed unsupported `"erasableSyntaxOnly"` flag. |
| `.gitignore` | Infrastructure | Ignored `data/` (local H2 database files), `node_modules/`, and build artifacts. |

---

## 3. ⚙️ Backend (Spring Boot / Java) Technical Details

### Endpoints Created & Updated

#### Attendance Module (`com.schoolenterprise.attendance.controller.AdminAttendanceController`)
- **`GET /api/admin/attendance/summary`**
  - **Security:** `@ExcludeTeacherRoles`, `@RequirePermission(module = "students", action = "view")`
  - **Query Parameters:** `Long sectionId`, `LocalDate fromDate`, `LocalDate toDate`
  - **Output:** Returns aggregate counts: `{ sectionId, fromDate, toDate, present, absent, late, total }`.
- **`GET /api/admin/attendance/daily`**
  - **Security:** `@ExcludeTeacherRoles`, `@RequirePermission(module = "students", action = "view")`
  - **Query Parameters:** `Long sectionId`, `LocalDate date`
  - **Output:** Returns student roster list: `[{ studentId, sectionId, attendanceDate, status, markedByStaffId }]`.

#### Assessment Module (`com.schoolenterprise.assessment.controller.AdminAssessmentController`)
- **`POST /api/admin/assessments`**
  - **Security:** `@ExcludeTeacherRoles`, `@RequirePermission(module = "assessments", action = "create")`
  - **Payload:** `AssessmentRequest` (validated with `@Valid`)
- **`PUT /api/admin/assessments/{id}`**
  - **Security:** `@ExcludeTeacherRoles`, `@RequirePermission(module = "assessments", action = "edit")`
  - **Payload:** `AssessmentRequest` (updates existing exam metadata, marks, date)
- **`GET /api/admin/assessments`**
  - **Security:** `@RequirePermission(module = "assessments", action = "view")`
  - **Query Parameters:** `classId`, `sectionId`, `subjectId`, `academicYearId`, `status`
- **`GET /api/admin/assessments/{id}`**
  - **Security:** `@RequirePermission(module = "assessments", action = "view")`
- **`PUT /api/admin/assessments/{id}/publish`**
  - **Security:** `@RequirePermission(module = "assessments", action = "publish")`
  - **Behavior:** Transitions status `DRAFT` $\rightarrow$ `PUBLISHED`.
- **`PUT /api/admin/assessments/{id}/unpublish`**
  - **Security:** `@RequirePermission(module = "assessments", action = "publish")`
  - **Behavior:** Transitions status `PUBLISHED` $\rightarrow$ `DRAFT`.

### Data Transfer Object (DTO) Validations

In `com.schoolenterprise.assessment.dto.AssessmentRequest`:
```java
@NotBlank(message = "Title is required")
private String title;

@NotNull(message = "Subject is required")
private Long subjectId;

@NotNull(message = "Class is required")
private Long classId;

private Long sectionId; // Optional: null means all sections of that class

@NotNull(message = "Academic year is required")
private Long academicYearId;

@NotNull(message = "Assessment date is required")
private LocalDate assessmentDate;

@NotNull(message = "Max marks is required")
@Positive(message = "Max marks must be greater than zero")
private Integer maxMarks;

@Pattern(regexp = "DRAFT|PUBLISHED", message = "Status must be DRAFT or PUBLISHED")
private String status;
```

---

## 4. 💻 Frontend (React / JSX) Technical Details

### `AttendancePage.jsx` Architecture
- **State Management:**
  - `classId`, `sectionId`: Cascading dropdowns dynamically populated from `/api/classes` and `/api/sections`.
  - `mode`: Toggle between `"daily"` (single-day roster) and `"range"` (multi-day analytics).
  - `statusFilter`: Quick-filter chips (`ALL`, `PRESENT`, `ABSENT`, `LATE`, `UNMARKED`).
  - `query`: Real-time text search filtering across student names and admission numbers.
- **Roster Alignment Resolution:**
  - Filter logic was updated to match backend `SectionStudentResponse`:
    ```javascript
    const activeStudents = (Array.isArray(data) ? data : []).filter((student) => {
      const status = String(student.status || "").toUpperCase();
      const enrollmentStatus = String(student.enrollmentStatus || "").toUpperCase();
      if (status && status !== "ACTIVE") return false;
      if (!enrollmentStatus) return true;
      return enrollmentStatus === "ENROLLED" || enrollmentStatus === "ACTIVE";
    });
    ```
  - When no marks exist for a selected date, students are rendered with status `UNMARKED` instead of displaying an empty error card, accompanied by an informative banner.

### `AssessmentsPage.jsx` Architecture
- **Metrics Ribbon:** Real-time calculated counters for *Active Exams*, *Published Exams*, and *Drafts Pending*.
- **Lifecycle Actions:** Direct inline action buttons for *Publish*, *Unpublish*, *Edit*, and *View Details* with animated modal dialogs.
- **Subject Fallback:** If a class has no subjects mapped in `subject_class_mapping`, the dropdown falls back gracefully to global active subjects and provides a direct hyperlink to `/subjects`.

### UI/UX & Micro-Interactions (`admin-workspace.css` & `styles.css`)
- **Bento Grid Cards:** Modern card elevation with subtle borders (`border-slate-200/60`) and hover lift (`hover:-translate-y-1 hover:shadow-lg`).
- **Tactile Micro-Animations:** Active button compress (`active:scale-95 transition-transform duration-150`).
- **Windows Scrollbar Polish:** Implemented sleek 5px dark translucent scrollbars (`scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.2) transparent;`) replacing the native gray 17px Windows bar.

---

## 5. 🛠️ Architectural & Environment Resolutions

### The React 18 vs React 19 Conflict Resolution
- **The Core Issue:** Attempting to merge both frontends into a single `package.json` failed because:
  - Admin Portal relies on **React 18** and legacy component libraries.
  - Teacher Portal relies on **React 19** and newer Vite/TypeScript toolchains.
  - Merging caused fatal npm dependency conflicts (`ERESOLVE unable to resolve dependency tree`).
- **The Solution Implemented:**
  1. Maintained independent root folders: `frontend/` and `School-Teacher-Portal-main/School-Teacher-Portal-main/`.
  2. Pinned strict Vite ports: Admin on `5173` (`strictPort: true`), Teacher on `5174` (`strictPort: true`).
  3. Added unified orchestrator `start.js` to run both along with Spring Boot using concurrent child processes.
  4. In `backend/src/main/java/com/schoolenterprise/common/config/WebConfig.java`, CORS origins allow both:
     ```java
     .allowedOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
     ```

### Port Collision Resolution (Steam CEF vs Backend)
- **The Conflict:** Steam CEF (`steamwebhelper.exe`) on Windows was running in the background with `--remote-debugging-port=8080`, silently hijacking port 8080.
- **The Solution:**
  - Shifted Spring Boot to port `8085`.
  - Updated Vite proxy in `frontend/vite.config.js` and `vite.config.ts` to `http://localhost:8085`.
  - Added URL sanitization in `client.js` to catch any mistyped hostnames (`locslhost` $\rightarrow$ `localhost`).

---

## 6. 🚀 Remaining Tasks & Recommendations for Suraj

### ✅ What is 100% Finished and Verified
- [x] **Module A (Login & Security):** Role-based routing, JWT session invalidation on logout, 403 Forbidden handling on teacher tokens accessing admin routes.
- [x] **Module B (Teacher Assignments & Scope):** Admin assignment workflow, teacher scope resolution, multi-tenant class isolation.
- [x] **Module C (Attendance Integration):** Teacher daily recording, Admin real-time aggregate register and date-range views.
- [x] **Module D (Assessments & Reports):** Admin exam CRUD, draft/published visibility rules, teacher-scoped exam views.
- [x] **Unified Scripts:** `npm start` (development), `node build.js` (production build), and `node server.js` (production gateway).

### 📋 Recommended Next Steps for Suraj
1. **Module E Manual Regression Execution:**
   - Run through the checklists in the [Master Feature Presentation Runbook](file:///C:/Users/DEEKSHITULU/.gemini/antigravity/brain/57d6a8e4-aa39-44b6-9c29-11cf6b742af0/master_feature_presentation_runbook.md) (Students, Staff, Classes, and Fee Accounts) to ensure no regressions occurred in existing admin workflows.
2. **Production Database Profile (MySQL + Flyway):**
   - The current dev profile uses embedded H2 (`./data/school-enterprise.mv.db`).
   - When deploying to production with MySQL, verify that Flyway migrations (`V1__` through `V20__`) execute cleanly against a clean MySQL 8.x schema.
3. **Optional Code Cleanup:**
   - The redundant outer folder `School-Teacher-Portal-main/School-Teacher-Portal-main/` can eventually be flattened to `teacher-portal/` in a future refactor sprint when git branches are merged.

---

*Report prepared and submitted by Technical Lead.*  
*All commits pushed and synced to `https://github.com/deekshiulu/School-Management.git`.*
