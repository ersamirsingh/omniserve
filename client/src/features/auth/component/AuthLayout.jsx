import { Link } from "react-router-dom";

export default function AuthLayout({
  children,
  title,
  subtitle,
}) {
  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-violet-600 to-cyan-500" />

        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div>
            <Link
              to="/"
              className="flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center font-bold text-xl">
                F
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  FoodMesh
                </h1>

                <p className="text-sm text-white/80">
                  Restaurant Operating System
                </p>
              </div>
            </Link>
          </div>

          {/* Content */}
          <div className="max-w-lg">
            <h2 className="text-5xl font-bold leading-tight">
              Manage every restaurant operation from one platform.
            </h2>

            <p className="mt-6 text-lg text-white/90">
              Orders, Inventory, CRM, Loyalty,
              Procurement, Staff Management and
              Analytics in a single operating system.
            </p>
          </div>

          {/* Footer */}
          <div className="text-sm text-white/70">
            © {new Date().getFullYear()} FoodMesh.
            All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                F
              </div>

              <span className="text-2xl font-bold text-white">
                FoodMesh
              </span>
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">
                {title}
              </h1>

              <p className="mt-2 text-slate-400">
                {subtitle}
              </p>
            </div>

            {children}
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center text-sm text-slate-500">
            <Link
              to="/privacy"
              className="hover:text-slate-300"
            >
              Privacy Policy
            </Link>

            <span className="mx-2">•</span>

            <Link
              to="/terms"
              className="hover:text-slate-300"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}