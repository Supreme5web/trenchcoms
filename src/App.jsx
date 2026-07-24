import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import AppShell from "./components/AppShell.jsx";
import Home from "./pages/Home.jsx";
import Explore from "./pages/Explore.jsx";
import CreateCommunity from "./pages/CreateCommunity.jsx";
import Community from "./pages/Community.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import Notifications from "./pages/Notifications.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="create" element={<CreateCommunity />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="community/:slug" element={<Community />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
