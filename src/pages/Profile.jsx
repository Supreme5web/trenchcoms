import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

export default function Profile() {
  const { profile, user } = useAuth();
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("community_members")
      .select("role, communities(id, name, slug, symbol)")
      .eq("profile_id", user.id)
      .then(({ data, error }) => {
        if (!error) setCommunities(data || []);
      });
  }, [user]);

  if (!profile)
    return (
      <p className="muted" style={{ padding: 24 }}>
        Loading profile...
      </p>
    );

  return (
    <div className="pageStack">
      <div className="profileHero glassPanel">
        <div className="profileBanner" />
        <div className="profileBody">
          <div className="avatar large">{(profile.display_name || "?").slice(0, 1).toUpperCase()}</div>
          <h1>{profile.display_name}</h1>
          <p className="muted">
            @{profile.username} · joined via {profile.provider}
          </p>
          <p>{profile.bio || "No bio yet."}</p>
        </div>
      </div>

      <div className="pageHeader">
        <span className="eyebrow">Communities</span>
        <h1 style={{ fontSize: 28 }}>Your communities</h1>
      </div>

      <div className="cardGrid compact">
        {communities.map((m) => (
          <div className="communityCard glassPanel" key={m.communities.id}>
            <div className="cardTitle">{m.communities.name}</div>
            <span className="symbol">{m.communities.symbol ? `$${m.communities.symbol}` : ""}</span>
            <span className="roleBadge">{m.role}</span>
          </div>
        ))}
        {communities.length === 0 && <p className="muted">You haven't joined any communities yet.</p>}
      </div>
    </div>
  );
}
