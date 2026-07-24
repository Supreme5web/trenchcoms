import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

export default function Settings() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
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
      .update({ display_name: displayName.trim(), username: username.trim(), bio: bio.trim() })
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
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </label>
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
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
