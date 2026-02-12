import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
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
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
      />
    </svg>
  );
}

function DesktopIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 4a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h3v2a1 1 0 0 1-1 1h10a1 1 0 0 1-1-1v-2h3a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Zm0 2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5Z"
      />
    </svg>
  );
}

export default function Navbar() {
  const { isAuthed, user, logout, setPresenceStatus } = useAuth();
  const THEME_SWITCH_MS = 280;
  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem("themeMode") || "auto";
    } catch {
      return "auto";
    }
  });
  const [resolvedTheme, setResolvedTheme] = useState("light");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPresenceMenuOpen, setIsPresenceMenuOpen] = useState(false);
  const [presenceMenuSide, setPresenceMenuSide] = useState("right");
  const [presenceSaving, setPresenceSaving] = useState(false);
  const profileRef = useRef(null);
  const presenceTriggerRef = useRef(null);
  const hasThemeMountedRef = useRef(false);
  const themeSwitchTimerRef = useRef(null);

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

  const isAdmin = user?.role === "ADMIN" || user?.role === "RESEARCHER";
  const displayName = user?.username || "User";
  const displayEmail = user?.email || "No email on account";
  const avatarLetter = String(displayName).charAt(0).toUpperCase() || "U";
  const currentPresenceRaw = String(user?.presenceStatus || "online").toLowerCase();
  const currentPresence = ["online", "idle", "dnd", "invisible"].includes(currentPresenceRaw)
    ? currentPresenceRaw
    : "online";

  const presenceOptions = [
    { value: "online", label: "Online", color: "#22c55e" },
    { value: "idle", label: "Idle", color: "#f59e0b" },
    { value: "dnd", label: "Do Not Disturb", color: "#ef4444", description: "You will not receive desktop notifications" },
    { value: "invisible", label: "Invisible", color: "#94a3b8", description: "You will appear offline" }
  ];
  const currentPresenceOption = presenceOptions.find((o) => o.value === currentPresence) || presenceOptions[0];

  function getPresenceColor(mode) {
    return presenceOptions.find((o) => o.value === mode)?.color || "#94a3b8";
  }

  async function handlePresenceChange(nextStatus) {
    if (presenceSaving || currentPresence === nextStatus) return;
    try {
      setPresenceSaving(true);
      await setPresenceStatus(nextStatus);
      setIsPresenceMenuOpen(false);
    } catch {
      // Keep current status if update fails.
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
    const submenuWidth = 288;
    if (triggerRect) {
      const spaceRight = window.innerWidth - triggerRect.right;
      const spaceLeft = triggerRect.left;
      setPresenceMenuSide(spaceRight >= submenuWidth ? "right" : (spaceLeft >= submenuWidth ? "left" : "right"));
    } else {
      setPresenceMenuSide("right");
    }

    setIsPresenceMenuOpen(true);
  }

  const links = [
    { to: "/dashboard", label: "Dashboard", show: true },
    { to: "/evaluation", label: "Evaluation", show: true },
    { to: "/messaging", label: "Messaging", show: true },
    { to: "/contact", label: "Contact Us", show: true },
    { to: "/admin/users", label: "User Management", show: isAdmin },
    { to: "/admin/evaluations", label: "Evaluation Management", show: isAdmin },
    { to: "/admin/maintenance", label: "Maintenance Management", show: isAdmin },
    { to: "/admin/contact", label: "Contact Info", show: isAdmin },
  ].filter((x) => x.show);

  const isDark = resolvedTheme === "dark";
  const palette = isDark
    ? {
      navBg: "#111317",
      navBorder: "#2a2e36",
      navText: "#f4f7fb",
      brand: "#f8fbff",
      link: "#b8c0cc",
      linkActive: "#ffffff",
      linkActiveBg: "rgba(255,255,255,0.06)",
      avatarBg: "#1b1e24",
      avatarBorder: "#343943",
      avatarText: "#f3f6fb",
      panelBg: "#2b2d31",
      panelBorder: "#3a3d44",
      panelDivider: "#43464d",
      panelText: "#f0f3f8",
      subText: "#bec4ce",
      segmentBg: "#111319",
      segmentBorder: "#3f434a",
      segActive: "#3e434b",
      segText: "#d4dae5",
      menuText: "#f2f6fb",
      panelShadow: "0 20px 42px rgba(0,0,0,0.45)"
    }
    : {
      navBg: "#f8fafc",
      navBorder: "#dfe5ee",
      navText: "#111827",
      brand: "#0f172a",
      link: "#4b5563",
      linkActive: "#0f172a",
      linkActiveBg: "#e8edf6",
      avatarBg: "#ffffff",
      avatarBorder: "#ced6e2",
      avatarText: "#0f172a",
      panelBg: "#ffffff",
      panelBorder: "#d7dde8",
      panelDivider: "#e5eaf2",
      panelText: "#0f172a",
      subText: "#596274",
      segmentBg: "#f3f6fb",
      segmentBorder: "#d7deea",
      segActive: "#dbe4f2",
      segText: "#1e293b",
      menuText: "#0f172a",
      panelShadow: "0 16px 34px rgba(15,23,42,0.16)"
    };

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
    const onPointerDown = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
        setIsPresenceMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
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

  useEffect(() => {
    if (!isProfileOpen) setIsPresenceMenuOpen(false);
  }, [isProfileOpen]);

  useEffect(() => () => {
    if (themeSwitchTimerRef.current) {
      window.clearTimeout(themeSwitchTimerRef.current);
      themeSwitchTimerRef.current = null;
    }
    document.documentElement.classList.remove("theme-switching");
  }, []);

  if (!isAuthed) return null;

  return (
    <div
      className="navbar sticky top-0 z-30"
      style={{
        background: palette.navBg,
        borderBottom: `1px solid ${palette.navBorder}`,
        color: palette.navText,
      }}
    >
      <div className="container mx-auto flex justify-between items-center" style={{ maxWidth: 1200 }}>
        {/* Left */}
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold" style={{ color: palette.brand }}>Eval Portal</span>

          <ul className="menu menu-horizontal px-1 gap-1" style={{ color: palette.link }}>
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  className={({ isActive }) =>
                    isActive ? "font-semibold" : ""
                  }
                  style={({ isActive }) => ({
                    borderRadius: 10,
                    padding: "8px 10px",
                    color: isActive ? palette.linkActive : palette.link,
                    background: isActive ? palette.linkActiveBg : "transparent"
                  })}
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn-ghost btn-circle"
              aria-label="Open profile menu"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              style={{
                width: 38,
                height: 38,
                minHeight: 38,
                padding: 0,
                borderRadius: 999,
                background: palette.avatarBg,
                border: `1px solid ${palette.avatarBorder}`
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold relative"
                style={{ color: palette.avatarText }}
              >
                {avatarLetter}
                <span
                  className="absolute rounded-full border shadow-sm"
                  style={{
                    bottom: 1,
                    right: -1,
                    width: 9,
                    height: 9,
                    background: getPresenceColor(currentPresence),
                    borderColor: palette.avatarBg
                  }}
                  title={currentPresenceOption.label || "Presence"}
                />
              </div>
            </button>

            {isProfileOpen ? (
              <div
                className="w-72 rounded-2xl"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 10px)",
                  zIndex: 50,
                  background: palette.panelBg,
                  border: `1px solid ${palette.panelBorder}`,
                  boxShadow: palette.panelShadow,
                  color: palette.panelText
                }}
              >
                <div className="px-4 pt-3 pb-2">
                  <div className="font-semibold leading-tight truncate" style={{ fontSize: 20 }}>{displayName}</div>
                  <div className="text-sm truncate" style={{ color: palette.subText, marginTop: 4 }}>{displayEmail}</div>
                </div>

                <div className="px-4 py-3 relative" style={{ borderBottom: `1px solid ${palette.panelDivider}` }}>
                  <button
                    ref={presenceTriggerRef}
                    type="button"
                    className="focus:outline-none focus-visible:outline-none"
                    disabled={presenceSaving}
                    onClick={togglePresenceMenu}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      width: "100%",
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 10px",
                      textAlign: "left",
                      fontSize: 14,
                      color: palette.menuText,
                      background: isDark ? "rgba(255,255,255,0.06)" : "#eef2f9",
                      cursor: presenceSaving ? "wait" : "pointer",
                      outline: "none",
                      boxShadow: "none"
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: currentPresenceOption.color
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>{currentPresenceOption.label}</span>
                    </span>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {isPresenceMenuOpen ? (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: presenceMenuSide === "right" ? "calc(100% + 8px)" : "auto",
                        right: presenceMenuSide === "left" ? "calc(100% + 8px)" : "auto",
                        width: 280,
                        zIndex: 60,
                        background: palette.panelBg,
                        border: `1px solid ${palette.panelBorder}`,
                        borderRadius: 12,
                        boxShadow: isDark ? "0 16px 34px rgba(0,0,0,0.45)" : "0 12px 30px rgba(15,23,42,0.18)",
                        overflow: "hidden",
                        padding: "6px 0"
                      }}
                    >
                      {presenceOptions.map((opt) => {
                        const active = currentPresence === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            className="focus:outline-none focus-visible:outline-none"
                            disabled={presenceSaving}
                            onClick={() => handlePresenceChange(opt.value)}
                            style={{
                              width: "calc(100% - 12px)",
                              margin: "2px 6px",
                              border: "none",
                              textAlign: "left",
                              padding: "10px 12px",
                              borderRadius: 10,
                              background: active ? (isDark ? "rgba(255,255,255,0.1)" : "#eef2f9") : "transparent",
                              color: palette.menuText,
                              cursor: presenceSaving ? "wait" : "pointer",
                              outline: "none",
                              boxShadow: "none"
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                              <span style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    marginTop: 6,
                                    borderRadius: 999,
                                    background: opt.color
                                  }}
                                />
                                <span>
                                  <span style={{ display: "block", fontWeight: active ? 700 : 600, lineHeight: 1.2 }}>
                                    {opt.label}
                                  </span>
                                  {opt.description ? (
                                    <span style={{ display: "block", marginTop: 3, fontSize: 12, color: palette.subText }}>
                                      {opt.description}
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                              {opt.value !== "invisible" ? (
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ opacity: 0.7 }}>
                                  <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : (
                                <span style={{ width: 14, height: 14 }} />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="px-4 py-3" style={{ borderBottom: `1px solid ${palette.panelDivider}` }}>
                  <div
                    style={{
                      display: "inline-flex",
                      gap: 4,
                      padding: 3,
                      borderRadius: 10,
                      background: palette.segmentBg,
                      border: `1px solid ${palette.segmentBorder}`
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setThemeMode("light")}
                      title="Light mode"
                      aria-label="Light mode"
                      style={{
                        width: 32,
                        minHeight: 32,
                        height: 32,
                        padding: 0,
                        border: "none",
                        borderRadius: 8,
                        color: palette.segText,
                        background: themeMode === "light" ? palette.segActive : "transparent",
                      }}
                    >
                      <SunIcon />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setThemeMode("dark")}
                      title="Dark mode"
                      aria-label="Dark mode"
                      style={{
                        width: 32,
                        minHeight: 32,
                        height: 32,
                        padding: 0,
                        border: "none",
                        borderRadius: 8,
                        color: palette.segText,
                        background: themeMode === "dark" ? palette.segActive : "transparent",
                      }}
                    >
                      <MoonIcon />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setThemeMode("auto")}
                      title="Auto mode"
                      aria-label="Auto mode"
                      style={{
                        width: 32,
                        minHeight: 32,
                        height: 32,
                        padding: 0,
                        border: "none",
                        borderRadius: 8,
                        color: palette.segText,
                        background: themeMode === "auto" ? palette.segActive : "transparent",
                      }}
                    >
                      <DesktopIcon />
                    </button>
                  </div>
                </div>

                <div className="px-4 py-3 grid gap-1.5">
                  <NavLink
                    to="/dashboard"
                    onClick={() => setIsProfileOpen(false)}
                    style={{ color: palette.menuText, fontSize: 16, padding: "4px 0" }}
                  >
                    Your profile
                  </NavLink>
                  <NavLink
                    to="/contact"
                    onClick={() => setIsProfileOpen(false)}
                    style={{ color: palette.menuText, fontSize: 16, padding: "4px 0" }}
                  >
                    Help
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout({ withTransition: true });
                    }}
                    style={{
                      color: palette.menuText,
                      fontSize: 16,
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      padding: "4px 0",
                      fontWeight: 500,
                    }}
                  >
                    Log out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
