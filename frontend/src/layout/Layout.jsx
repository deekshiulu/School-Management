import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { api } from "../api/client.js";
import PasswordField from "../components/PasswordField.jsx";

const groups = [
  {
    key: "setup",
    label: "School setup",
    icon: "settings",
    links: [
      { to: "/school", label: "School profile", module: "school", icon: "school" },
      { to: "/years", label: "Academic year & terms", module: "school", icon: "calendar" },
      { to: "/student-promotion", label: "Student promotion", module: "students", icon: "student" },
      { to: "/classes", label: "Classes & sections", module: "classes", icon: "classes" },
      { to: "/timetable", label: "Timetable", module: "classes", icon: "calendar" },
      { to: "/subjects", label: "Departments & subjects", module: "subjects", icon: "book" }
    ]
  },
  {
    key: "people",
    label: "People",
    icon: "users",
    links: [
      { to: "/students", label: "Students", module: "students", icon: "student" },
      { to: "/guardians", label: "Guardians", module: "students", icon: "guardian" },
      { to: "/staff", label: "Staff", module: "staff", icon: "staff" },
      { to: "/assignments", label: "Teacher assignments", module: "staff", icon: "assignment" }
    ]
  },
  {
    key: "access",
    label: "Users & access",
    icon: "shield",
    links: [
      { to: "/users", label: "Users", module: "users", icon: "user" },
      { to: "/roles", label: "Roles & permissions", module: "users", icon: "key" }
    ]
  },
  {
    key: "finance",
    label: "Finance",
    icon: "finance",
    links: [
      { to: "/finance", label: "Finance dashboard", module: "finance", icon: "dashboard" },
      { to: "/payroll", label: "Teacher & staff payroll", module: "finance", icon: "staff" },
      { to: "/expenses", label: "Expenses", module: "finance", icon: "receipt" },
      { to: "/fee-heads", label: "Fee heads", module: "fees", icon: "tag" },
      { to: "/fee-structures", label: "Fee structures", module: "fees", icon: "layers" },
      { to: "/fee-accounts", label: "Student fee accounts", module: "fees", icon: "account" },
      { to: "/invoices", label: "Invoices & payments", module: "fees", icon: "receipt" },
      { to: "/reports", label: "Student fee reports", module: "fees", icon: "chart" },
      { to: "/financial-reports", label: "Financial reports", module: "finance", icon: "chart" }
    ]
  },
  {
    key: "administration",
    label: "Administration",
    icon: "clipboard",
    links: [
      { to: "/attendance", label: "Attendance", module: "students", icon: "calendar" },
      { to: "/assessments", label: "Assessments", module: "assessments", icon: "book" },
      { to: "/audit", label: "Audit log", module: "audit", icon: "history" }
    ]
  }
];

