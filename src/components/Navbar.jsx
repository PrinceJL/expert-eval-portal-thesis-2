import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function SunIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0V2a1 1 0 0 1 1-1Zm0 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm11-7a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM4 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm15.071-6.071a1 1 0 0 1 0 1.414l-.707.707A1 1 0 0 1 16.95 6.636l.707-.707a1 1 0 0 1 1.414 0ZM7.05 16.95a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0Zm12.021 1.414a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 0 1 1.414-1.414l.707.707ZM7.05 7.05a1 1 0 0 1-1.414 0l-.707-.707A1 1 0 0 1 6.343 4.93l.707.707a1 1 0 0 1 0 1.414ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4v-3.2a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0m6 0H9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Navbar() {
  const { isAuthed, user, logout, setPresenceStatus } = useAuth();
  const location = useLocation();
  const THEME_SWITCH_MS = 280;

  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem("themeMode") || "auto";
    } catch {
      return "auto";
    }
  });
  const [resolvedTheme, setResolvedTheme] = useState("light");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopSidebarHidden, setIsDesktopSidebarHidden] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebarHiddenDesktop");
      if (saved === null) return true;
      return saved === "1";
    } catch {
      return true;
    }
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isPresenceMenuOpen, setIsPresenceMenuOpen] = useState(false);
  const [presenceMenuSide, setPresenceMenuSide] = useState("left");
  const [presenceSaving, setPresenceSaving] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });

  const themeSwitchTimerRef = useRef(null);
  const hasThemeMountedRef = useRef(false);
  const profileWrapRef = useRef(null);
  const notificationWrapRef = useRef(null);
  const presenceTriggerRef = useRef(null);
  const presenceMenuRef = useRef(null);

  const isAdmin = user?.role === "ADMIN" || user?.role === "RESEARCHER";
  const displayName = user?.username || "User";
  const displayEmail = user?.email || "No email on account";
  const avatarLetter = String(displayName).charAt(0).toUpperCase() || "U";

  const currentPresenceRaw = String(user?.presenceStatus || "online").toLowerCase();
  const currentPresence = ["online", "dnd", "invisible"].includes(currentPresenceRaw)
    ? currentPresenceRaw
    : "online";

  const presenceOptions = [
    { value: "online", label: "Online", color: "#22c55e", description: "Automatic online, idle, and offline with activity." },
    { value: "dnd", label: "Do Not Disturb", color: "#ef4444", description: "Notifications muted." },
    { value: "invisible", label: "Invisible", color: "#94a3b8", description: "You appear offline to others." }
  ];
  const currentPresenceOption = presenceOptions.find((o) => o.value === currentPresence) || presenceOptions[0];
  const notifications = [
    { id: 1, title: "New evaluation assigned", time: "2m ago", unread: true },
    { id: 2, title: "Message from admin", time: "14m ago", unread: true },
    { id: 3, title: "System health update", time: "1h ago", unread: false }
  ];
  const unreadCount = notifications.filter((n) => n.unread).length;

  const mainLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/evaluation", label: "Evaluation" },
    { to: "/messaging", label: "Messaging" },
    { to: "/contact", label: "Contact Us" }
  ];
  const managementLinks = isAdmin
    ? [
      { to: "/admin/users", label: "User Management" },
      { to: "/admin/contact", label: "Contact Info" }
    ]
    : [];

  const startThemeSwitchAnimation = () => {
    const root = document.documentElement;
    root.classList.add("theme-switching");
    if (themeSwitchTimerRef.current) {
      window.clearTimeout(themeSwitchTimerRef.current);
    }
    themeSwitchTimerRef.current = window.setTimeout(() => {
      root.classList.remove("theme-switching");
      themeSwitchTimerRef.current = null;
    }, THEME_SWITCH_MS);
  };

  const isDark = resolvedTheme === "dark";
  const palette = isDark
    ? {
      sidebarBg: "#0c131f",
      sidebarBorder: "#1e2b3e",
      text: "#e5edf8",
      brand: "#f8fbff",
      muted: "#8ea2bf",
      searchBg: "#101c2d",
      searchBorder: "#273a56",
      searchText: "#dce6f7",
      link: "#afc1da",
      linkActiveText: "#f6f9ff",
      linkActiveBg: "#1a2a42",
      linkActiveBorder: "#36527a",
      menuBg: "#111b2c",
      menuBorder: "#2a405e",
      menuHover: "#1b2d46",
      chipBg: "#15243a",
      chipBorder: "#324d73",
      shadow: "0 16px 34px rgba(0,0,0,0.34)"
    }
    : {
      sidebarBg: "rgba(245, 248, 253, 0.74)",
      sidebarBorder: "#d8e0ec",
      text: "#1f2937",
      brand: "#0f172a",
      muted: "#6b7280",
      searchBg: "rgba(255, 255, 255, 0.92)",
      searchBorder: "#d2dbea",
      searchText: "#1f2937",
      link: "#4b5563",
      linkActiveText: "#2554c7",
      linkActiveBg: "#ebf2ff",
      linkActiveBorder: "#c5d8ff",
      menuBg: "#ffffff",
      menuBorder: "#d0dbea",
      menuHover: "#edf3fd",
      chipBg: "#f3f7fd",
      chipBorder: "#d0dbea",
      shadow: "0 14px 30px rgba(15, 23, 42, 0.16)"
    };

  const isLightActive = themeMode === "light" || (themeMode === "auto" && resolvedTheme === "light");
  const isDarkActive = themeMode === "dark" || (themeMode === "auto" && resolvedTheme === "dark");
  const showFloatingToggle = !isDesktopViewport || isDesktopSidebarHidden;

  async function handlePresenceChange(nextStatus) {
    if (presenceSaving || currentPresence === nextStatus) return;
    try {
      setPresenceSaving(true);
      await setPresenceStatus(nextStatus);
      setIsPresenceMenuOpen(false);
    } finally {
      setPresenceSaving(false);
    }
  }

  function togglePresenceMenu() {
    if (isPresenceMenuOpen) {
      setIsPresenceMenuOpen(false);
      return;
    }

    const triggerRect = presenceTriggerRef.current?.getBoundingClientRect();
    const submenuWidth = 286;
    if (triggerRect) {
      const spaceRight = window.innerWidth - triggerRect.right;
      const spaceLeft = triggerRect.left;
      setPresenceMenuSide(spaceRight >= submenuWidth ? "right" : (spaceLeft >= submenuWidth ? "left" : "right"));
    } else {
      setPresenceMenuSide("left");
    }
    setIsPresenceMenuOpen(true);
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const nextResolved = themeMode === "auto" ? (media.matches ? "dark" : "light") : themeMode;
      if (hasThemeMountedRef.current) {
        startThemeSwitchAnimation();
      } else {
        hasThemeMountedRef.current = true;
      }
      setResolvedTheme(nextResolved);
      document.documentElement.setAttribute("data-theme", nextResolved);
      document.documentElement.style.colorScheme = nextResolved;
    };

    applyTheme();
    try {
      localStorage.setItem("themeMode", themeMode);
    } catch {
      // ignore storage errors
    }

    if (themeMode !== "auto") return undefined;
    if (media.addEventListener) {
      media.addEventListener("change", applyTheme);
      return () => media.removeEventListener("change", applyTheme);
    }
    media.addListener(applyTheme);
    return () => media.removeListener(applyTheme);
  }, [themeMode]);

  useEffect(() => {
    setIsMobileOpen(false);
    setIsProfileOpen(false);
    setIsNotificationOpen(false);
    setIsPresenceMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => setIsDesktopViewport(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-sidebar-hidden", isDesktopSidebarHidden ? "1" : "0");
    try {
      localStorage.setItem("sidebarHiddenDesktop", isDesktopSidebarHidden ? "1" : "0");
    } catch {
      // ignore storage errors
    }
    return () => {
      document.documentElement.removeAttribute("data-sidebar-hidden");
    };
  }, [isDesktopSidebarHidden]);

  useEffect(() => {
    const onPointerDown = (event) => {
      const inProfile = profileWrapRef.current?.contains(event.target);
      const inNotification = notificationWrapRef.current?.contains(event.target);
      if (!inProfile) {
        setIsProfileOpen(false);
        setIsPresenceMenuOpen(false);
      }
      if (!inNotification) {
        setIsNotificationOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
        setIsProfileOpen(false);
        setIsNotificationOpen(false);
        setIsPresenceMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => () => {
    if (themeSwitchTimerRef.current) {
      window.clearTimeout(themeSwitchTimerRef.current);
      themeSwitchTimerRef.current = null;
    }
    document.documentElement.classList.remove("theme-switching");
  }, []);

  if (!isAuthed) return null;

  return (
    <>
      <button
        type="button"
        className="app-sidebar-toggle"
        onClick={() => {
          if (isDesktopViewport) {
            setIsDesktopSidebarHidden((prev) => !prev);
          } else {
            setIsMobileOpen((prev) => !prev);
          }
        }}
        aria-label="Toggle navigation"
        style={{
          display: showFloatingToggle ? "inline-flex" : "none",
          background: palette.searchBg,
          border: `1px solid ${palette.searchBorder}`,
          color: palette.text,
          boxShadow: palette.shadow
        }}
      >
        {(isMobileOpen || (isDesktopViewport && !isDesktopSidebarHidden)) ? <CloseIcon /> : <MenuIcon />}
      </button>

      {isMobileOpen ? (
        <button
          type="button"
          className="app-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`app-sidebar ${isMobileOpen ? "app-sidebar-open" : ""}`}
        style={{
          background: palette.sidebarBg,
          borderRight: `1px solid ${palette.sidebarBorder}`,
          color: palette.text
        }}
      >
        <div className="app-sidebar-inner">
          <header className="app-sidebar-brand-row">
            <div className="app-sidebar-brand-wrap">
              <span className="app-sidebar-brand-dot" />
              <span className="app-sidebar-brand-text" style={{ color: palette.brand }}>
                Eval Portal
              </span>
            </div>
            <div className="app-sidebar-head-right">
              <span className="app-sidebar-role-chip" style={{ color: palette.muted }}>
                {String(user?.role || "USER").toLowerCase()}
              </span>
              <button
                type="button"
                aria-label="Hide sidebar"
                title="Hide sidebar"
                className="app-sidebar-collapse-btn"
                onClick={() => {
                  if (isDesktopViewport) {
                    setIsDesktopSidebarHidden(true);
                  } else {
                    setIsMobileOpen(false);
                  }
                }}
                style={{ color: palette.muted }}
              >
                <CloseIcon />
              </button>
            </div>
          </header>

          <label
            className="app-sidebar-search"
            style={{
              background: palette.searchBg,
              border: `1px solid ${palette.searchBorder}`
            }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true" style={{ color: palette.muted }}>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
              <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input type="text" placeholder="Search" aria-label="Search" style={{ color: palette.searchText }} />
          </label>

          <div className="app-sidebar-section-title" style={{ color: palette.muted }}>Menu</div>
          <nav className="app-sidebar-nav">
            {mainLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `app-sidebar-link ${isActive ? "active" : ""}`}
                onClick={() => setIsMobileOpen(false)}
                style={({ isActive }) => ({
                  color: isActive ? palette.linkActiveText : palette.link,
                  background: isActive ? palette.linkActiveBg : "transparent",
                  borderColor: isActive ? palette.linkActiveBorder : "transparent"
                })}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {managementLinks.length ? (
            <>
              <div className="app-sidebar-section-title" style={{ color: palette.muted }}>Settings</div>
              <nav className="app-sidebar-nav">
                {managementLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => `app-sidebar-link ${isActive ? "active" : ""}`}
                    onClick={() => setIsMobileOpen(false)}
                    style={({ isActive }) => ({
                      color: isActive ? palette.linkActiveText : palette.link,
                      background: isActive ? palette.linkActiveBg : "transparent",
                      borderColor: isActive ? palette.linkActiveBorder : "transparent"
                    })}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </>
          ) : null}
          <div className="app-sidebar-spacer" />
        </div>
      </aside>

      <div className="app-topbar-tools">
        <button
          type="button"
          aria-label="Light mode"
          title="Light mode"
          className="app-topbar-icon-btn"
          onClick={() => setThemeMode("light")}
          style={{
            color: palette.text,
            background: isLightActive ? palette.menuHover : "transparent"
          }}
        >
          <SunIcon />
        </button>
        <button
          type="button"
          aria-label="Dark mode"
          title="Dark mode"
          className="app-topbar-icon-btn"
          onClick={() => setThemeMode("dark")}
          style={{
            color: palette.text,
            background: isDarkActive ? palette.menuHover : "transparent"
          }}
        >
          <MoonIcon />
        </button>

        <div ref={notificationWrapRef} className="app-topbar-notification-wrap">
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="app-topbar-icon-btn"
            onClick={() => setIsNotificationOpen((prev) => !prev)}
            style={{
              color: palette.text,
              background: isNotificationOpen ? palette.menuHover : "transparent"
            }}
          >
            <BellIcon />
            {unreadCount ? <span className="app-topbar-notification-dot" /> : null}
          </button>

          {isNotificationOpen ? (
            <div
              className="app-topbar-notification-menu"
              style={{
                background: palette.menuBg,
                border: `1px solid ${palette.menuBorder}`,
                color: palette.text,
                boxShadow: palette.shadow
              }}
            >
              <div className="app-topbar-notification-head">
                <span>Notifications</span>
                {unreadCount ? <span className="text-xs opacity-70">{unreadCount} new</span> : null}
              </div>
              <div className="app-topbar-notification-list">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className="app-topbar-notification-item"
                    style={{ background: item.unread ? palette.menuHover : "transparent" }}
                  >
                    <div className="app-topbar-notification-title-wrap">
                      <span className="app-topbar-notification-title">{item.title}</span>
                      {item.unread ? <span className="app-topbar-notification-unread" /> : null}
                    </div>
                    <span className="app-topbar-notification-time">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div ref={profileWrapRef} className="app-topbar-profile-wrap">
          <button
            type="button"
            className="app-topbar-avatar-btn"
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              if (isProfileOpen) setIsPresenceMenuOpen(false);
            }}
            aria-label="Open profile menu"
            style={{
              background: palette.chipBg,
              border: `1px solid ${palette.chipBorder}`,
              color: palette.text,
              boxShadow: palette.shadow
            }}
          >
            <span className="app-topbar-avatar-letter">{avatarLetter}</span>
            <span className="app-topbar-avatar-dot" style={{ background: currentPresenceOption.color }} />
          </button>

          {isProfileOpen ? (
            <div
              className="app-topbar-profile-menu"
              style={{
                background: palette.menuBg,
                border: `1px solid ${palette.menuBorder}`,
                color: palette.text,
                boxShadow: palette.shadow
              }}
            >
              <div className="app-topbar-profile-head">
                <p className="app-sidebar-user-name">{displayName}</p>
                <p className="app-sidebar-user-email" style={{ color: palette.muted }}>{displayEmail}</p>
              </div>

              <div className="app-sidebar-presence-wrap">
                <button
                  ref={presenceTriggerRef}
                  type="button"
                  onClick={togglePresenceMenu}
                  disabled={presenceSaving}
                  className="app-presence-btn"
                  style={{
                    background: palette.chipBg,
                    border: `1px solid ${palette.chipBorder}`,
                    color: palette.text
                  }}
                >
                  <span className="app-presence-label">
                    <span className="app-presence-dot" style={{ background: currentPresenceOption.color }} />
                    <span>{currentPresenceOption.label}</span>
                  </span>
                  <ChevronIcon />
                </button>

                {isPresenceMenuOpen ? (
                  <div
                    ref={presenceMenuRef}
                    className={`app-presence-menu ${presenceMenuSide === "left" ? "is-left" : ""}`}
                    style={{
                      background: palette.menuBg,
                      border: `1px solid ${palette.menuBorder}`,
                      boxShadow: palette.shadow
                    }}
                  >
                    {presenceOptions.map((opt) => {
                      const active = currentPresence === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={presenceSaving}
                          onClick={() => handlePresenceChange(opt.value)}
                          className="app-presence-menu-item"
                          style={{ background: active ? palette.menuHover : "transparent", color: palette.text }}
                        >
                          <span className="app-presence-label">
                            <span className="app-presence-dot" style={{ background: opt.color }} />
                            <span>{opt.label}</span>
                          </span>
                          <span className="app-presence-menu-desc" style={{ color: palette.muted }}>
                            {opt.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div
                className="app-profile-theme-row"
                style={{
                  background: palette.chipBg,
                  border: `1px solid ${palette.chipBorder}`
                }}
              >
                <button
                  type="button"
                  aria-label="Light mode"
                  title="Light mode"
                  className="app-theme-btn"
                  onClick={() => setThemeMode("light")}
                  style={{
                    color: palette.text,
                    background: isLightActive ? palette.menuHover : "transparent"
                  }}
                >
                  <SunIcon />
                </button>
                <button
                  type="button"
                  aria-label="Dark mode"
                  title="Dark mode"
                  className="app-theme-btn"
                  onClick={() => setThemeMode("dark")}
                  style={{
                    color: palette.text,
                    background: isDarkActive ? palette.menuHover : "transparent"
                  }}
                >
                  <MoonIcon />
                </button>
              </div>

              <div className="app-profile-menu-actions">
                <NavLink to="/contact" className="app-profile-menu-link" onClick={() => setIsProfileOpen(false)}>
                  Help
                </NavLink>
                <button
                  type="button"
                  className="app-profile-menu-link"
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout({ withTransition: true });
                  }}
                >
                  Log out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
