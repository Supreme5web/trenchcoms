import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

export default function Settings() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [bio, setBio] = useState(profile?.bio || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ bio: bio.trim() })
      .eq("id", profile.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage("Saved.");
    refreshProfile();
  };

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <span className="eyebrow">Settings</span>
        <h1>Account</h1>
      </div>

      <form className="createForm glassPanel" onSubmit={handleSave}>
        <div className="profileGrid">
          <label>
            Display name
            <input value={profile?.display_name || ""} disabled />
          </label>
          <label>
            Username
            <input value={`@${profile?.username || ""}`} disabled />
          </label>
          <p className="inlineNotice wideField" style={{ margin: 0 }}>
            Your name and username are synced from your Google or X account and can't be edited here.
          </p>
          <label className="wideField">
            Bio
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people about yourself" />
          </label>
        </div>
        {error && <p className="inlineNotice">{error}</p>}
        {message && <p className="inlineNotice">{message}</p>}
        <div className="createActions">
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button className="button ghost" type="button" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </form>
    </div>
  );
}
