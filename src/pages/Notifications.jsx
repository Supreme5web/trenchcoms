import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: diffDay > 365 ? "numeric" : undefined,
  });
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0);

  useEffect(() => {
    // Re-render every 60s so "Just now" / "2m ago" etc. keep advancing
    // without needing a page refresh.
    const interval = setInterval(() => forceTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (!error) setItems(data || []);
        setLoading(false);
      });
  }, [user]);

  const markRead = async (id) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
  };

  const handleOpen = (n) => {
    if (!n.read_at) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <span className="eyebrow">Notifications</span>
        <h1>Alerts</h1>
      </div>

      <div className="feedStack">
        {items.map((n) => (
          <div
            className="notification glassPanel"
            key={n.id}
            style={{
              opacity: n.read_at ? 0.6 : 1,
              cursor: n.link ? "pointer" : "default",
            }}
            onClick={() => handleOpen(n)}
          >
            <span className="notificationBody">
              <span>{n.body}</span>
              <span className="notificationTime">
                {formatTime(n.created_at)}
              </span>
            </span>
            {!n.read_at && (
              <button
                className="button small"
                onClick={(e) => {
                  e.stopPropagation();
                  markRead(n.id);
                }}
              >
                Mark read
              </button>
            )}
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="muted">No notifications yet.</p>
        )}
        {loading && <p className="muted">Loading...</p>}
      </div>
    </div>
  );
}
