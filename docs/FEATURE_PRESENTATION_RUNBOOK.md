# 🏫 Master Feature Presentation Runbook & Live Demo Script

**Project:** School Enterprise & Teacher Portal Unified Platform  
**Target Environment:** Local Full-Stack (Spring Boot Backend: `8080`, Admin Portal: `5173`, Teacher Portal: `5174`, Unified Production Gateway: `3000`)

---

## ⚡ Pre-Presentation Quick Reference

| Role | Username / Email | Password | Primary URL | Dashboard Scope |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` *(or `admin@school.local`)* | `Admin@123` | `http://localhost:5173/school-managemnet/#/login` | Full School Management, All Classes, Finance, Audit |
| **Class Teacher** | `teacher` *(or `teacher@school.local`)* | `Teacher@123` | `http://localhost:5174/School-Teacher-Portal/#/login` | Scoped strictly to assigned Classes & Sections (Class 6 · A) |
| **Accountant** | `accountant` | `Accountant@123` | `http://localhost:5173/school-managemnet/#/login` | Financials, Fee Accounts, Invoices, Payroll |

> [!TIP]
> **Recommended Browser Setup for Live Demo:**
> Open two side-by-side browser windows:
> - **Left Window:** Admin Portal (`http://localhost:5173/school-managemnet/`)
> - **Right Window (Incognito/Private):** Teacher Portal (`http://localhost:5174/School-Teacher-Portal/`)
> This allows you to show real-time synchronization (e.g. Admin publishes an exam or revokes a class, and the Teacher's screen updates immediately upon refresh).

---

## 📑 Module A: Login & Security

### Checklist Item A.1: Log in with Admin credentials and verify Admin dashboard opens
- **Action:**
  1. Open `http://localhost:5173/school-managemnet/#/login`.
  2. Enter Username: `admin`, Password: `Admin@123`.
  3. Click **Sign In**.
- **Expected Result:**
  - Authenticates via `POST /api/auth/login`.
  - JWT token and session ID are stored in browser storage.
  - Redirects to Admin Dashboard (`/#/`) showing executive KPI cards: Total Students, Staff, Active Classes, Fee Collection, and the comprehensive dark navigation sidebar.
- **Presenter Talking Point:**
  > *"Authentication is powered by Spring Security with stateless HS512 JWTs coupled to server-side login sessions. The Admin dashboard grants school-wide administrative visibility across all modules."*

---

### Checklist Item A.2: Log in with Teacher credentials and verify Teacher dashboard opens
- **Action:**
  1. Open `http://localhost:5174/School-Teacher-Portal/#/login`.
  2. Enter Username: `teacher`, Password: `Teacher@123`.
  3. Click **Sign In**.
- **Expected Result:**
  - Authenticates and redirects to Teacher Dashboard (`/#/app`).
  - Displays greeting: "Welcome, Class Teacher" with quick actions for My Classes, Daily Attendance, and Teaching Assignments.
  - Notice that administrative menus (Users, Roles, Fee Structures, School Settings) are absent.
- **Presenter Talking Point:**
  > *"The Teacher Portal is designed specifically for academic faculty. It consumes the same unified Spring Boot API, but queries are automatically scoped to the logged-in teacher's active assignments."*

---

### Checklist Item A.3: Attempt to access an Admin-only URL/API using Teacher credentials (403 Forbidden)
- **Action (UI Demonstration):**
  1. In the Admin Portal window (`http://localhost:5173/school-managemnet/#/login`), try logging in with `teacher` / `Teacher@123`.
- **Expected Result (UI):**
  - The Admin portal intercepts the role and displays the `TeacherPortalNotice` screen:
    `"Use the Teacher Portal: This is the School Administrator Portal. Your account has a teacher role, so it cannot access administrator pages."`
- **Action (Backend Proof / Terminal API Demonstration):**
  Run this command in PowerShell to prove the backend rejects teachers attempting admin endpoints:
  ```powershell
  $body = @{ username = "teacher"; password = "Teacher@123" } | ConvertTo-Json
  $tAuth = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body $body -ContentType "application/json"
  $headers = @{ Authorization = "Bearer " + $tAuth.data.token }

  # Attempt 1: Call Admin-only Attendance endpoint
  Invoke-RestMethod -Uri "http://localhost:8080/api/admin/attendance/daily?sectionId=1&date=2026-10-30" -Headers $headers
  ```
- **Expected Result (API):**
  - HTTP `403 Forbidden` with payload:
    ```json
    { "status": 403, "message": "Use the dedicated teacher portal endpoints" }
    ```
- **Presenter Talking Point:**
  > *"Client-side hiding is just good UX; real security happens on the server. The `@ExcludeTeacherRoles` annotation on `AdminAttendanceController` and `AdminAssessmentController` guarantees that any teacher token attempting admin endpoints is blocked with a 403 Forbidden."*

---

### Checklist Item A.4: After logout, attempt to access protected pages/APIs
- **Action (UI):**
  1. In the Admin Portal, click the user menu top right -> **Sign out**.
  2. Press browser **Back** button or directly navigate to `http://localhost:5173/school-managemnet/#/students`.
- **Expected Result (UI):**
  - Protected layout immediately bounces the unauthenticated user back to `/#/login`.
- **Action (Backend Proof / Terminal API Demonstration):**
  ```powershell
  # Login as admin to get token
  $body = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
  $aAuth = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body $body -ContentType "application/json"
  $adminToken = $aAuth.data.token
  $authHeaders = @{ Authorization = "Bearer " + $adminToken }

  # Logout to invalidate session
  Invoke-RestMethod -Uri "http://localhost:8080/api/auth/logout" -Method POST -Headers $authHeaders

  # Try accessing protected endpoint with the logged-out token
  Invoke-RestMethod -Uri "http://localhost:8080/api/students" -Method GET -Headers $authHeaders
  ```
- **Expected Result (API):**
  - HTTP `401 Unauthorized` with message: `"Please login"`.
- **Presenter Talking Point:**
  > *"Unlike naive JWT setups where tokens remain valid until expiration, our system maintains a server-side `login_session` table. On logout, the token ID is flagged as revoked, rendering stolen or re-used tokens useless immediately."*

---

## 👨‍🏫 Module B: Teacher Assignments & Data Scope

### Checklist Item B.1: Assign a class, section, and subject through Admin account
- **Action:**
  1. In Admin Portal, navigate to **People** -> **Teacher assignments** (`/#/assignments`).
  2. Click **Add teacher assignment** (or use the form at top).
  3. Fill out the assignment:
     - **Staff Member:** Select `Class Teacher (EMP-T001)`
     - **Assignment Type:** `CLASS_TEACHER` or `SUBJECT_TEACHER`
     - **Class:** `Class 1`
     - **Section:** `A`
     - **Subject:** `Mathematics (MTH-101)`
     - **Academic Year:** `2026-2027`
  4. Click **Save assignment**.
- **Expected Result:**
  - Success alert: "Teacher assignment saved".
  - The table lists the new active assignment linking Teacher `EMP-T001` to `Class 1 · Section A · Mathematics`.

---

### Checklist Item B.2: Log in as teacher and verify assigned class & subject are visible
- **Action:**
  1. Open Teacher Portal (`http://localhost:5174/School-Teacher-Portal/#/login`).
  2. Login with `teacher` / `Teacher@123`.
  3. Click **Classes** in the navbar (`/#/app/classes`).
  4. Click **Subjects** in the navbar (`/#/app/subjects`).
- **Expected Result:**
  - Under Classes: Both `Class 6` (demo default) and `Class 1` (newly assigned) are listed.
  - Under Subjects: `Mathematics` is listed with course code `MTH-101`.
- **Presenter Talking Point:**
  > *"The Teacher Portal calls `/api/teacher/classes` and `/api/teacher/subjects`. The backend `TeacherScopeResolver` inspects active records in `teacher_assignment` and dynamically builds the authorized scope."*

---

### Checklist Item B.3: Attempt to access data for an unassigned class/section (Access Denied)
- **Action (UI):**
  1. In the Teacher Portal address bar, manually change the URL to an unassigned class, e.g.:
     `http://localhost:5174/School-Teacher-Portal/#/app/classes/99` or a class ID the teacher does not teach (e.g. `Class 10`).
- **Expected Result (UI):**
  - An error state is rendered: `"Class not found or access denied"`.
- **Action (Backend Proof / API):**
  ```powershell
  # Attempt to query Class 10 roster using teacher token
  Invoke-RestMethod -Uri "http://localhost:8080/api/teacher/classes/10/students" -Headers $headers
  ```
- **Expected Result (API):**
  - Returns `403 Forbidden` with `"This class is outside your assigned scope"`.
- **Presenter Talking Point:**
  > *"Every teacher data endpoint executes `permissionService.assertClass(classId)`. Even if an attacker manipulates URLs or client state, the backend enforces multi-tenant class isolation at the database query level."*

---

### Checklist Item B.4: Remove/deactivate assignment and verify access is revoked
- **Action:**
  1. In Admin Portal, return to **Teacher assignments** (`/#/assignments`).
  2. Find the assignment for `Class 1` created in B.1.
  3. Click the status button to toggle to **Inactive** (or click **Delete**).
  4. In the Teacher Portal, refresh the **Classes** page (`/#/app/classes`).
- **Expected Result:**
  - `Class 1` disappears from the teacher's list immediately.
  - Attempting to access `Class 1` now triggers `403 Forbidden`.

---

## 📅 Module C: Attendance Integration

### Checklist Item C.1: Select assigned class, mark, and save attendance as Teacher
- **Action:**
  1. In Teacher Portal, click **Daily Attendance** (`/#/app/attendance`).
  2. Select:
     - **Class:** `Class 6`
     - **Section:** `Section A`
     - **Date:** Today's date (or pick a test date, e.g. `2026-11-13`)
  3. In the student list:
     - Mark Student 1: **Present** (Green)
     - Mark Student 2: **Absent** (Red)
     - Mark Student 3: **Late** (Yellow)
  4. Click **Save Attendance**.
- **Expected Result:**
  - Toast notification: `"Attendance recorded successfully"`.
  - Daily summary counters update to reflect: `Present: 1, Absent: 1, Late: 1`.
- **Presenter Talking Point:**
  > *"The teacher interface persists attendance into the unified `attendance_record` table via `POST /api/teacher/attendance`. Each row records studentId, sectionId, date, status, and the staff ID of the teacher who took attendance."*

---

### Checklist Item C.2: Refresh the page and verify saved attendance persists
- **Action:**
  1. In the Teacher Portal attendance screen, press `F5` / browser Refresh.
  2. Select `Class 6`, `Section A`, and the same date.
- **Expected Result:**
  - The exact marks (Present, Absent, Late) reload from the database with timestamp and confirmation.

---

### Checklist Item C.3: Verify attendance report on Admin side
- **Action:**
  1. Switch to the Admin Portal window.
  2. Navigate to **Administration** -> **Attendance** (`/#/attendance`).
  3. Select:
     - **Class:** `Class 6`
     - **Section:** `A`
     - **Register Date:** The same date marked in C.1.
- **Expected Result:**
  - Top Bento Grid statistics update in real-time:
    - Total Students: `4`
    - Present: `1`
    - Absent: `1`
    - Late: `1`
    - Attendance Rate: `67%`
  - The table lists the enrolled students with their respective Present, Absent, and Late badges.
  - Switch View Mode to **Range** toggle:
    - Pick a date range covering the entry (e.g. Month to Date).
    - Aggregate donut chart and daily average progress bars appear instantly!
- **Presenter Talking Point:**
  > *"Notice the seamless integration between the portals: attendance saved by teachers in the Teacher Portal is immediately aggregated and visualized in the Admin Bento Grid dashboard without any data delay or manual sync."*

---

### Checklist Item C.4: Attempt to save attendance as an unauthorized teacher (Rejected)
- **Action (Terminal API Demonstration):**
  ```powershell
  # Attempt to submit attendance for Section 99 or an unassigned section as Teacher
  $badAttendance = @{
      sectionId = 99;
      attendanceDate = "2026-11-13";
      records = @(
          @{ studentId = 1; status = "PRESENT" }
      )
  } | ConvertTo-Json

  Invoke-RestMethod -Uri "http://localhost:8080/api/teacher/attendance" -Method POST -Headers $headers -Body $badAttendance -ContentType "application/json"
  ```
- **Expected Result:**
  - HTTP `403 Forbidden` / `400 Bad Request`:
    `"This class is outside your assigned scope"` or `"Section does not exist"`.

---

## 📝 Module D: Assessments & Reports

### Checklist Item D.1: Create assessment as Admin; verify Published vs. Draft behavior
- **Action:**
  1. In Admin Portal, navigate to **Administration** -> **Assessments** (`/#/assessments`).
  2. Click **Create assessment**.
  3. Fill out the modal:
     - **Title:** `Final Term Mathematics Exam`
     - **Class:** `Class 6`
     - **Section:** `All sections` (or `Section A`)
     - **Subject:** `Mathematics` *(notice subject dropdown is automatically populated from our seeded database!)*
     - **Assessment Date:** Future date (e.g. `2026-12-05`)
     - **Max Marks:** `100`
     - **Status:** Select **DRAFT**
  4. Click **Create assessment**.
- **Expected Result (Admin Side):**
  - Assessment appears in grid/table with yellow badge: `DRAFT`.
  - Top Metric Tile increments: `Drafts pending: +1`.
- **Action (Teacher Side Check):**
  1. Open Teacher Portal -> **Assessments** (`/#/app/assessments`).
- **Expected Result (Teacher Side):**
  - The draft exam is **NOT visible** to teachers.
- **Action (Publishing):**
  1. In Admin Portal, click **Publish** on the assessment card.
  2. Confirm publication. Status badge turns green: `PUBLISHED`.
  3. In Teacher Portal, refresh the Assessments page.
- **Expected Result (Teacher Side):**
  - `Final Term Mathematics Exam` now appears on the Teacher's screen with a green `PUBLISHED` badge, ready for grade entry!
- **Action (Unpublishing):**
  1. In Admin Portal, click **Unpublish**.
  2. Refresh Teacher Portal: the exam vanishes from the teacher view.
- **Presenter Talking Point:**
  > *"Administrators retain full governance over exam publication. Drafts remain strictly confidential to school leadership until published, at which point teachers gain access to enter grades."*

---

### Checklist Item D.2: Teacher class scope in assessments
- **Action:**
  1. In Admin Portal, create a published assessment for a class the teacher *does not teach* (e.g. `Class 10`).
  2. In Teacher Portal, check `/app/assessments`.
- **Expected Result:**
  - Only `Class 6` assessments appear; `Class 10` is excluded by the server query `findByClassIdInAndStatus(assignedClassIds, 'PUBLISHED')`.

---

### Checklist Item D.3: Teacher Reports & Attendance Aggregates
- **Action:**
  1. In Teacher Portal, click **Reports** (`/#/app/reports`).
  2. Select `Class 6` and view summary cards.
- **Expected Result:**
  - Displays attendance percentages, student count, and assessment averages strictly scoped to Class 6.

---

### Checklist Item D.4: Negative testing: invalid dates, unmapped subjects
- **Action:**
  1. In Admin Portal -> **Create assessment**.
  2. Attempt to input negative maximum marks (e.g. `-10`) or leave subject blank.
- **Expected Result:**
  - Form validation prevents submission with red inline field error: `"Max marks must be greater than 0"`.
  - In backend, Bean Validation (`@Positive`, `@NotNull`) rejects invalid payloads with `400 Bad Request`.

---

## 🛡️ Module E: Existing Admin Regression

### Checklist Item E.1: Students List, Create, and Edit Workflows
- **Action:**
  1. Navigate to **People** -> **Students** (`/#/students`).
  2. Verify:
     - Search bar filters students by name or admission number in real-time.
     - Click **Admit student**: modal opens with inputs for personal info, admission number, class, section, and guardian linkage.
     - Click any student row to open **Student Profile** (`/#/students/:id`).
     - Edit phone/email and click **Save**: updates persist.

---

### Checklist Item E.2: Staff List, Create, and Edit Workflows
- **Action:**
  1. Navigate to **People** -> **Staff** (`/#/staff`).
  2. Verify:
     - Staff directory loads teaching and administrative employees.
     - Click **Add staff**: creates a new employee record.
     - Click an employee to view details and edit employment status.

---

### Checklist Item E.3: Classes, Sections, Departments & Subjects
- **Action:**
  1. Navigate to **School setup** -> **Classes & sections** (`/#/classes`):
     - Displays classes (`Class 1` through `Class 6`).
     - Shows sections with capacity and assigned class teachers.
  2. Navigate to **School setup** -> **Departments & subjects** (`/#/subjects`):
     - Displays departments: `Academics`, `Languages`, `Sciences`, `Mathematics`.
     - Displays subjects: `English Language`, `Mathematics`, `General Science`, `Social Studies`, `Computer Science`.
     - Displays class curriculum mappings for academic year 2026-2027.

---

### Checklist Item E.4: Fee Structures & Student Fee Accounts
- **Action:**
  1. Navigate to **Finance** -> **Fee heads** (`/#/fee-heads`): Lists Tuition, Lab, Sports heads.
  2. Navigate to **Finance** -> **Fee structures** (`/#/fee-structures`): Shows fee breakdowns per class.
  3. Navigate to **Finance** -> **Student fee accounts** (`/#/fee-accounts`): Shows student balance ledger, total billed, paid, and outstanding dues.
  4. Navigate to **Finance** -> **Invoices & payments** (`/#/invoices`): Lists generated invoices and payment receipts.

---

### Checklist Item E.5: Admin Dashboard & Sidebar Navigation Polish
- **Action:**
  1. Navigate to **Dashboard** (`/#/`).
  2. Verify:
     - Summary counters for Students, Staff, Classes, and Fees.
     - Sidebar collapsible menus: School setup, People, Users & access, Finance, Administration.
     - Scrollbar: Verify sleek custom 5px dark scrollbar without native gray Windows bars.
     - Open browser Developer Tools (`F12`) -> **Console**: verify zero uncaught runtime errors.

---

## 🚀 How to Run the Entire Application for Presentation

You can launch all 3 tiers with a single terminal command from the project root:

```bash
# Start Spring Boot (8080) + Admin Portal (5173) + Teacher Portal (5174)
npm start
```

Or for deployment / production mode:
```bash
# Build all 3 projects
node build.js

# Serve unified gateway at http://localhost:3000
node server.js
```
- Admin Portal: `http://localhost:3000/`
- Teacher Portal: `http://localhost:3000/teacher/`
- API proxy: `http://localhost:3000/api/*`
