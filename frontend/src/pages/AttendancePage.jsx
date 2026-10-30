import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Info,
  Layers,
  Percent,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  addDays,
  formatDate,
  inclusiveDays,
  rangeSubtitle,
  todayISO,
} from "../utils/adminDates.js";
import "../styles/admin-workspace.css";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
];

function normalizeStatus(value) {
  const status = String(value || "").toUpperCase();
  return ["PRESENT", "ABSENT", "LATE"].includes(status) ? status : "UNMARKED";
}

function isArchived(section) {
  return String(section?.status || "").toUpperCase() === "ARCHIVED";
}

function isActiveYear(year) {
  return String(year?.status || "").toUpperCase() === "ACTIVE";
}

function statusTone(status) {
  if (status === "PRESENT") return "present";
  if (status === "ABSENT") return "absent";
  if (status === "LATE") return "late";
  return "unmarked";
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ST";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((Number(value || 0) / Number(total)) * 100);
}

function formatCount(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function getPresetRange(key) {
  const today = todayISO();
  if (key === "today") return { from: today, to: today };
  if (key === "7d") return { from: addDays(today, -6), to: today };
  if (key === "30d") return { from: addDays(today, -29), to: today };
  if (key === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  return { from: today, to: today };
}

function PageHero({ yearLabel, busy, onRefresh }) {
  return (
    <header className="aw-hero">
      <div className="aw-hero__main">
        <nav className="aw-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={12} className="aw-breadcrumb-chevron" />
          <span>Administration</span>
          <ChevronRight size={12} className="aw-breadcrumb-chevron" />
          <span aria-current="page">Attendance</span>
        </nav>
        <span className="aw-eyebrow">Daily register &amp; range analysis</span>
        <h1>
          Attendance
          <span className="aw-index">01</span>
        </h1>
        <p>
          Monitor class attendance with high-resolution daily registers or aggregated
          date-range analytics. Real-time metrics for Present, Absent, Late, and Unmarked students.
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
            title="Refresh attendance records"
          >
            <RefreshCw size={15} className={busy ? "aw-spin" : ""} />
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
    </header>
  );
}

function StatTile({ label, value, suffix, meta, tone, icon, lead, gradient, index }) {
  return (
    <article
      className={`aw-stat ${lead ? "aw-stat--lead" : ""} ${gradient ? "aw-stat--gradient" : ""} aw-tone-${tone}`}
      style={{ "--aw-i": index }}
    >
      <div className="aw-stat__top">
        <span className="aw-stat__label">{label}</span>
        <span className="aw-stat__icon">{icon}</span>
      </div>
      <div className="aw-stat__value">
        {value}
        {suffix && <small>{suffix}</small>}
      </div>
      <span className="aw-stat__meta">{meta}</span>
    </article>
  );
}

function StatsSkeleton() {
  return (
    <div className="aw-stats" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className={`aw-skel aw-skel--stat ${index === 0 || index === 4 ? "aw-stat--lead" : ""}`}
          style={{ "--aw-i": index }}
        />
      ))}
    </div>
  );
}

