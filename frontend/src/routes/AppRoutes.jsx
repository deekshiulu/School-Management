import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Layout from "../layout/Layout.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import ForgotPasswordPage from "../pages/ForgotPasswordPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import SchoolPage from "../pages/SchoolPage.jsx";
import YearsPage from "../pages/YearsPage.jsx";
import ClassesPage from "../pages/ClassesPage.jsx";
import TimetablePage from "../pages/TimetablePage.jsx";
import ClassDetailsPage from "../pages/ClassDetailsPage.jsx";
import SectionDetailsPage from "../pages/SectionDetailsPage.jsx";
import SubjectsPage from "../pages/SubjectsPage.jsx";
import UsersPage from "../pages/UsersPage.jsx";
import RolesPage from "../pages/RolesPage.jsx";
import StudentsPage from "../pages/StudentsPage.jsx";
import StudentProfilePage from "../pages/StudentProfilePage.jsx";
import StudentPromotionPage from "../pages/StudentPromotionPage.jsx";
import GuardiansPage from "../pages/GuardiansPage.jsx";
import GuardianProfilePage from "../pages/GuardianProfilePage.jsx";
import StaffPage from "../pages/StaffPage.jsx";
import TeacherProfilePage from "../pages/TeacherProfilePage.jsx";
import AssignmentsPage from "../pages/AssignmentsPage.jsx";
import FeeHeadsPage from "../pages/FeeHeadsPage.jsx";
import FeeStructuresPage from "../pages/FeeStructuresPage.jsx";
import FeeAccountsPage from "../pages/FeeAccountsPage.jsx";
import InvoicesPage from "../pages/InvoicesPage.jsx";
import ReportsPage from "../pages/ReportsPage.jsx";
import PayrollPage from "../pages/PayrollPage.jsx";
import ExpensesPage from "../pages/ExpensesPage.jsx";
import FinancialReportsPage from "../pages/FinancialReportsPage.jsx";
import AuditPage from "../pages/AuditPage.jsx";
import AttendancePage from "../pages/AttendancePage.jsx";
import AssessmentsPage from "../pages/AssessmentsPage.jsx";

function ProtectedLayout() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const roles = Array.isArray(user.roles)
    ? user.roles.map((role) => typeof role === "string" ? role : role.name)
    : [];
  const teacherOnly = !roles.includes("ADMIN")
    && roles.some((role) => role === "CLASS_TEACHER" || role === "SUBJECT_TEACHER");

  return teacherOnly ? <TeacherPortalNotice onSignOut={logout} /> : <Layout />;
}

function TeacherPortalNotice({ onSignOut }) {
  return (
    <main style={{ maxWidth: 680, margin: "10vh auto", padding: "2rem" }}>
      <h1>Use the Teacher Portal</h1>
      <p>
        This is the School Administrator Portal. Your account has a teacher role, so it
        cannot access administrator pages. Open the Teacher Portal frontend and sign in
        there to view your classes, assignments, and timetable.
      </p>
      <p>
        To run it locally, start the frontend in
        {" "}School-Teacher-Portal-main/School-Teacher-Portal-main with <code>npm run dev</code>,
        then open the URL shown in the terminal.
      </p>
      <button type="button" onClick={onSignOut}>Sign out</button>
    </main>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="school" element={<SchoolPage />} />
        <Route path="years" element={<YearsPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="classes/:classId" element={<ClassDetailsPage />} />
        <Route path="classes/:classId/sections/:sectionId" element={<SectionDetailsPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:id" element={<StudentProfilePage />} />
        <Route path="student-promotion" element={<StudentPromotionPage />} />
        <Route path="guardians" element={<GuardiansPage />} />
        <Route path="guardians/:id" element={<GuardianProfilePage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="staff/:id" element={<TeacherProfilePage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="fee-heads" element={<FeeHeadsPage />} />
        <Route path="fee-structures" element={<FeeStructuresPage />} />
        <Route path="fee-accounts" element={<FeeAccountsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="finance" element={<FinancialReportsPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="financial-reports" element={<FinancialReportsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="assessments" element={<AssessmentsPage />} />
      </Route>
    </Routes>
  );
}
