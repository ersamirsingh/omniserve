import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12),transparent_70%)] -top-24 -right-24" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent_70%)] -bottom-20 -left-20" />
      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  );
}
