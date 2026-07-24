import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  isSupabaseConfigured,
  missingSupabaseMessage,
  supabase,
} from "../lib/supabase.js";

const AuthContext = createContext(null);

function fallbackUsername(base) {
  const cleaned =
    (base || "user")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 16) || "user";
  return `${cleaned}${Math.floor(1000 + Math.random() * 9000)}`;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (user) => {
    if (!user || !isSupabaseConfigured) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("profile fetch error", error);
      return;
    }

    const meta = user.user_metadata || {};
    const currentProvider = user.app_metadata?.provider || "unknown";

    if (data) {
      // Google and X can resolve to the same auth user if they share a
      // verified email. When that happens, keep the profile's name/avatar
      // in sync with whichever provider was used for *this* sign-in,
      // instead of permanently showing whichever provider signed up first.
      if (data.provider !== currentProvider) {
        const displayName =
          meta.full_name || meta.name || meta.user_name || data.display_name;
        const avatar = meta.avatar_url || meta.picture || data.avatar;
        const { data: updated, error: updateError } = await supabase
          .from("profiles")
          .update({
            display_name: displayName,
            avatar,
            provider: currentProvider,
          })
          .eq("id", user.id)
          .select()
          .maybeSingle();
        if (!updateError && updated) {
          setProfile(updated);
          return;
        }
      }
      setProfile(data);
      return;
    }

    const displayName =
      meta.full_name ||
      meta.name ||
      meta.user_name ||
      user.email?.split("@")[0] ||
      "New User";
    const username = fallbackUsername(
      meta.user_name || meta.preferred_username || displayName,
    );

    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username,
        display_name: displayName,
        avatar: meta.avatar_url || meta.picture || null,
        provider: currentProvider,
      })
      .select()
      .maybeSingle();

    if (createError) {
      console.error("profile create error", createError);
      return;
    }
    setProfile(created);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadProfile(data.session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        loadProfile(newSession?.user ?? null);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signInWithGoogle = () =>
    isSupabaseConfigured
      ? supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/app` },
        })
      : { error: new Error(missingSupabaseMessage) };

  const signInWithTwitter = () =>
    isSupabaseConfigured
      ? supabase.auth.signInWithOAuth({
          provider: "x",
          options: { redirectTo: `${window.location.origin}/app` },
        })
      : { error: new Error(missingSupabaseMessage) };

  const signOut = () =>
    isSupabaseConfigured ? supabase.auth.signOut() : Promise.resolve();
  const refreshProfile = () => loadProfile(session?.user ?? null);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signInWithGoogle,
    signInWithTwitter,
    signOut,
    refreshProfile,
    isSupabaseConfigured,
    missingSupabaseMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
