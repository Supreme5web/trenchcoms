import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Icon from "./Icon.jsx";

const NAV_ITEMS = [
  { to: "/app", label: "Home", icon: "home", end: true },
  { to: "/app/explore", label: "Explore", icon: "explore" },
  { to: "/app/create", label: "Create", icon: "create" },
  { to: "/app/notifications", label: "Alerts", icon: "bell" },
  { to: "/app/profile", label: "Profile", icon: "user" },
  { to: "/app/settings", label: "Settings", icon: "settings" },
];

export default function AppShell() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [trending, setTrending] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;

    const loadUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .is("read_at", null);
      if (active) setUnreadCount(count || 0);
    };

    loadUnread();
    const interval = setInterval(loadUnread, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    supabase
      .from("communities")
      .select("id, name, slug, symbol, market_cap, logo")
      .order("market_cap", { ascending: false, nullsFirst: false })
      .limit(5)
      .then(({ data, error }) => {
        if (active && !error) setTrending(data || []);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading || !user) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading TrenchComs...</div>;
  }

  return (
    <div className="appFrame">
      <aside className="leftRail">
        <div className="brand">
          <span className="wordmark">
            <span className="wordmarkTrench">Trench</span>
            <span className="wordmarkComs">Coms</span>
          </span>
        </div>
        <nav className="sideNav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `navItem${isActive ? " active" : ""}`}
            >
              <span className="navIconWrap">
                <Icon name={item.icon} />
                {item.to === "/app/notifications" && unreadCount > 0 && (
                  <span className="navBadge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="button ghost wide" onClick={() => signOut()}>
          <Icon name="signOut" />
          Sign out
        </button>
      </aside>

      <main className="centerStage">
        <Outlet />
      </main>

      <aside className="rightRail">
        <div className="railSection glassPanel">
          <div className="sectionHeader">
            <h3>Signed in as</h3>
          </div>
          <div className="miniCommunity">
            <div className="avatar">
              {profile?.avatar ? (
                <img src={profile.avatar} alt="" />
              ) : (
                (profile?.display_name || "?").slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <strong>{profile?.display_name}</strong>
              <small>@{profile?.username}</small>
            </div>
          </div>
        </div>

        <div className="railSection glassPanel">
          <div className="sectionHeader">
            <h3>Trending communities</h3>
          </div>
          {trending.map((c) => (
            <div
              className="miniCommunity"
              key={c.id}
              onClick={() => navigate(`/app/community/${c.slug}`)}
              style={{ cursor: "pointer" }}
            >
              <div className="avatar">
                {c.logo ? <img src={c.logo} alt="" /> : c.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <strong>{c.name}</strong>
                <small>{c.symbol ? `$${c.symbol}` : "—"}</small>
              </div>
            </div>
          ))}
          {trending.length === 0 && <p className="muted">No communities yet.</p>}
        </div>
      </aside>
    </div>
  );
}