function RangeMeter({ label, value, total, tone }) {
  const width = percent(value, total);
  return (
    <div className={`aw-tone-${tone}`}>
      <div className="aw-meter__top">
        <span className="aw-meter__label">
          <span />
          {label}
        </span>
        <span className="aw-meter__value">
          {formatCount(value)} · {width}%
        </span>
      </div>
      <div
        className="aw-meter__track"
        role="progressbar"
        aria-label={`${label}: ${width}%`}
        aria-valuenow={width}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="aw-meter__fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState("");
  const [referenceKey, setReferenceKey] = useState(0);

  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [mode, setMode] = useState("daily");
  const [dailyDate, setDailyDate] = useState(todayISO());
  const [range, setRange] = useState(() => getPresetRange("7d"));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [refreshKey, setRefreshKey] = useState(0);

  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");

  const [daily, setDaily] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyLoaded, setDailyLoaded] = useState(false);
  const [dailyError, setDailyError] = useState("");

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const rosterRequest = useRef(0);
  const dailyRequest = useRef(0);
  const summaryRequest = useRef(0);

  useEffect(() => {
    let alive = true;
    setReferenceLoading(true);
    setReferenceError("");

    Promise.allSettled([
      api("/api/sections"),
      api("/api/classes"),
      api("/api/academic-years"),
    ]).then((results) => {
      if (!alive) return;

      const [sectionsResult, classesResult, yearsResult] = results;
      const nextSections = sectionsResult.status === "fulfilled" && Array.isArray(sectionsResult.value)
        ? sectionsResult.value
        : [];
      const nextClasses = classesResult.status === "fulfilled" && Array.isArray(classesResult.value)
        ? classesResult.value
        : [];
      const nextYears = yearsResult.status === "fulfilled" && Array.isArray(yearsResult.value)
        ? yearsResult.value
        : [];

      if (sectionsResult.status === "fulfilled") setSections(nextSections);
      if (classesResult.status === "fulfilled") setClasses(nextClasses);
      if (yearsResult.status === "fulfilled") setYears(nextYears);

      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length) {
        setReferenceError(
          failed[0].reason?.message
            || "Some attendance filters could not be loaded. Retry to try again.",
        );
      }

      if (nextSections.length) {
        const usableSections = nextSections.filter((section) => !isArchived(section));
        const currentYear = nextYears.find((year) => year.currentYear)
          || nextYears.find((year) => isActiveYear(year));
        const currentYearSections = currentYear
          ? usableSections.filter((section) => String(section.academicYearId) === String(currentYear.id))
          : [];
        const initial = currentYearSections[0] || usableSections[0] || nextSections[0];

        if (initial) {
          setClassId((previous) => previous || String(initial.classId));
          setSectionId((previous) => previous || String(initial.id));
        }
      }

      setReferenceLoading(false);
    }).catch((error) => {
      if (!alive) return;
      setReferenceError(error.message || "Attendance filters could not be loaded.");
      setReferenceLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [referenceKey]);

  const classOptions = useMemo(() => {
    const byId = new Map();
    sections
      .filter((section) => !isArchived(section))
      .forEach((section) => {
        if (!section.classId) return;
        const key = String(section.classId);
        if (!byId.has(key)) {
          byId.set(key, {
            id: key,
            name: section.className || `Class ${section.classId}`,
          });
        }
      });
    classes.forEach((schoolClass) => {
      const key = String(schoolClass.id);
      if (!byId.has(key)) {
        byId.set(key, {
          id: key,
          name: schoolClass.name || `Class ${schoolClass.id}`,
        });
      }
    });
    return [...byId.values()].sort((left, right) => (
      String(left.name).localeCompare(String(right.name), undefined, { numeric: true })
    ));
  }, [sections, classes]);

  const sectionOptions = useMemo(() => (
    sections
      .filter((section) => !isArchived(section))
      .filter((section) => !classId || String(section.classId) === String(classId))
      .sort((left, right) => String(left.name).localeCompare(String(right.name), undefined, { numeric: true }))
  ), [sections, classId]);

  const selectedSection = useMemo(
    () => sections.find((section) => String(section.id) === String(sectionId)) || null,
    [sections, sectionId],
  );

  const currentYear = useMemo(
    () => years.find((year) => year.currentYear)
      || years.find((year) => isActiveYear(year))
      || null,
    [years],
  );

  const yearLabel = selectedSection?.academicYearName || currentYear?.name || "All years";
  const selectedAcademicYearId = selectedSection?.academicYearId;

  // Load section roster students
  useEffect(() => {
    if (!sectionId || !selectedSection) {
      rosterRequest.current += 1;
      setRoster([]);
      setRosterError("");
      setRosterLoading(false);
      return undefined;
    }

    const requestId = ++rosterRequest.current;
    setRosterLoading(true);
    setRosterError("");
    setRoster([]);

    const params = new URLSearchParams();
    if (selectedAcademicYearId) params.set("academicYearId", selectedAcademicYearId);
    const queryString = params.toString();

    api(`/api/sections/${sectionId}/students${queryString ? `?${queryString}` : ""}`)
      .then((data) => {
        if (requestId !== rosterRequest.current) return;
        const activeStudents = (Array.isArray(data) ? data : []).filter((student) => {
          const status = String(student.status || "").toUpperCase();
          const enrollmentStatus = String(student.enrollmentStatus || "").toUpperCase();
          if (status && status !== "ACTIVE") return false;
          if (!enrollmentStatus) return true;
          return enrollmentStatus === "ENROLLED" || enrollmentStatus === "ACTIVE";
        });
        setRoster(activeStudents);
      })
      .catch((error) => {
        if (requestId !== rosterRequest.current) return;
        setRoster([]);
        setRosterError(error.message || "Student names could not be loaded.");
      })
      .finally(() => {
        if (requestId === rosterRequest.current) setRosterLoading(false);
      });

    return undefined;
  }, [sectionId, selectedAcademicYearId, refreshKey]);

  // Load daily attendance
  useEffect(() => {
    if (mode !== "daily") return undefined;
    if (!sectionId || !dailyDate) {
      dailyRequest.current += 1;
      setDaily([]);
      setDailyLoaded(false);
      setDailyError("");
      setDailyLoading(false);
      return undefined;
    }

    const requestId = ++dailyRequest.current;
    setDailyLoading(true);
    setDailyLoaded(false);
    setDailyError("");
    setDaily([]);

    const params = new URLSearchParams({ sectionId, date: dailyDate });
    api(`/api/admin/attendance/daily?${params.toString()}`)
      .then((data) => {
        if (requestId !== dailyRequest.current) return;
        setDaily(Array.isArray(data) ? data : []);
        setDailyLoaded(true);
      })
      .catch((error) => {
        if (requestId !== dailyRequest.current) return;
        setDaily([]);
        setDailyError(error.message || "The daily register could not be loaded.");
      })
      .finally(() => {
        if (requestId === dailyRequest.current) setDailyLoading(false);
      });

    return undefined;
  }, [mode, sectionId, dailyDate, refreshKey]);

  // Load summary attendance for date range
  useEffect(() => {
    if (mode !== "range") return undefined;
    if (!sectionId || !range.from || !range.to) {
      summaryRequest.current += 1;
      setSummary(null);
      setSummaryLoaded(false);
      setSummaryError("");
      setSummaryLoading(false);
      return undefined;
    }
    if (range.from > range.to) {
      summaryRequest.current += 1;
      setSummary(null);
      setSummaryLoaded(false);
      setSummaryError("");
      setSummaryLoading(false);
      return undefined;
    }

    const requestId = ++summaryRequest.current;
    setSummaryLoading(true);
    setSummaryLoaded(false);
    setSummaryError("");
    setSummary(null);

    const params = new URLSearchParams({
      sectionId,
      fromDate: range.from,
      toDate: range.to,
    });
    api(`/api/admin/attendance/summary?${params.toString()}`)
      .then((data) => {
        if (requestId !== summaryRequest.current) return;
        setSummary(data || null);
        setSummaryLoaded(true);
      })
      .catch((error) => {
        if (requestId !== summaryRequest.current) return;
        setSummary(null);
        setSummaryError(error.message || "The range summary could not be loaded.");
      })
      .finally(() => {
        if (requestId === summaryRequest.current) setSummaryLoading(false);
      });

    return undefined;
  }, [mode, sectionId, range.from, range.to, refreshKey]);

  // Combine roster students and daily marks
  const studentRows = useMemo(() => {
    const recordsById = new Map(
      daily.map((record) => [String(record.studentId), record]),
    );
    const rosterIds = new Set();
    const rows = roster.map((student) => {
      const key = String(student.id);
      rosterIds.add(key);
      const record = recordsById.get(key);
      const name = [student.firstName, student.lastName].filter(Boolean).join(" ").trim()
        || `Student #${student.id}`;
      return {
        key,
        name,
        roll: student.admissionNumber || key,
        status: normalizeStatus(record?.status),
        markedOn: record?.attendanceDate || null,
        markedBy: record?.markedByStaffId ?? null,
      };
    });

    daily.forEach((record) => {
      const key = String(record.studentId);
      if (rosterIds.has(key)) return;
      rows.push({
        key,
        name: `Student #${record.studentId}`,
        roll: key,
        status: normalizeStatus(record.status),
        markedOn: record.attendanceDate || null,
        markedBy: record.markedByStaffId ?? null,
      });
    });

    return rows.sort((left, right) => (
      String(left.roll).localeCompare(String(right.roll), undefined, { numeric: true })
      || left.name.localeCompare(right.name)
    ));
  }, [roster, daily]);

  const statusCounts = useMemo(() => {
    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, UNMARKED: 0 };
    studentRows.forEach((row) => {
      counts[row.status] = (counts[row.status] || 0) + 1;
    });
    return counts;
  }, [studentRows]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = useMemo(() => studentRows.filter((row) => {
    const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;
    if (!matchesStatus) return false;
    if (!normalizedQuery) return true;
    return `${row.name} ${row.roll}`.toLowerCase().includes(normalizedQuery);
  }), [studentRows, statusFilter, normalizedQuery]);

  const totalStudents = roster.length || Number(selectedSection?.studentCount || 0);
  const dailyMarked = statusCounts.PRESENT + statusCounts.ABSENT + statusCounts.LATE;
  const dailyRate = dailyMarked
    ? Math.round(((statusCounts.PRESENT + statusCounts.LATE) / dailyMarked) * 100)
    : 0;

  const summaryPresent = Number(summary?.present || 0);
  const summaryAbsent = Number(summary?.absent || 0);
  const summaryLate = Number(summary?.late || 0);
  const summaryTotal = Number(summary?.total || 0);
  const rangeDays = inclusiveDays(range.from, range.to);
  const rangeRate = summaryTotal
    ? Math.round(((summaryPresent + summaryLate) / summaryTotal) * 100)
    : 0;
  const averagePerDay = rangeDays ? Math.round(summaryTotal / rangeDays) : 0;
  const rangeInvalid = Boolean(range.from && range.to && range.from > range.to);
  const rangeMissing = mode === "range" && (!range.from || !range.to);
  const dateMissing = mode === "daily" && !dailyDate;
  const rangeIssue = rangeInvalid || rangeMissing || dateMissing;

  const donutStyle = useMemo(() => {
    if (!summaryTotal) return undefined;
    const presentEnd = (summaryPresent / summaryTotal) * 100;
    const lateEnd = presentEnd + (summaryLate / summaryTotal) * 100;
    return {
      background: `conic-gradient(from -90deg, #059669 0% ${presentEnd}%, #d97706 ${presentEnd}% ${lateEnd}%, #e11d48 ${lateEnd}% 100%)`,
    };
  }, [summaryPresent, summaryLate, summaryTotal]);

  const statsLoading = referenceLoading || (mode === "daily"
    ? Boolean(sectionId) && !dailyLoaded && !dailyError && !dateMissing
    : Boolean(sectionId) && !summaryLoaded && !summaryError && !rangeIssue);

  const viewLoading = mode === "daily"
    ? dailyLoading || (Boolean(sectionId) && !dailyLoaded && !dailyError && !dateMissing)
    : summaryLoading || (Boolean(sectionId) && !summaryLoaded && !summaryError && !rangeIssue);

  const busy = referenceLoading || dailyLoading || summaryLoading || rosterLoading;

  function handleClassChange(event) {
    const nextClassId = event.target.value;
    setClassId(nextClassId);
    const firstSection = sections.find((section) => (
      String(section.classId) === String(nextClassId) && !isArchived(section)
    ));
    setSectionId(firstSection ? String(firstSection.id) : "");
    setQuery("");
    setStatusFilter("ALL");
  }

  function handleSectionChange(event) {
    setSectionId(event.target.value);
    setQuery("");
    setStatusFilter("ALL");
  }

  function handleRangeChange(field, value) {
    setRange((previous) => ({ ...previous, [field]: value }));
  }

  function handlePreset(key) {
    setRange(getPresetRange(key));
  }

  function handleRefresh() {
    setRefreshKey((previous) => previous + 1);
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
  }

  const activePreset = useMemo(() => {
    const today = todayISO();
    if (range.from === today && range.to === today) return "today";
    if (range.from === addDays(today, -6) && range.to === today) return "7d";
    if (range.from === addDays(today, -29) && range.to === today) return "30d";
    if (range.from === `${today.slice(0, 8)}01` && range.to === today) return "month";
    return "custom";
  }, [range.from, range.to]);

  const statusOptions = [
    { key: "ALL", label: "All", count: studentRows.length, tone: null },
    { key: "PRESENT", label: "Present", count: statusCounts.PRESENT, tone: "present" },
    { key: "ABSENT", label: "Absent", count: statusCounts.ABSENT, tone: "absent" },
    { key: "LATE", label: "Late", count: statusCounts.LATE, tone: "late" },
    { key: "UNMARKED", label: "Unmarked", count: statusCounts.UNMARKED, tone: "unmarked" },
  ];

  const dailyStats = [
    {
      label: "Total students",
      value: formatCount(totalStudents),
      meta: selectedSection
        ? `${selectedSection.className || "Class"} · ${selectedSection.name || "Section"}`
        : "Select a section to begin",
      tone: "indigo",
      icon: <Users size={16} />,
      lead: true,
    },
    {
      label: "Present",
      value: formatCount(statusCounts.PRESENT),
      meta: `${percent(statusCounts.PRESENT, dailyMarked)}% of marked`,
      tone: "emerald",
      icon: <CheckCircle2 size={16} />,
    },
    {
      label: "Absent",
      value: formatCount(statusCounts.ABSENT),
      meta: `${percent(statusCounts.ABSENT, dailyMarked)}% of marked`,
      tone: "rose",
      icon: <XCircle size={16} />,
    },
    {
      label: "Late",
      value: formatCount(statusCounts.LATE),
      meta: `${percent(statusCounts.LATE, dailyMarked)}% of marked`,
      tone: "amber",
      icon: <Clock size={16} />,
    },
    {
      label: "Attendance rate",
      value: dailyMarked ? dailyRate : "—",
      suffix: dailyMarked ? "%" : "",
      meta: dailyMarked ? "Present + late over marked" : "No marks yet",
      tone: "violet",
      icon: <TrendingUp size={16} />,
      lead: true,
      gradient: true,
    },
  ];

  const rangeStats = [
    {
      label: "Total students",
      value: formatCount(totalStudents),
      meta: selectedSection
        ? `${selectedSection.className || "Class"} · ${selectedSection.name || "Section"}`
        : "Select a section to begin",
      tone: "indigo",
      icon: <Users size={16} />,
      lead: true,
    },
    {
      label: "Present",
      value: formatCount(summaryPresent),
      meta: `${percent(summaryPresent, summaryTotal)}% of records`,
      tone: "emerald",
      icon: <CheckCircle2 size={16} />,
    },
    {
      label: "Absent",
      value: formatCount(summaryAbsent),
      meta: `${percent(summaryAbsent, summaryTotal)}% of records`,
      tone: "rose",
      icon: <XCircle size={16} />,
    },
    {
      label: "Late",
      value: formatCount(summaryLate),
      meta: `${percent(summaryLate, summaryTotal)}% of records`,
      tone: "amber",
      icon: <Clock size={16} />,
    },
    {
      label: "Attendance rate",
      value: summaryTotal ? rangeRate : "—",
      suffix: summaryTotal ? "%" : "",
      meta: summaryTotal ? `Across ${rangeDays} day${rangeDays === 1 ? "" : "s"}` : "No records in range",
      tone: "violet",
      icon: <TrendingUp size={16} />,
      lead: true,
      gradient: true,
    },
  ];

  const selectedStats = mode === "daily" ? dailyStats : rangeStats;
  const selectedLabel = selectedSection
    ? `${selectedSection.className || "Class"} ${selectedSection.name || ""}`.trim()
    : "No section selected";

  if (!referenceLoading && sections.length === 0) {
    return (
      <div className="aw-page">
        <PageHero yearLabel={yearLabel} busy={busy} onRefresh={handleRefresh} />
        {referenceError && (
          <div className="aw-banner aw-banner--error" role="alert">
            <AlertTriangle size={18} />
            <p>{referenceError}</p>
            <button
              type="button"
              className="aw-btn aw-btn--ghost"
              onClick={() => setReferenceKey((key) => key + 1)}
            >
              Retry
            </button>
          </div>
        )}
        <section className="aw-panel">
          <div className="aw-empty">
            <span className="aw-empty__icon"><Layers size={26} /></span>
            <h3>No sections available</h3>
            <p>
              Attendance records are organized by class sections. Please create a class
              and assign sections in Academic Management to view attendance registers.
            </p>
            <Link to="/classes" className="aw-btn aw-btn--primary">
              Open classes
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="aw-page">
      <PageHero yearLabel={yearLabel} busy={busy} onRefresh={handleRefresh} />

      {referenceError && (
        <div className="aw-banner aw-banner--warning" role="alert">
          <AlertTriangle size={18} />
          <p>{referenceError}</p>
          <button
            type="button"
            className="aw-btn aw-btn--ghost"
            onClick={() => setReferenceKey((key) => key + 1)}
          >
            Retry filters
          </button>
        </div>
      )}

      {/* Bento Grid Quick-Stats Summary Bar */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : (
        <section className="aw-stats" aria-label="Attendance summary metrics">
          {selectedStats.map((stat, index) => (
            <StatTile key={stat.label} {...stat} index={index} />
          ))}
        </section>
      )}

      {/* Control Bar: Class, Section, Mode, Date/Range, and Real-time Search */}
      <section className="aw-controls" aria-label="Attendance controls rail">
        <div className="aw-field">
          <label className="aw-field__label" htmlFor="attendance-class">Class</label>
          <div className="aw-input-wrap aw-input-wrap--select">
            <select
              id="attendance-class"
              value={classId}
              onChange={handleClassChange}
              disabled={referenceLoading || !classOptions.length}
            >
              <option value="">Select class</option>
              {classOptions.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="aw-select-caret" />
          </div>
        </div>

        <div className="aw-field aw-field--wide">
          <label className="aw-field__label" htmlFor="attendance-section">Section</label>
          <div className="aw-input-wrap aw-input-wrap--select">
            <select
              id="attendance-section"
              value={sectionId}
              onChange={handleSectionChange}
              disabled={referenceLoading || !sectionOptions.length}
            >
              <option value="">Select a section</option>
              {sectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                  {section.academicYearName ? ` · ${section.academicYearName}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="aw-select-caret" />
          </div>
        </div>

        <div className="aw-field">
          <span className="aw-field__label">View mode</span>
          <div className="aw-segmented" role="group" aria-label="Attendance view mode">
            <button
              type="button"
              className={mode === "daily" ? "active" : ""}
              aria-pressed={mode === "daily"}
              onClick={() => setMode("daily")}
            >
              <Calendar size={14} />
              Daily
            </button>
            <button
              type="button"
              className={mode === "range" ? "active" : ""}
              aria-pressed={mode === "range"}
              onClick={() => setMode("range")}
            >
              <TrendingUp size={14} />
              Range
            </button>
          </div>
        </div>

        {mode === "daily" ? (
          <div className="aw-field">
            <label className="aw-field__label" htmlFor="attendance-date">Register date</label>
            <div className="aw-input-wrap aw-input-wrap--icon">
              <CalendarDays size={15} />
              <input
                id="attendance-date"
                type="date"
                value={dailyDate}
                onChange={(event) => setDailyDate(event.target.value)}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="aw-field">
              <label className="aw-field__label" htmlFor="attendance-from">From date</label>
              <div className="aw-input-wrap aw-input-wrap--icon">
                <CalendarDays size={15} />
                <input
                  id="attendance-from"
                  type="date"
                  value={range.from}
                  max={range.to || undefined}
                  onChange={(event) => handleRangeChange("from", event.target.value)}
                />
              </div>
            </div>
            <div className="aw-field">
              <label className="aw-field__label" htmlFor="attendance-to">To date</label>
              <div className="aw-input-wrap aw-input-wrap--icon">
                <CalendarDays size={15} />
                <input
                  id="attendance-to"
                  type="date"
                  value={range.to}
                  min={range.from || undefined}
                  onChange={(event) => handleRangeChange("to", event.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {mode === "daily" && (
          <div className="aw-field aw-field--grow">
            <label className="aw-field__label" htmlFor="attendance-search">Search student</label>
            <div className="aw-input-wrap aw-input-wrap--icon">
              <Search size={15} />
              <input
                id="attendance-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or roll / admission no."
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className="aw-input-wrap__clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear search query"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter Chips / Presets */}
        {mode === "daily" ? (
          <div className="aw-chips" aria-label="Filter roster by status">
            {statusOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className="aw-chip"
                data-active={statusFilter === option.key}
                onClick={() => setStatusFilter(option.key)}
                aria-pressed={statusFilter === option.key}
              >
                {option.tone && <span className={`aw-chip__dot aw-chip__dot--${option.tone}`} />}
                {option.label}
                <span className="aw-chip__count">{option.count}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="aw-chips" aria-label="Date range quick presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className="aw-chip"
                data-active={activePreset === preset.key}
                onClick={() => handlePreset(preset.key)}
                aria-pressed={activePreset === preset.key}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Inline banners for validation or warnings */}
      {(rangeIssue || (mode === "daily" ? dailyError : summaryError)) && (
        <div className="aw-banner aw-banner--error" role="alert">
          <AlertTriangle size={18} />
          <p>
            {dateMissing
              ? "Please select a date to view the register."
              : rangeMissing
                ? "Please choose both a start date and an end date."
                : rangeInvalid
                  ? "The start date must be earlier than or equal to the end date."
                  : mode === "daily" ? dailyError : summaryError}
          </p>
          {!rangeIssue && (
            <button type="button" className="aw-btn aw-btn--ghost" onClick={handleRefresh}>
              Retry
            </button>
          )}
        </div>
      )}

      {rosterError && (
        <div className="aw-banner aw-banner--warning" role="status">
          <Info size={18} />
          <p>
            Student roster could not be fully loaded. Showing students with recorded attendance marks. {rosterError}
          </p>
          <button type="button" className="aw-btn aw-btn--ghost" onClick={handleRefresh}>
            Retry roster
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {mode === "daily" ? (
        /* DAILY VIEW */
        <section className="aw-panel aw-table-card" aria-labelledby="daily-register-title">
          <div className="aw-panel__head">
            <div>
              <h2 className="aw-panel__title" id="daily-register-title">Daily register</h2>
              <p className="aw-panel__meta">
                <span>{formatDate(dailyDate)}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{dailyMarked} of {studentRows.length || totalStudents} marked</span>
              </p>
            </div>
            <span className="aw-badge aw-badge--unmarked">Single day view</span>
          </div>

          {dailyLoaded && dailyMarked === 0 && studentRows.length > 0 && !dailyError && (
            <div className="aw-banner aw-banner--warning" style={{ margin: "12px 20px 0" }}>
              <Info size={16} />
              <p>
                Attendance has not been recorded by the class teacher yet for {formatDate(dailyDate)}.
                Showing all {studentRows.length} enrolled students as unmarked.
              </p>
            </div>
          )}

          {dailyError ? (
            <div className="aw-empty">
              <span className="aw-empty__icon"><AlertTriangle size={26} /></span>
              <h3>Unable to load register</h3>
              <p>{dailyError}</p>
              <button type="button" className="aw-btn aw-btn--primary" onClick={handleRefresh}>
                <RefreshCw size={15} />
                Try again
              </button>
            </div>
          ) : dateMissing ? (
            <div className="aw-empty">
              <span className="aw-empty__icon"><CalendarDays size={26} /></span>
              <h3>Choose a register date</h3>
              <p>Select a date above to display attendance records for this section.</p>
            </div>
          ) : !sectionId ? (
            <div className="aw-empty">
              <span className="aw-empty__icon"><Layers size={26} /></span>
              <h3>Choose a class and section</h3>
              <p>Select a section from the controls above to load the live register.</p>
            </div>
          ) : viewLoading ? (
            <div className="aw-table-skeleton" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="aw-row-skeleton">
                  <div className="aw-skel aw-skel--text" />
                  <div className="aw-skel aw-skel--text aw-skel--short" />
                  <div className="aw-skel aw-skel--text aw-skel--short" />
                  <div className="aw-skel aw-skel--text" />
                  <div className="aw-skel aw-skel--text aw-skel--short" />
                </div>
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="aw-empty">
              <span className="aw-empty__icon"><Search size={26} /></span>
              <h3>{studentRows.length ? "No students matching your filter" : "No attendance records"}</h3>
              <p>
                {studentRows.length
                  ? "Try adjusting your search query or status filter."
                  : "No attendance has been saved by teachers for this section on this date."}
              </p>
              {studentRows.length ? (
                <button type="button" className="aw-btn aw-btn--ghost" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <button type="button" className="aw-btn aw-btn--primary" onClick={handleRefresh}>
                  <RefreshCw size={15} />
                  Refresh register
                </button>
              )}
            </div>
          ) : (
            <div className="aw-table-scroll">
              <table className="aw-table">
                <caption className="aw-sr-only">
                  Attendance register for {selectedLabel} on {formatDate(dailyDate)}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Admission / Roll No.</th>
                    <th scope="col">Status</th>
                    <th scope="col">Marked On</th>
                    <th scope="col">Marked By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={row.key} style={{ "--aw-i": Math.min(index, 14) }}>
                      <td data-label="Student">
                        <div className="aw-student">
                          <span className={`aw-avatar aw-avatar--${statusTone(row.status)}`}>
                            {initials(row.name)}
                          </span>
                          <div>
                            <span className="aw-student__name">{row.name}</span>
                            <span className="aw-student__sub">
                              {row.status === "UNMARKED" ? "Pending mark" : "Section roster"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Admission / Roll No.">
                        <span className="aw-roll">{row.roll}</span>
                      </td>
                      <td data-label="Status">
                        <span className={`aw-badge aw-badge--${statusTone(row.status)}`}>
                          {row.status === "PRESENT" && <CheckCircle2 size={12} className="inline mr-1" />}
                          {row.status === "ABSENT" && <XCircle size={12} className="inline mr-1" />}
                          {row.status === "LATE" && <Clock size={12} className="inline mr-1" />}
                          {row.status === "UNMARKED" ? "Unmarked" : row.status}
                        </span>
                      </td>
                      <td data-label="Marked On">
                        {row.markedOn ? (
                          <span className="aw-marked-date">{formatDate(row.markedOn)}</span>
                        ) : (
                          <span className="aw-muted">Not recorded</span>
                        )}
                      </td>
                      <td data-label="Marked By">
                        {row.markedBy ? (
                          <span className="aw-staff">Staff #{row.markedBy}</span>
                        ) : (
                          <span className="aw-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        /* SUMMARY VIEW */
        <>
          {rangeIssue ? (
            <section className="aw-panel">
              <div className="aw-empty">
                <span className="aw-empty__icon"><CalendarDays size={26} /></span>
                <h3>Select a date range</h3>
                <p>
                  {rangeMissing
                    ? "Choose both a start date and an end date to generate the aggregate report."
                    : "The start date must be on or before the end date."}
                </p>
                {rangeMissing && (
                  <button
                    type="button"
                    className="aw-btn aw-btn--primary"
                    onClick={() => handlePreset("7d")}
                  >
                    Use last 7 days
                  </button>
                )}
              </div>
            </section>
          ) : !sectionId ? (
            <section className="aw-panel">
              <div className="aw-empty">
                <span className="aw-empty__icon"><Layers size={26} /></span>
                <h3>Choose a class and section</h3>
                <p>Pick a section to view aggregated attendance reports across your chosen range.</p>
              </div>
            </section>
          ) : viewLoading ? (
            <section className="aw-panel">
              <div className="aw-range-skeleton" aria-hidden="true">
                <div className="aw-skel aw-skel--ring" />
                <div className="aw-range-skeleton__bars">
                  <div className="aw-skel aw-skel--line" />
                  <div className="aw-skel aw-skel--line" />
                  <div className="aw-skel aw-skel--line" />
                </div>
              </div>
            </section>
          ) : summaryError ? (
            <section className="aw-panel">
              <div className="aw-empty">
                <span className="aw-empty__icon"><AlertTriangle size={26} /></span>
                <h3>The range summary could not be loaded</h3>
                <p>{summaryError}</p>
                <button type="button" className="aw-btn aw-btn--primary" onClick={handleRefresh}>
                  <RefreshCw size={15} />
                  Retry summary
                </button>
              </div>
            </section>
          ) : summaryTotal === 0 ? (
            <section className="aw-panel">
              <div className="aw-empty">
                <span className="aw-empty__icon"><Clock size={26} /></span>
                <h3>No attendance recorded in this range</h3>
                <p>
                  No attendance records were found for {selectedLabel} between {rangeSubtitle(range.from, range.to)}.
                </p>
                <button type="button" className="aw-btn aw-btn--ghost" onClick={() => handlePreset("30d")}>
                  Expand to last 30 days
                </button>
              </div>
            </section>
          ) : (
            <div className="aw-range-grid">
              {/* Donut Card */}
              <section className="aw-panel aw-donut-card" aria-labelledby="range-distribution-title">
                <div className="aw-panel__head">
                  <div>
                    <h2 className="aw-panel__title" id="range-distribution-title">
                      Distribution
                    </h2>
                    <p className="aw-panel__meta">{rangeSubtitle(range.from, range.to)}</p>
                  </div>
                  <span className="aw-badge aw-badge--present">
                    {rangeRate}% rate
                  </span>
                </div>
                <div className="aw-donut-layout">
                  <div className="aw-donut" style={donutStyle}>
                    <div className="aw-donut__hole">
                      <span className="aw-donut__percent">{rangeRate}%</span>
                      <span className="aw-donut__caption">Attendance</span>
                    </div>
                  </div>
                  <div className="aw-donut-legend">
                    <div className="aw-legend-row aw-tone-emerald">
                      <span className="aw-legend-row__dot" />
                      <span className="aw-legend-row__label">Present</span>
                      <strong className="aw-legend-row__count">{formatCount(summaryPresent)}</strong>
                      <span className="aw-legend-row__pct">{percent(summaryPresent, summaryTotal)}%</span>
                    </div>
                    <div className="aw-legend-row aw-tone-amber">
                      <span className="aw-legend-row__dot" />
                      <span className="aw-legend-row__label">Late</span>
                      <strong className="aw-legend-row__count">{formatCount(summaryLate)}</strong>
                      <span className="aw-legend-row__pct">{percent(summaryLate, summaryTotal)}%</span>
                    </div>
                    <div className="aw-legend-row aw-tone-rose">
                      <span className="aw-legend-row__dot" />
                      <span className="aw-legend-row__label">Absent</span>
                      <strong className="aw-legend-row__count">{formatCount(summaryAbsent)}</strong>
                      <span className="aw-legend-row__pct">{percent(summaryAbsent, summaryTotal)}%</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Progress Meters Card */}
              <section className="aw-panel aw-meters-card" aria-labelledby="range-breakdown-title">
                <div className="aw-panel__head">
                  <div>
                    <h2 className="aw-panel__title" id="range-breakdown-title">
                      Metric breakdown
                    </h2>
                    <p className="aw-panel__meta">
                      {formatCount(summaryTotal)} total logs across {rangeDays} days
                    </p>
                  </div>
                  <span className="aw-badge aw-badge--unmarked">
                    ~{averagePerDay}/day avg
                  </span>
                </div>

                <div className="aw-meters">
                  <RangeMeter
                    label="Present records"
                    value={summaryPresent}
                    total={summaryTotal}
                    tone="emerald"
                  />
                  <RangeMeter
                    label="Late records"
                    value={summaryLate}
                    total={summaryTotal}
                    tone="amber"
                  />
                  <RangeMeter
                    label="Absent records"
                    value={summaryAbsent}
                    total={summaryTotal}
                    tone="rose"
                  />
                </div>

                <div className="aw-range-summary-tiles">
                  <div className="aw-mini-tile">
                    <span className="aw-mini-tile__label">Range duration</span>
                    <strong className="aw-mini-tile__value">{rangeDays} Days</strong>
                  </div>
                  <div className="aw-mini-tile">
                    <span className="aw-mini-tile__label">Active roster</span>
                    <strong className="aw-mini-tile__value">{totalStudents} Students</strong>
                  </div>
                  <div className="aw-mini-tile">
                    <span className="aw-mini-tile__label">Compliance score</span>
                    <strong className="aw-mini-tile__value text-emerald-600">{rangeRate}%</strong>
                  </div>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
