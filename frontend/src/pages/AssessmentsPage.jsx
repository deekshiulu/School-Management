import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import AdminModal from "../components/AdminModal.jsx";
import ToastStack, { useToasts } from "../components/ToastStack.jsx";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  Filter,
  GraduationCap,
  Info,
  Layers,
  LayoutGrid,
  List,
  MoreVertical,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  Undo2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { formatDate, relativeExamLabel, todayISO } from "../utils/adminDates.js";
import "../styles/admin-workspace.css";

const EMPTY_FORM = {
  title: "",
  classId: "",
  sectionId: "",
  subjectId: "",
  academicYearId: "",
  assessmentDate: "",
  maxMarks: "",
  status: "DRAFT",
};

const EMPTY_FILTERS = {
  query: "",
  classId: "",
  subjectId: "",
  yearId: "",
  status: "ALL",
};

const FIELD_IDS = {
  title: "assessment-title",
  classId: "assessment-class",
  sectionId: "assessment-section",
  subjectId: "assessment-subject",
  academicYearId: "assessment-year",
  assessmentDate: "assessment-date",
  maxMarks: "assessment-marks",
};

function statusTone(status) {
  return String(status || "").toUpperCase() === "PUBLISHED" ? "published" : "draft";
}

function statusLabel(status) {
  return String(status || "DRAFT").toUpperCase();
}

function formatMarks(value) {
  const marks = Number(value);
  if (!Number.isFinite(marks)) return "—";
  return marks.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((Number(value || 0) / Number(total)) * 100);
}