export default function Layout() {
  const { user, can, logout, updateUser } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [profileForm, setProfileForm] = useState({ fullName: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const visibleGroups = groups
    .map((group) => ({ ...group, links: group.links.filter((link) => can(link.module, "view")) }))
    .filter((group) => group.links.length);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  function openProfile() {
    setProfileForm({ fullName: user?.fullName || "", phone: user?.phone || "" });
    setProfileMessage("");
    setProfileError("");
    setDialog("profile");
    setProfileOpen(false);
  }

  function openPassword() {
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setProfileMessage("");
    setProfileError("");
    setDialog("password");
    setProfileOpen(false);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const updated = await api("/api/auth/me", "PUT", profileForm);
      updateUser(updated);
      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");
    try {
      await api("/api/auth/change-password", "POST", passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setProfileMessage("Password changed successfully.");
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  const displayName = user?.fullName || user?.username || "Account";
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const roles = Array.isArray(user?.roles) ? user.roles.map((role) => typeof role === "string" ? role : role.name).join(", ") : "—";

  return (
    <div className={`app-shell${menuOpen ? " menu-open" : ""}`}>
      <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Icon name="school" /></span>
          <div>
            <h1>School Enterprise</h1>
            <span>Administrator portal</span>
          </div>
        </div>
        <nav>
          {can("dashboard", "view") && (
            <NavLink className="nav-link dashboard-link" to="/" end>
              <Icon name="dashboard" /><span>Dashboard</span>
            </NavLink>
          )}
          {visibleGroups.map((group) => (
            <NavGroup key={group.key} group={group} pathname={location.pathname} />
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-footer-label">Signed in as</span>
          <strong>{user?.fullName || user?.username}</strong>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-start">
            <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Open menu">
              <Icon name="menu" />
              <span>Menu</span>
            </button>
            <div>
              <span className="topbar-eyebrow">Administrator portal</span>
              <strong>{user?.fullName || user?.username}</strong>
            </div>
          </div>
          <div className="profile-menu">
            <button type="button" className="profile-trigger" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}>
              <span className="profile-avatar">{initials}</span>
              <span className="profile-trigger-text"><strong>{displayName}</strong><small>{user?.email || user?.username}</small></span>
              <Icon name="chevron" />
            </button>
            {profileOpen && (
              <div className="profile-dropdown">
                <div className="profile-summary">
                  <span className="profile-avatar profile-avatar-large">{initials}</span>
                  <strong>{displayName}</strong>
                  <span>{user?.email || "—"}</span>
                  <span>Role: {roles || "—"}</span>
                  <span>Account: {user?.status || "ACTIVE"}</span>
                  <span>Phone: {user?.phone || "—"}</span>
                </div>
                <button type="button" onClick={openProfile}>Edit My Profile</button>
                <button type="button" onClick={openPassword}>Change Password</button>
                <button type="button" className="profile-signout" onClick={logout}><Icon name="logout" /> Sign Out</button>
              </div>
            )}
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
      {dialog && <div className="modal-backdrop" role="presentation" onClick={() => setDialog(null)}>
        <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header"><h2>{dialog === "profile" ? "Edit My Profile" : "Change Password"}</h2><button type="button" className="linkish" onClick={() => setDialog(null)}>Close</button></div>
          {profileError && <p className="error">{profileError}</p>}
          {profileMessage && <p className="ok">{profileMessage}</p>}
          {dialog === "profile" ? (
            <form className="form-card" onSubmit={saveProfile}>
              <label>Full name<input required value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} /></label>
              <label>Phone number<input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></label>
              <label>Username<input value={user?.username || ""} readOnly /></label>
              <label>Email<input value={user?.email || ""} readOnly /></label>
              <label>Role<input value={roles || "—"} readOnly /></label>
              <label>Account status<input value={user?.status || "ACTIVE"} readOnly /></label>
              <p className="muted">Profile photo is not supported by the current user system.</p>
              <button disabled={savingProfile}>{savingProfile ? "Saving..." : "Save profile"}</button>
            </form>
          ) : (
            <form className="form-card" onSubmit={changePassword}>
              <PasswordField required minLength={8} autoComplete="current-password" placeholder="Current password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
              <PasswordField required minLength={8} autoComplete="new-password" placeholder="New password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
              <PasswordField required minLength={8} autoComplete="new-password" placeholder="Confirm new password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
              <p className="muted">Use at least 8 characters. New password and confirmation must match.</p>
              <button disabled={savingProfile}>{savingProfile ? "Changing..." : "Change password"}</button>
            </form>
          )}
        </div>
      </div>}
    </div>
  );
}

function NavGroup({ group, pathname }) {
  const isCurrentGroup = group.links.some((link) => pathname === link.to || pathname.startsWith(`${link.to}/`));
  const [open, setOpen] = useState(isCurrentGroup);
  useEffect(() => {
    if (isCurrentGroup) setOpen(true);
  }, [isCurrentGroup]);

  return (
    <div className={`nav-group${open ? " is-open" : ""}`}>
      <button
        className={`nav-group-toggle${isCurrentGroup ? " is-current" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Icon name={group.icon} />
        <span>{group.label}</span>
        <Icon name="chevron" />
      </button>
      {open && (
        <div className="nav-group-links">
          {group.links.map((link) => (
            <NavLink className="nav-link" key={link.to} to={link.to}>
              <Icon name={link.icon} /><span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function Icon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    school: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M6 11v5c2 2 10 2 12 0v-5M21 9v6" /></>,
    settings: <><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /><circle cx="12" cy="12" r="4" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.8M17 15c2.5.3 4 2 4 5" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    finance: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M7 14h3" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M8 10h8M8 14h6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    classes: <><rect x="3" y="4" width="8" height="7" rx="1" /><rect x="13" y="4" width="8" height="7" rx="1" /><rect x="3" y="13" width="8" height="7" rx="1" /><rect x="13" y="13" width="8" height="7" rx="1" /></>,
    book: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21V4.5Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" /></>,
    student: <><circle cx="12" cy="8" r="3" /><path d="M5 21c.5-4 2.8-6 7-6s6.5 2 7 6M4 5l8-3 8 3-8 3-8-3Z" /></>,
    guardian: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20c.5-3.5 2.3-5 5.5-5s5 1.5 5.5 5M14 15c3 .1 4.5 1.7 5 4" /></>,
    staff: <><circle cx="12" cy="7" r="3" /><path d="M5 21c.5-4 2.8-6 7-6s6.5 2 7 6M4 12h4M16 12h4" /></>,
    assignment: <><path d="M4 5h16v14H4zM8 9h8M8 13h5" /><path d="m7 3 1 2M17 3l-1 2" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 21c.5-4 2.8-6 7-6s6.5 2 7 6" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 5l3 3M14 7l3 3" /></>,
    tag: <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-7 7-9-9a2 2 0 0 1-2-2Z" />,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    account: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 2.5-5 6-5 1.3 0 2.4.2 3.3.7M15 14v7M12.5 18.5h5" /></>,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v6h6M12 7v5l3 2" /></>,
    logout: <><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" /></>,
    chevron: <path d="m9 6 6 6-6 6" />,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>
  };

  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}
