import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <span className="eyebrow">Notifications</span>
        <h1>Alerts</h1>
      </div>

      <div className="feedStack">
        {items.map((n) => (
          <div className="notification glassPanel" key={n.id} style={{ opacity: n.read_at ? 0.6 : 1 }}>
            <span>{n.body}</span>
            {!n.read_at && (
              <button className="button small" onClick={() => markRead(n.id)}>
                Mark read
              </button>
            )}
          </div>
        ))}
        {!loading && items.length === 0 && <p className="muted">No notifications yet.</p>}
        {loading && <p className="muted">Loading...</p>}
      </div>
    </div>
  );
}