function PageHero({ yearLabel, busy, onCreate, onRefresh, createDisabled }) {
  return (
    <header className="aw-hero">
      <div className="aw-hero__main">
        <nav className="aw-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={12} className="aw-breadcrumb-chevron" />
          <span>Administration</span>
          <ChevronRight size={12} className="aw-breadcrumb-chevron" />
          <span aria-current="page">Assessments</span>
        </nav>
        <span className="aw-eyebrow">Plan, draft &amp; publish</span>
        <h1>
          Assessments
          <span className="aw-index">02</span>
        </h1>
        <p>
          Configure examinations and evaluations. Draft assessments stay internal to administration
          until published to the teacher portal for marks entry.
        </p>
      </div>
      <div className="aw-hero__side">
        <div className="aw-stamp">
          <span>Academic year</span>
          <strong>{yearLabel || "All years"}</strong>
        </div>
        <div className="aw-hero__actions">
          <button
            type="button"
            className="aw-btn aw-btn--ghost"
            onClick={onRefresh}
            disabled={busy}
            title="Refresh assessments list"
          >
            <RefreshCw size={15} className={busy ? "aw-spin" : ""} />
            {busy ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            className="aw-btn aw-btn--primary"
            onClick={onCreate}
            disabled={createDisabled}
            title="Create a new assessment"
          >
            <Plus size={16} />
            Create assessment
          </button>
        </div>
      </div>
    </header>
  );
}

function MetricTile({ label, value, meta, tone, icon, ratio, index }) {
  return (
    <article className={`aw-stat aw-tone-${tone}`} style={{ "--aw-i": index }}>
      <div className="aw-stat__top">
        <span className="aw-stat__label">{label}</span>
        <span className="aw-stat__icon">{icon}</span>
      </div>
      <div className="aw-stat__value">{value}</div>
      <span className="aw-stat__meta">{meta}</span>
      <div className="aw-stat__rail">
        <span style={{ width: `${ratio}%` }} />
      </div>
    </article>
  );
}

function MetricsSkeleton() {
  return (
    <div className="aw-stats aw-stats--three" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="aw-skel aw-skel--stat" style={{ "--aw-i": index }} />
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="aw-assess-grid" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div key={index} className="aw-skel aw-skel--card" style={{ "--aw-i": index }} />
      ))}
    </div>
  );
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState("");
  const [referenceKey, setReferenceKey] = useState(0);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"

  // Create Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formSubjects, setFormSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");

  // Edit Modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(() => ({ ...EMPTY_FORM }));
  const [editErrors, setEditErrors] = useState({});
  const [editFormError, setEditFormError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editSubjects, setEditSubjects] = useState([]);
  const [editSubjectsLoading, setEditSubjectsLoading] = useState(false);

  // Publish / Unpublish Action state
  const [publishTarget, setPublishTarget] = useState(null);
  const [unpublishTarget, setUnpublishTarget] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  // View Details Modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsId, setDetailsId] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const detailsRequest = useRef(0);
  const { toasts, push, dismiss } = useToasts();

  // Load reference data
  useEffect(() => {
    let alive = true;
    setReferenceLoading(true);
    setReferenceError("");

    Promise.allSettled([
      api("/api/classes"),
      api("/api/sections"),
      api("/api/subjects"),
      api("/api/academic-years"),
    ]).then((results) => {
      if (!alive) return;
      const [classesResult, sectionsResult, subjectsResult, yearsResult] = results;

      if (classesResult.status === "fulfilled" && Array.isArray(classesResult.value)) {
        setClasses(classesResult.value);
      }
      if (sectionsResult.status === "fulfilled" && Array.isArray(sectionsResult.value)) {
        setSections(sectionsResult.value);
      }
      if (subjectsResult.status === "fulfilled" && Array.isArray(subjectsResult.value)) {
        setSubjects(subjectsResult.value);
      }
      if (yearsResult.status === "fulfilled" && Array.isArray(yearsResult.value)) {
        setYears(yearsResult.value);
      }

      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length) {
        setReferenceError(
          failed[0].reason?.message
            || "Some assessment filters could not be loaded. Retry to try again.",
        );
      }
      setReferenceLoading(false);
    }).catch((error) => {
      if (!alive) return;
      setReferenceError(error.message || "Assessment filters could not be loaded.");
      setReferenceLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [referenceKey]);

  // Load assessments list
  useEffect(() => {
    let alive = true;
    setListLoading(true);
    setListError("");

    api("/api/admin/assessments")
      .then((data) => {
        if (!alive) return;
        setAssessments(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!alive) return;
        setListError(error.message || "Assessments could not be loaded.");
      })
      .finally(() => {
        if (alive) setListLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const currentYear = useMemo(() => (
    years.find((year) => year.currentYear)
    || years.find((year) => String(year.status).toUpperCase() === "ACTIVE")
    || years[0]
    || null
  ), [years]);

  const activeYears = useMemo(() => (
    years
      .filter((year) => String(year.status || "ACTIVE").toUpperCase() === "ACTIVE")
      .sort((left, right) => (
        Number(Boolean(right.currentYear)) - Number(Boolean(left.currentYear))
        || String(left.name || "").localeCompare(String(right.name || ""), undefined, { numeric: true })
      ))
  ), [years]);

  const yearOptions = useMemo(() => (
    [...years].sort((left, right) => (
      Number(Boolean(right.currentYear)) - Number(Boolean(left.currentYear))
      || String(right.name || "").localeCompare(String(left.name || ""), undefined, { numeric: true })
    ))
  ), [years]);

  const creatableYears = useMemo(
    () => (activeYears.length ? activeYears : yearOptions),
    [activeYears, yearOptions],
  );

  const today = todayISO();
  const metrics = useMemo(() => {
    let active = 0;
    let draft = 0;
    let published = 0;

    assessments.forEach((assessment) => {
      const status = statusLabel(assessment.status);
      if (status === "PUBLISHED") {
        published += 1;
        if (assessment.assessmentDate && assessment.assessmentDate >= today) active += 1;
      } else if (status === "DRAFT") {
        draft += 1;
      }
    });

    return { active, draft, published, total: assessments.length };
  }, [assessments, today]);

  // Filtered assessments list
  const scoped = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return assessments.filter((assessment) => {
      if (filters.classId && String(assessment.classId) !== String(filters.classId)) return false;
      if (filters.subjectId && String(assessment.subjectId) !== String(filters.subjectId)) return false;
      if (filters.yearId && String(assessment.academicYearId) !== String(filters.yearId)) return false;
      if (!query) return true;
      const haystack = [
        assessment.title,
        assessment.subjectName,
        assessment.className,
        assessment.sectionName,
        assessment.academicYearName,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [assessments, filters.query, filters.classId, filters.subjectId, filters.yearId]);

  const statusCounts = useMemo(() => ({
    ALL: scoped.length,
    DRAFT: scoped.filter((assessment) => statusLabel(assessment.status) === "DRAFT").length,
    PUBLISHED: scoped.filter((assessment) => statusLabel(assessment.status) === "PUBLISHED").length,
  }), [scoped]);

  const visible = useMemo(() => {
    const filtered = filters.status === "ALL"
      ? scoped
      : scoped.filter((assessment) => statusLabel(assessment.status) === filters.status);
    return [...filtered].sort((left, right) => {
      const dateCompare = String(right.assessmentDate || "").localeCompare(String(left.assessmentDate || ""));
      if (dateCompare) return dateCompare;
      return Number(right.id || 0) - Number(left.id || 0);
    });
  }, [scoped, filters.status]);

  const hasActiveFilters = Boolean(
    filters.query
    || filters.classId
    || filters.subjectId
    || filters.yearId
    || filters.status !== "ALL",
  );

  // Form Sections & Subjects (Create)
  const formYear = useMemo(
    () => years.find((year) => String(year.id) === String(form.academicYearId)) || null,
    [years, form.academicYearId],
  );

  const formSections = useMemo(() => (
    sections
      .filter((section) => String(section.classId) === String(form.classId))
      .filter((section) => String(section.academicYearId) === String(form.academicYearId))
      .filter((section) => !section.status || String(section.status).toUpperCase() === "ACTIVE")
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), undefined, { numeric: true }))
  ), [sections, form.classId, form.academicYearId]);

  useEffect(() => {
    if (!createOpen || !form.classId || !form.academicYearId) {
      setFormSubjects([]);
      setSubjectsError("");
      setSubjectsLoading(false);
      return undefined;
    }

    let alive = true;
    setSubjectsLoading(true);
    setSubjectsError("");
    setFormSubjects([]);

    const params = new URLSearchParams({ academicYearId: form.academicYearId });
    api(`/api/classes/${form.classId}/subjects?${params.toString()}`)
      .then((data) => {
        if (!alive) return;
        const mapped = (Array.isArray(data) ? data : []).filter((subject) => (
          !subject.status || String(subject.status).toUpperCase() === "ACTIVE"
        ));
        setFormSubjects(mapped);
      })
      .catch((error) => {
        if (!alive) return;
        setFormSubjects([]);
        setSubjectsError(error.message || "Subjects for this class could not be loaded.");
      })
      .finally(() => {
        if (alive) setSubjectsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [createOpen, form.classId, form.academicYearId]);

  // Form Sections & Subjects (Edit)
  const editFormYear = useMemo(
    () => years.find((year) => String(year.id) === String(editForm.academicYearId)) || null,
    [years, editForm.academicYearId],
  );

  const editSections = useMemo(() => (
    sections
      .filter((section) => String(section.classId) === String(editForm.classId))
      .filter((section) => String(section.academicYearId) === String(editForm.academicYearId))
      .filter((section) => !section.status || String(section.status).toUpperCase() === "ACTIVE")
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), undefined, { numeric: true }))
  ), [sections, editForm.classId, editForm.academicYearId]);

  useEffect(() => {
    if (!editOpen || !editForm.classId || !editForm.academicYearId) {
      setEditSubjects([]);
      setEditSubjectsLoading(false);
      return undefined;
    }

    let alive = true;
    setEditSubjectsLoading(true);
    setEditSubjects([]);

    const params = new URLSearchParams({ academicYearId: editForm.academicYearId });
    api(`/api/classes/${editForm.classId}/subjects?${params.toString()}`)
      .then((data) => {
        if (!alive) return;
        const mapped = (Array.isArray(data) ? data : []).filter((subject) => (
          !subject.status || String(subject.status).toUpperCase() === "ACTIVE"
        ));
        setEditSubjects(mapped);
      })
      .catch(() => {
        if (!alive) return;
        setEditSubjects([]);
      })
      .finally(() => {
        if (alive) setEditSubjectsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [editOpen, editForm.classId, editForm.academicYearId]);

  function setFilter(field, value) {
    setFilters((previous) => ({ ...previous, [field]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  // CREATE HANDLERS
  function openCreate() {
    const preferredYear = activeYears.find((year) => year.currentYear)
      || activeYears[0]
      || currentYear
      || null;
    setForm({
      ...EMPTY_FORM,
      academicYearId: preferredYear ? String(preferredYear.id) : "",
    });
    setErrors({});
    setFormError("");
    setCreateOpen(true);
  }

  function closeCreate() {
    if (saving) return;
    setCreateOpen(false);
    setErrors({});
    setFormError("");
  }

  function updateForm(field, value) {
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "classId" || field === "academicYearId") {
        next.sectionId = "";
        next.subjectId = "";
      }
      return next;
    });
    setErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      if (field === "classId" || field === "academicYearId") {
        delete next.sectionId;
        delete next.subjectId;
      }
      return next;
    });
    setFormError("");
  }

  function validateCreate() {
    const next = {};
    const title = form.title.trim();

    if (!title) next.title = "Enter an assessment title.";
    else if (title.length > 150) next.title = "Keep the title to 150 characters or fewer.";

    if (!form.academicYearId) next.academicYearId = "Choose an academic year.";
    if (!form.classId) next.classId = "Choose a class.";
    if (!form.subjectId) next.subjectId = "Choose a subject.";
    if (!form.assessmentDate) {
      next.assessmentDate = "Choose an exam date.";
    } else if (formYear?.startDate && form.assessmentDate < formYear.startDate) {
      next.assessmentDate = `The date must fall inside ${formYear.name || "the academic year"}.`;
    } else if (formYear?.endDate && form.assessmentDate > formYear.endDate) {
      next.assessmentDate = `The date must fall inside ${formYear.name || "the academic year"}.`;
    }

    const marks = Number(form.maxMarks);
    if (!form.maxMarks || !Number.isFinite(marks) || marks <= 0) {
      next.maxMarks = "Max marks must be greater than zero.";
    } else if (marks > 999999.99) {
      next.maxMarks = "Max marks cannot exceed 999,999.99.";
    }

    if (form.sectionId && !formSections.some((section) => String(section.id) === String(form.sectionId))) {
      next.sectionId = "Choose a section that belongs to this class and year.";
    }

    return next;
  }

  async function handleCreate(event) {
    event.preventDefault();
    const nextErrors = validateCreate();

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setFormError("Review the highlighted fields before saving.");
      const firstField = Object.keys(nextErrors)[0];
      const target = FIELD_IDS[firstField];
      if (target) {
        window.setTimeout(() => document.getElementById(target)?.focus(), 0);
      }
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const created = await api("/api/admin/assessments", "POST", {
        title: form.title.trim(),
        classId: Number(form.classId),
        sectionId: form.sectionId ? Number(form.sectionId) : null,
        subjectId: Number(form.subjectId),
        academicYearId: Number(form.academicYearId),
        assessmentDate: form.assessmentDate,
        maxMarks: Number(form.maxMarks),
        status: form.status || "DRAFT",
      });

      setAssessments((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
      setErrors({});
      setFormError("");
      push(`"${created.title}" successfully created (${created.status}).`, "success");
    } catch (error) {
      setFormError(error.message || "The assessment could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  // EDIT HANDLERS
  function openEdit(assessment) {
    setEditId(assessment.id);
    setEditForm({
      title: assessment.title || "",
      classId: String(assessment.classId || ""),
      sectionId: assessment.sectionId ? String(assessment.sectionId) : "",
      subjectId: String(assessment.subjectId || ""),
      academicYearId: String(assessment.academicYearId || ""),
      assessmentDate: assessment.assessmentDate || "",
      maxMarks: assessment.maxMarks ? String(assessment.maxMarks) : "",
      status: assessment.status || "DRAFT",
    });
    setEditErrors({});
    setEditFormError("");
    setEditOpen(true);
  }

  function closeEdit() {
    if (editSaving) return;
    setEditOpen(false);
    setEditId(null);
    setEditErrors({});
    setEditFormError("");
  }

  function updateEditForm(field, value) {
    setEditForm((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "classId" || field === "academicYearId") {
        next.sectionId = "";
        next.subjectId = "";
      }
      return next;
    });
    setEditErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      if (field === "classId" || field === "academicYearId") {
        delete next.sectionId;
        delete next.subjectId;
      }
      return next;
    });
    setEditFormError("");
  }

  function validateEdit() {
    const next = {};
    const title = editForm.title.trim();

    if (!title) next.title = "Enter an assessment title.";
    else if (title.length > 150) next.title = "Keep the title to 150 characters or fewer.";

    if (!editForm.academicYearId) next.academicYearId = "Choose an academic year.";
    if (!editForm.classId) next.classId = "Choose a class.";
    if (!editForm.subjectId) next.subjectId = "Choose a subject.";
    if (!editForm.assessmentDate) {
      next.assessmentDate = "Choose an exam date.";
    }

    const marks = Number(editForm.maxMarks);
    if (!editForm.maxMarks || !Number.isFinite(marks) || marks <= 0) {
      next.maxMarks = "Max marks must be greater than zero.";
    }

    return next;
  }

  async function handleEdit(event) {
    event.preventDefault();
    if (!editId) return;

    const nextErrors = validateEdit();
    if (Object.keys(nextErrors).length) {
      setEditErrors(nextErrors);
      setEditFormError("Please resolve the highlighted errors.");
      return;
    }

    setEditSaving(true);
    setEditFormError("");
    try {
      const updated = await api(`/api/admin/assessments/${editId}`, "PUT", {
        title: editForm.title.trim(),
        classId: Number(editForm.classId),
        sectionId: editForm.sectionId ? Number(editForm.sectionId) : null,
        subjectId: Number(editForm.subjectId),
        academicYearId: Number(editForm.academicYearId),
        assessmentDate: editForm.assessmentDate,
        maxMarks: Number(editForm.maxMarks),
        status: editForm.status || "DRAFT",
      });

      setAssessments((previous) => previous.map((item) => (item.id === editId ? updated : item)));
      setEditOpen(false);
      setEditId(null);
      push(`"${updated.title}" changes saved successfully.`, "success");
    } catch (error) {
      setEditFormError(error.message || "Failed to update assessment.");
    } finally {
      setEditSaving(false);
    }
  }

  // PUBLISH & UNPUBLISH
  function requestPublish(assessment) {
    setPublishTarget(assessment);
  }

  async function confirmPublish() {
    if (!publishTarget) return;
    const target = publishTarget;
    setPendingId(target.id);
    try {
      const updated = await api(`/api/admin/assessments/${target.id}/publish`, "PUT");
      setAssessments((previous) => previous.map((item) => (
        item.id === target.id ? updated : item
      )));
      setPublishTarget(null);
      push(`"${updated.title}" published! Teachers can now record student marks.`, "success");
    } catch (error) {
      push(error.message || "The assessment could not be published.", "error");
    } finally {
      setPendingId(null);
    }
  }

  function requestUnpublish(assessment) {
    setUnpublishTarget(assessment);
  }

  async function confirmUnpublish() {
    if (!unpublishTarget) return;
    const target = unpublishTarget;
    setPendingId(target.id);
    try {
      const updated = await api(`/api/admin/assessments/${target.id}/unpublish`, "PUT");
      setAssessments((previous) => previous.map((item) => (
        item.id === target.id ? updated : item
      )));
      setUnpublishTarget(null);
      push(`"${updated.title}" moved to draft. Hidden from teacher portal.`, "success");
    } catch (error) {
      push(error.message || "The assessment could not be unpublished.", "error");
    } finally {
      setPendingId(null);
    }
  }

  // DETAILS VIEW
  async function loadDetails(id) {
    const requestId = ++detailsRequest.current;
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);
    try {
      const data = await api(`/api/admin/assessments/${id}`);
      if (requestId === detailsRequest.current) setDetails(data);
    } catch (error) {
      if (requestId === detailsRequest.current) {
        setDetailsError(error.message || "Assessment details could not be loaded.");
      }
    } finally {
      if (requestId === detailsRequest.current) setDetailsLoading(false);
    }
  }

  function openDetails(assessment) {
    setDetailsOpen(true);
    setDetailsId(assessment.id);
    loadDetails(assessment.id);
  }

  function closeDetails() {
    detailsRequest.current += 1;
    setDetailsOpen(false);
    setDetailsId(null);
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(false);
  }

  const metricTiles = [
    {
      label: "Active & upcoming",
      value: metrics.active,
      meta: "Published exams scheduled today or later",
      tone: "violet",
      icon: <Clock size={16} />,
      ratio: percent(metrics.active, metrics.total),
    },
    {
      label: "Published exams",
      value: metrics.published,
      meta: "Visible to teachers for marks entry",
      tone: "emerald",
      icon: <CheckCircle2 size={16} />,
      ratio: percent(metrics.published, metrics.total),
    },
    {
      label: "Drafts pending",
      value: metrics.draft,
      meta: "Internal to administration",
      tone: "amber",
      icon: <Sparkles size={16} />,
      ratio: percent(metrics.draft, metrics.total),
    },
  ];

  const statusPills = [
    { key: "ALL", label: "All assessments", count: statusCounts.ALL },
    { key: "PUBLISHED", label: "Published", count: statusCounts.PUBLISHED, tone: "published" },
    { key: "DRAFT", label: "Drafts", count: statusCounts.DRAFT, tone: "draft" },
  ];

  const busy = referenceLoading || listLoading;

  return (
    <div className="aw-page">
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <PageHero
        yearLabel={currentYear?.name}
        busy={busy}
        onCreate={openCreate}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        createDisabled={referenceLoading || !classes.length || !subjects.length}
      />

      {referenceError && (
        <div className="aw-banner aw-banner--warning" role="alert">
          <AlertTriangle size={18} />
          <p>{referenceError}</p>
          <button
            type="button"
            className="aw-btn aw-btn--ghost"
            onClick={() => setReferenceKey((k) => k + 1)}
          >
            Retry filters
          </button>
        </div>
      )}

      {/* Bento Grid Metric Banner */}
      {listLoading ? (
        <MetricsSkeleton />
      ) : (
        <section className="aw-stats aw-stats--three" aria-label="Assessment health metrics">
          {metricTiles.map((tile, index) => (
            <MetricTile key={tile.label} {...tile} index={index} />
          ))}
        </section>
      )}

      {/* Filter Bar with Subject, Class, Year, Search, and Status */}
      <section className="aw-controls" aria-label="Assessment filter controls">
        <div className="aw-field aw-field--grow">
          <label className="aw-field__label" htmlFor="filter-query">Search assessment</label>
          <div className="aw-input-wrap aw-input-wrap--icon">
            <Search size={15} />
            <input
              id="filter-query"
              type="search"
              value={filters.query}
              onChange={(e) => setFilter("query", e.target.value)}
              placeholder="Filter by title, subject, or class…"
              autoComplete="off"
            />
            {filters.query && (
              <button
                type="button"
                className="aw-input-wrap__clear"
                onClick={() => setFilter("query", "")}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="aw-field">
          <label className="aw-field__label" htmlFor="filter-class">Class</label>
          <div className="aw-input-wrap aw-input-wrap--select">
            <select
              id="filter-class"
              value={filters.classId}
              onChange={(e) => setFilter("classId", e.target.value)}
            >
              <option value="">All classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="aw-select-caret" />
          </div>
        </div>

        <div className="aw-field">
          <label className="aw-field__label" htmlFor="filter-subject">Subject</label>
          <div className="aw-input-wrap aw-input-wrap--select">
            <select
              id="filter-subject"
              value={filters.subjectId}
              onChange={(e) => setFilter("subjectId", e.target.value)}
            >
              <option value="">All subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="aw-select-caret" />
          </div>
        </div>

        <div className="aw-field">
          <label className="aw-field__label" htmlFor="filter-year">Academic year</label>
          <div className="aw-input-wrap aw-input-wrap--select">
            <select
              id="filter-year"
              value={filters.yearId}
              onChange={(e) => setFilter("yearId", e.target.value)}
            >
              <option value="">All years</option>
              {yearOptions.map((year) => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="aw-select-caret" />
          </div>
        </div>

        {/* View Mode Switcher: Grid vs Table */}
        <div className="aw-field">
          <span className="aw-field__label">Display</span>
          <div className="aw-segmented" role="group" aria-label="View layout">
            <button
              type="button"
              className={viewMode === "grid" ? "active" : ""}
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              title="Grid cards layout"
            >
              <LayoutGrid size={14} />
              Grid
            </button>
            <button
              type="button"
              className={viewMode === "table" ? "active" : ""}
              aria-pressed={viewMode === "table"}
              onClick={() => setViewMode("table")}
              title="Tabular row layout"
            >
              <List size={14} />
              Table
            </button>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="aw-chips" aria-label="Filter by assessment status">
          {statusPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              className="aw-chip"
              data-active={filters.status === pill.key}
              onClick={() => setFilter("status", pill.key)}
              aria-pressed={filters.status === pill.key}
            >
              {pill.tone && <span className={`aw-chip__dot aw-chip__dot--${pill.tone}`} />}
              {pill.label}
              <span className="aw-chip__count">{pill.count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Assessment List / Grid View */}
      {listError ? (
        <section className="aw-panel">
          <div className="aw-empty">
            <span className="aw-empty__icon"><AlertTriangle size={26} /></span>
            <h3>Unable to load assessments</h3>
            <p>{listError}</p>
            <button
              type="button"
              className="aw-btn aw-btn--primary"
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              <RefreshCw size={15} />
              Try again
            </button>
          </div>
        </section>
      ) : listLoading ? (
        <CardsSkeleton />
      ) : visible.length === 0 ? (
        <section className="aw-panel">
          <div className="aw-empty">
            <span className="aw-empty__icon"><BookOpen size={26} /></span>
            <h3>{hasActiveFilters ? "No matching assessments found" : "No assessments created yet"}</h3>
            <p>
              {hasActiveFilters
                ? "Try clearing filters or search keywords to view other examinations."
                : "Create your first assessment to start planning the exam calendar for students and teachers."}
            </p>
            {hasActiveFilters ? (
              <button type="button" className="aw-btn aw-btn--ghost" onClick={clearFilters}>
                Clear all filters
              </button>
            ) : (
              <button type="button" className="aw-btn aw-btn--primary" onClick={openCreate}>
                <Plus size={16} />
                Create your first assessment
              </button>
            )}
          </div>
        </section>
      ) : viewMode === "grid" ? (
        /* BENTO GRID CARD VIEW */
        <div className="aw-assess-grid" aria-label="Assessments grid">
          {visible.map((assessment, index) => {
            const isPublished = statusLabel(assessment.status) === "PUBLISHED";
            const isPending = pendingId === assessment.id;
            const relative = relativeExamLabel(assessment.assessmentDate);

            return (
              <article
                key={assessment.id}
                className="aw-card hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
                style={{ "--aw-i": Math.min(index, 14) }}
              >
                <div className="aw-card__top">
                  <span className={`aw-badge aw-badge--${statusTone(assessment.status)}`}>
                    {isPublished ? <CheckCircle2 size={12} className="inline mr-1" /> : <Clock size={12} className="inline mr-1" />}
                    {assessment.status}
                  </span>
                  {relative && (
                    <span className="aw-badge aw-badge--subtle">
                      {relative}
                    </span>
                  )}
                </div>

                <div className="aw-card__main">
                  <h3 className="aw-card__title" title={assessment.title}>
                    {assessment.title}
                  </h3>
                  <div className="aw-card__tags">
                    <span className="aw-card__tag">
                      <BookOpen size={12} />
                      {assessment.subjectName || "Subject"}
                    </span>
                    <span className="aw-card__tag">
                      <GraduationCap size={12} />
                      {assessment.className || "Class"}
                      {assessment.sectionName ? ` · ${assessment.sectionName}` : ""}
                    </span>
                  </div>
                </div>

                <div className="aw-card__meta-bar">
                  <div className="aw-card__meta-item">
                    <span className="aw-card__meta-label">Exam date</span>
                    <strong className="aw-card__meta-val">
                      <CalendarDays size={13} className="inline mr-1 opacity-70" />
                      {formatDate(assessment.assessmentDate)}
                    </strong>
                  </div>
                  <div className="aw-card__meta-item">
                    <span className="aw-card__meta-label">Max marks</span>
                    <strong className="aw-card__meta-val">
                      {formatMarks(assessment.maxMarks)} pts
                    </strong>
                  </div>
                </div>

                {/* Actions per card */}
                <div className="aw-card__actions">
                  {isPublished ? (
                    <button
                      type="button"
                      className="aw-btn aw-btn--ghost aw-btn--sm"
                      onClick={() => requestUnpublish(assessment)}
                      disabled={isPending}
                      title="Move back to draft"
                    >
                      <RotateCcw size={13} />
                      Unpublish
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="aw-btn aw-btn--soft aw-btn--sm"
                      onClick={() => requestPublish(assessment)}
                      disabled={isPending}
                      title="Publish to teacher portal"
                    >
                      <Send size={13} />
                      Publish
                    </button>
                  )}

                  <button
                    type="button"
                    className="aw-btn aw-btn--ghost aw-btn--sm"
                    onClick={() => openEdit(assessment)}
                    title="Edit assessment details"
                  >
                    <Edit3 size={13} />
                    Edit
                  </button>

                  <button
                    type="button"
                    className="aw-btn aw-btn--ghost aw-btn--sm"
                    onClick={() => openDetails(assessment)}
                    title="View full assessment details"
                  >
                    <Eye size={13} />
                    Details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* TABLE ROW VIEW */
        <section className="aw-panel aw-table-card" aria-label="Assessments table">
          <div className="aw-table-scroll">
            <table className="aw-table">
              <thead>
                <tr>
                  <th scope="col">Assessment Title</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Class &amp; Section</th>
                  <th scope="col">Exam Date</th>
                  <th scope="col">Max Marks</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((assessment, index) => {
                  const isPublished = statusLabel(assessment.status) === "PUBLISHED";
                  const isPending = pendingId === assessment.id;

                  return (
                    <tr key={assessment.id} style={{ "--aw-i": Math.min(index, 14) }}>
                      <td data-label="Assessment Title">
                        <div className="font-semibold text-slate-800">{assessment.title}</div>
                        <div className="text-xs text-slate-500">{assessment.academicYearName}</div>
                      </td>
                      <td data-label="Subject">
                        <span className="aw-card__tag">
                          <BookOpen size={12} />
                          {assessment.subjectName}
                        </span>
                      </td>
                      <td data-label="Class & Section">
                        <span className="aw-card__tag">
                          <GraduationCap size={12} />
                          {assessment.className}
                          {assessment.sectionName ? ` · ${assessment.sectionName}` : ""}
                        </span>
                      </td>
                      <td data-label="Exam Date">
                        <span>{formatDate(assessment.assessmentDate)}</span>
                      </td>
                      <td data-label="Max Marks">
                        <span className="font-medium text-slate-700">{formatMarks(assessment.maxMarks)}</span>
                      </td>
                      <td data-label="Status">
                        <span className={`aw-badge aw-badge--${statusTone(assessment.status)}`}>
                          {isPublished ? <CheckCircle2 size={12} className="inline mr-1" /> : <Clock size={12} className="inline mr-1" />}
                          {assessment.status}
                        </span>
                      </td>
                      <td data-label="Actions" className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPublished ? (
                            <button
                              type="button"
                              className="aw-btn aw-btn--ghost aw-btn--sm"
                              onClick={() => requestUnpublish(assessment)}
                              disabled={isPending}
                              title="Unpublish"
                            >
                              <RotateCcw size={13} />
                              Unpublish
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="aw-btn aw-btn--soft aw-btn--sm"
                              onClick={() => requestPublish(assessment)}
                              disabled={isPending}
                              title="Publish"
                            >
                              <Send size={13} />
                              Publish
                            </button>
                          )}
                          <button
                            type="button"
                            className="aw-btn aw-btn--ghost aw-btn--sm"
                            onClick={() => openEdit(assessment)}
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="aw-btn aw-btn--ghost aw-btn--sm"
                            onClick={() => openDetails(assessment)}
                            title="View details"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* CREATE ASSESSMENT MODAL */}
      <AdminModal
        open={createOpen}
        onClose={closeCreate}
        title="Schedule Assessment"
        description="Configure a new examination for a class, assign a subject, and schedule the exam date."
        size="md"
        footer={
          <div className="aw-modal-actions">
            <button
              type="button"
              className="aw-btn aw-btn--ghost"
              onClick={closeCreate}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aw-btn aw-btn--primary"
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? "Scheduling…" : "Save assessment"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreate} className="aw-modal-form" noValidate>
          {formError && (
            <div className="aw-banner aw-banner--error" role="alert">
              <AlertTriangle size={17} />
              <p>{formError}</p>
            </div>
          )}

          <div className="aw-modal-field">
            <label className="aw-modal-label" htmlFor="assessment-title">
              Assessment title <span className="aw-required">*</span>
            </label>
            <input
              id="assessment-title"
              type="text"
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              placeholder="e.g. Midterm Examination, Unit Test 1"
              maxLength={150}
              className={`aw-modal-input ${errors.title ? "aw-input--error" : ""}`}
            />
            {errors.title && <p className="aw-form-error">{errors.title}</p>}
          </div>

          <div className="aw-modal-row">
            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="assessment-year">
                Academic year <span className="aw-required">*</span>
              </label>
              <div className="aw-input-wrap aw-input-wrap--select">
                <select
                  id="assessment-year"
                  value={form.academicYearId}
                  onChange={(e) => updateForm("academicYearId", e.target.value)}
                  className={errors.academicYearId ? "aw-input--error" : ""}
                >
                  <option value="">Select year</option>
                  {creatableYears.map((year) => (
                    <option key={year.id} value={year.id}>{year.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="aw-select-caret" />
              </div>
              {errors.academicYearId && <p className="aw-form-error">{errors.academicYearId}</p>}
            </div>

            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="assessment-class">
                Class <span className="aw-required">*</span>
              </label>
              <div className="aw-input-wrap aw-input-wrap--select">
                <select
                  id="assessment-class"
                  value={form.classId}
                  onChange={(e) => updateForm("classId", e.target.value)}
                  className={errors.classId ? "aw-input--error" : ""}
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="aw-select-caret" />
              </div>
              {errors.classId && <p className="aw-form-error">{errors.classId}</p>}
            </div>
          </div>

          <div className="aw-modal-row">
            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="assessment-section">
                Section <span className="aw-optional">(Optional)</span>
              </label>
              <div className="aw-input-wrap aw-input-wrap--select">
                <select
                  id="assessment-section"
                  value={form.sectionId}
                  onChange={(e) => updateForm("sectionId", e.target.value)}
                  disabled={!form.classId}
                >
                  <option value="">All sections</option>
                  {formSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="aw-select-caret" />
              </div>
            </div>

            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="assessment-subject">
                Subject <span className="aw-required">*</span>
              </label>
              <div className="aw-input-wrap aw-input-wrap--select">
                <select
                  id="assessment-subject"
                  value={form.subjectId}
                  onChange={(e) => updateForm("subjectId", e.target.value)}
                  disabled={!form.classId || subjectsLoading}
                  className={errors.subjectId ? "aw-input--error" : ""}
                >
                  <option value="">
                    {subjectsLoading ? "Loading subjects…" : "Select subject"}
                  </option>
                  {(formSubjects.length ? formSubjects : subjects).map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="aw-select-caret" />
              </div>
              {errors.subjectId && <p className="aw-form-error">{errors.subjectId}</p>}
              {form.classId && !subjectsLoading && formSubjects.length === 0 && subjects.length === 0 && (
                <p className="aw-form-hint" style={{ color: "#d97706", fontSize: "12px", marginTop: "4px" }}>
                  No subjects configured. Add subjects in <Link to="/subjects" style={{ textDecoration: "underline", color: "#1f7a8c" }}>Departments &amp; Subjects</Link>.
                </p>
              )}
            </div>
          </div>

          <div className="aw-modal-row">
            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="assessment-date">
                Assessment date <span className="aw-required">*</span>
              </label>
              <input
                id="assessment-date"
                type="date"
                value={form.assessmentDate}
                onChange={(e) => updateForm("assessmentDate", e.target.value)}
                className={`aw-modal-input ${errors.assessmentDate ? "aw-input--error" : ""}`}
              />
              {errors.assessmentDate && <p className="aw-form-error">{errors.assessmentDate}</p>}
            </div>

            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="assessment-marks">
                Maximum marks <span className="aw-required">*</span>
              </label>
              <input
                id="assessment-marks"
                type="number"
                step="0.5"
                min="1"
                max="1000"
                value={form.maxMarks}
                onChange={(e) => updateForm("maxMarks", e.target.value)}
                placeholder="e.g. 100"
                className={`aw-modal-input ${errors.maxMarks ? "aw-input--error" : ""}`}
              />
              {errors.maxMarks && <p className="aw-form-error">{errors.maxMarks}</p>}
            </div>
          </div>

          <div className="aw-modal-field">
            <span className="aw-modal-label">Initial status</span>
            <div className="aw-segmented" role="group" aria-label="Initial status">
              <button
                type="button"
                className={form.status === "DRAFT" ? "active" : ""}
                onClick={() => updateForm("status", "DRAFT")}
              >
                Draft (Admin only)
              </button>
              <button
                type="button"
                className={form.status === "PUBLISHED" ? "active" : ""}
                onClick={() => updateForm("status", "PUBLISHED")}
              >
                Published (Teacher visible)
              </button>
            </div>
          </div>
        </form>
      </AdminModal>

      {/* EDIT ASSESSMENT MODAL */}
      <AdminModal
        open={editOpen}
        onClose={closeEdit}
        title="Edit Assessment"
        description="Update exam details, scheduling dates, maximum marks, or status."
        size="md"
        footer={
          <div className="aw-modal-actions">
            <button
              type="button"
              className="aw-btn aw-btn--ghost"
              onClick={closeEdit}
              disabled={editSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aw-btn aw-btn--primary"
              onClick={handleEdit}
              disabled={editSaving}
            >
              {editSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleEdit} className="aw-modal-form" noValidate>
          {editFormError && (
            <div className="aw-banner aw-banner--error" role="alert">
              <AlertTriangle size={17} />
              <p>{editFormError}</p>
            </div>
          )}

          <div className="aw-modal-field">
            <label className="aw-modal-label" htmlFor="edit-title">
              Assessment title <span className="aw-required">*</span>
            </label>
            <input
              id="edit-title"
              type="text"
              value={editForm.title}
              onChange={(e) => updateEditForm("title", e.target.value)}
              className={`aw-modal-input ${editErrors.title ? "aw-input--error" : ""}`}
            />
            {editErrors.title && <p className="aw-form-error">{editErrors.title}</p>}
          </div>

          <div className="aw-modal-row">
            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="edit-year">
                Academic year <span className="aw-required">*</span>
              </label>
              <div className="aw-input-wrap aw-input-wrap--select">
                <select
                  id="edit-year"
                  value={editForm.academicYearId}
                  onChange={(e) => updateEditForm("academicYearId", e.target.value)}
                >
                  {yearOptions.map((year) => (
                    <option key={year.id} value={year.id}>{year.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="aw-select-caret" />
              </div>
            </div>

            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="edit-class">
                Class <span className="aw-required">*</span>
              </label>
              <div className="aw-input-wrap aw-input-wrap--select">
                <select
                  id="edit-class"
                  value={editForm.classId}
                  onChange={(e) => updateEditForm("classId", e.target.value)}
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="aw-select-caret" />
              </div>
            </div>
          </div>

          <div className="aw-modal-row">
            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="edit-section">
                Section
              </label>
              <div className="aw-input-wrap aw-input-wrap--select">
                <select
                  id="edit-section"
                  value={editForm.sectionId}
                  onChange={(e) => updateEditForm("sectionId", e.target.value)}
                >
                  <option value="">All sections</option>
                  {editSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="aw-select-caret" />
              </div>
            </div>

            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="edit-subject">
                Subject <span className="aw-required">*</span>
              </label>
              <div className="aw-input-wrap aw-input-wrap--select">
                <select
                  id="edit-subject"
                  value={editForm.subjectId}
                  onChange={(e) => updateEditForm("subjectId", e.target.value)}
                >
                  <option value="">Select subject</option>
                  {(editSubjects.length ? editSubjects : subjects).map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="aw-select-caret" />
              </div>
            </div>
          </div>

          <div className="aw-modal-row">
            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="edit-date">
                Assessment date <span className="aw-required">*</span>
              </label>
              <input
                id="edit-date"
                type="date"
                value={editForm.assessmentDate}
                onChange={(e) => updateEditForm("assessmentDate", e.target.value)}
                className={`aw-modal-input ${editErrors.assessmentDate ? "aw-input--error" : ""}`}
              />
              {editErrors.assessmentDate && <p className="aw-form-error">{editErrors.assessmentDate}</p>}
            </div>

            <div className="aw-modal-field">
              <label className="aw-modal-label" htmlFor="edit-marks">
                Maximum marks <span className="aw-required">*</span>
              </label>
              <input
                id="edit-marks"
                type="number"
                step="0.5"
                min="1"
                value={editForm.maxMarks}
                onChange={(e) => updateEditForm("maxMarks", e.target.value)}
                className={`aw-modal-input ${editErrors.maxMarks ? "aw-input--error" : ""}`}
              />
              {editErrors.maxMarks && <p className="aw-form-error">{editErrors.maxMarks}</p>}
            </div>
          </div>

          <div className="aw-modal-field">
            <span className="aw-modal-label">Status</span>
            <div className="aw-segmented" role="group" aria-label="Edit status">
              <button
                type="button"
                className={editForm.status === "DRAFT" ? "active" : ""}
                onClick={() => updateEditForm("status", "DRAFT")}
              >
                DRAFT
              </button>
              <button
                type="button"
                className={editForm.status === "PUBLISHED" ? "active" : ""}
                onClick={() => updateEditForm("status", "PUBLISHED")}
              >
                PUBLISHED
              </button>
            </div>
          </div>
        </form>
      </AdminModal>

      {/* CONFIRM PUBLISH MODAL */}
      <AdminModal
        open={Boolean(publishTarget)}
        onClose={() => setPublishTarget(null)}
        title="Publish Assessment"
        description="Are you sure you want to publish this assessment? It will immediately appear on the Teacher Portal for all assigned instructors."
        size="sm"
        footer={
          <div className="aw-modal-actions">
            <button
              type="button"
              className="aw-btn aw-btn--ghost"
              onClick={() => setPublishTarget(null)}
              disabled={Boolean(pendingId)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aw-btn aw-btn--primary"
              onClick={confirmPublish}
              disabled={Boolean(pendingId)}
            >
              {pendingId ? "Publishing…" : "Confirm & Publish"}
            </button>
          </div>
        }
      >
        {publishTarget && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <strong className="block text-slate-800 text-sm font-semibold">{publishTarget.title}</strong>
              <div className="text-xs text-slate-500 mt-1">
                {publishTarget.subjectName} · {publishTarget.className}
                {publishTarget.sectionName ? ` (${publishTarget.sectionName})` : ""} · {formatDate(publishTarget.assessmentDate)}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Once published, teachers with access to this class/subject will be authorized to grade and save student marks.
            </p>
          </div>
        )}
      </AdminModal>

      {/* CONFIRM UNPUBLISH MODAL */}
      <AdminModal
        open={Boolean(unpublishTarget)}
        onClose={() => setUnpublishTarget(null)}
        title="Unpublish Assessment"
        description="Moving this assessment to DRAFT will immediately hide it from the Teacher Portal. Existing marks remain saved in the database."
        size="sm"
        footer={
          <div className="aw-modal-actions">
            <button
              type="button"
              className="aw-btn aw-btn--ghost"
              onClick={() => setUnpublishTarget(null)}
              disabled={Boolean(pendingId)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aw-btn aw-btn--danger"
              onClick={confirmUnpublish}
              disabled={Boolean(pendingId)}
            >
              {pendingId ? "Unpublishing…" : "Unpublish to draft"}
            </button>
          </div>
        }
      >
        {unpublishTarget && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-amber-900 text-xs">
              <strong>Caution:</strong> Teachers will no longer see this exam on their dashboard until you re-publish it.
            </div>
            <div className="text-xs text-slate-600">
              Selected assessment: <strong>{unpublishTarget.title}</strong>
            </div>
          </div>
        )}
      </AdminModal>

      {/* VIEW DETAILS MODAL */}
      <AdminModal
        open={detailsOpen}
        onClose={closeDetails}
        title="Assessment Details"
        description="Comprehensive overview of examination configuration, academic scope, and status."
        size="md"
        footer={
          <div className="aw-modal-actions">
            <button
              type="button"
              className="aw-btn aw-btn--ghost"
              onClick={closeDetails}
            >
              Close
            </button>
            {details && statusLabel(details.status) === "DRAFT" && (
              <button
                type="button"
                className="aw-btn aw-btn--primary"
                onClick={() => {
                  closeDetails();
                  requestPublish(details);
                }}
              >
                <Send size={14} />
                Publish this exam
              </button>
            )}
            {details && statusLabel(details.status) === "PUBLISHED" && (
              <button
                type="button"
                className="aw-btn aw-btn--ghost"
                onClick={() => {
                  closeDetails();
                  requestUnpublish(details);
                }}
              >
                <RotateCcw size={14} />
                Move to draft
              </button>
            )}
          </div>
        }
      >
        {detailsLoading ? (
          <div className="space-y-4 py-4" aria-hidden="true">
            <div className="aw-skel aw-skel--line" />
            <div className="aw-skel aw-skel--line aw-skel--short" />
            <div className="aw-skel aw-skel--line" />
          </div>
        ) : detailsError ? (
          <div className="aw-banner aw-banner--error">
            <AlertTriangle size={17} />
            <p>{detailsError}</p>
          </div>
        ) : details ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {details.academicYearName}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{details.title}</h3>
              </div>
              <span className={`aw-badge aw-badge--${statusTone(details.status)}`}>
                {details.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-200/60 bg-white">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <GraduationCap size={14} /> Class &amp; Section
                </span>
                <strong className="block text-sm font-semibold text-slate-800 mt-1">
                  {details.className}
                  {details.sectionName ? ` · Section ${details.sectionName}` : " · All Sections"}
                </strong>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/60 bg-white">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <BookOpen size={14} /> Subject
                </span>
                <strong className="block text-sm font-semibold text-slate-800 mt-1">
                  {details.subjectName || "—"}
                </strong>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/60 bg-white">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <CalendarDays size={14} /> Exam Date
                </span>
                <strong className="block text-sm font-semibold text-slate-800 mt-1">
                  {formatDate(details.assessmentDate)}
                </strong>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/60 bg-white">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <Sparkles size={14} /> Maximum Marks
                </span>
                <strong className="block text-sm font-semibold text-slate-800 mt-1">
                  {formatMarks(details.maxMarks)} Points
                </strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-100/70 text-xs text-slate-600 flex items-center justify-between">
              <span>Assessment ID: #{details.id}</span>
              <span>Scope: {details.sectionId ? "Section-Specific" : "Class-Wide"}</span>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
