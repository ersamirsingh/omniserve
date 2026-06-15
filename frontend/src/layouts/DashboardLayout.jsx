import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";

export const DashboardLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-zinc-950">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <Topbar />

        {/* Dynamic Inner Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-surface-container-low/30 dark:bg-zinc-900/10 relative">
          <div className="max-w-container-max mx-auto space-y-gutter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
