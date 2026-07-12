import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor,
  ChefHat,
  Package,
  CreditCard,
  BarChart3,
  Calendar,
  Scan,
  Link as LinkIcon,
  Bell,
  Zap,
  Users,
  FileText,
  ArrowRight,
  PlayCircle,
  Activity,
  TrendingUp,
  Layout,
  Star,
  ChevronDown,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  CheckCheck,
  Sun,
  Moon,
  Laptop,
  Lock,
  Globe,
  Database,
  Cpu,
  Server,
  Cloud,
  Layers
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import ProductShowcase from '../../components/landing/ProductShowcase';
import api from '../../api/axios';

const TwitterIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const LinkedinIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const InstagramIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

// ── Interactive HTML/CSS Mock Visual Components ──

function HeroDashboardMock() {
  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 p-4 font-sans text-[11px] flex flex-col justify-between">
      {/* Mini Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[9px]">OmniServe Operations OS</span>
        </div>
        <div className="flex gap-1">
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[8px] text-slate-400">v1.10.0</span>
          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold text-[8px]">Live</span>
        </div>
      </div>

      {/* Sales metric grid */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-400 text-[9px]">Today's Sales</span>
          <span className="text-xs font-bold text-white mt-0.5">₹1,42,850</span>
          <span className="text-[8px] text-emerald-400 font-bold">+18.2%</span>
        </div>
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-400 text-[9px]">Active Orders</span>
          <span className="text-xs font-bold text-white mt-0.5">42</span>
          <span className="text-[8px] text-slate-400">Connaught Pl.</span>
        </div>
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-400 text-[9px]">Average SLA</span>
          <span className="text-xs font-bold text-white mt-0.5">97.8%</span>
          <span className="text-[8px] text-emerald-400 font-bold">On Track</span>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="grid grid-cols-5 gap-2 flex-1">
        {/* Left column: Live Order Feed */}
        <div className="col-span-3 bg-slate-900/50 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
          <span className="font-bold text-slate-300 mb-1">Live Order Flow</span>
          <div className="space-y-1">
            <div className="flex justify-between items-center p-1.5 rounded bg-slate-900/80 border border-slate-800">
              <div>
                <span className="font-bold text-white block">#OM-1025</span>
                <span className="text-[8px] text-slate-400">2x Paneer Tikka • Table 5</span>
              </div>
              <span className="px-1.5 py-0.5 text-[8px] bg-amber-500/20 text-amber-400 rounded">Preparing</span>
            </div>
            <div className="flex justify-between items-center p-1.5 rounded bg-slate-900/80 border border-slate-800">
              <div>
                <span className="font-bold text-white block">#OM-1024</span>
                <span className="text-[8px] text-slate-400">1x Butter Chicken • Swiggy</span>
              </div>
              <span className="px-1.5 py-0.5 text-[8px] bg-blue-500/20 text-blue-400 rounded">Ready</span>
            </div>
          </div>
        </div>

        {/* Right column: active channels */}
        <div className="col-span-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
          <span className="font-bold text-slate-300 mb-1">Channel Status</span>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">🍊 Swiggy</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">🍕 Zomato</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">🛍️ ONDC</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">💬 WhatsApp</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsDeviceMockup() {
  const { theme } = useTheme();

  return (
    <div className="relative w-full max-w-[580px] mx-auto py-6 select-none">
      {/* Laptop Mockup Wrapper */}
      <div className="relative mx-auto w-[85%] aspect-[16/10] bg-zinc-950 rounded-t-2xl border-[6px] border-zinc-800 dark:border-zinc-900 shadow-2xl overflow-hidden z-10">
        {/* Screen Bezel Detail */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zinc-900 flex items-center justify-center">
          <div className="w-0.5 h-0.5 rounded-full bg-zinc-700"></div>
        </div>

        {/* Viewport Screen */}
        <div className="w-full h-full bg-slate-900 overflow-hidden relative">
          <img
            src="/images/landingpage/integrations_dark.png"
            alt="OmniServe Integrations Dark Dashboard"
            className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-700"
          />
          {/* Subtle reflection overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
        </div>
      </div>

      {/* Laptop Base (Keyboard Part) */}
      <div className="relative mx-auto w-[98%] h-3 bg-zinc-700 dark:bg-zinc-800 rounded-b-xl shadow-lg border-t border-zinc-600 dark:border-zinc-705 z-10">
        {/* Center notch for opening the lid */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-800 dark:bg-zinc-900 rounded-b-md"></div>
      </div>

      {/* Phone Mockup (Overlapping on the bottom right) */}
      <div className="absolute -bottom-4 right-1 w-[26%] aspect-[9/19.5] bg-zinc-950 rounded-[2.2rem] border-[4px] border-zinc-800 dark:border-zinc-900 shadow-2xl overflow-hidden z-20 transition-transform hover:scale-[1.03] duration-300">
        {/* Dynamic Island Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-black rounded-full flex items-center justify-center z-30">
          <div className="w-1 h-1 rounded-full bg-zinc-900 ml-auto mr-1"></div>
        </div>

        {/* Viewport Screen: displays Light mode screenshot */}
        <div className="w-full h-full bg-slate-900 relative overflow-hidden">
          <img
            src="/images/landingpage/integrations_light.png"
            alt="OmniServe Integrations Light Mobile Mock"
            className="w-full h-full object-cover object-left-top hover:scale-[1.02] transition-transform duration-700"
          />
          {/* Subtle reflection overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
}

function KdsCockpitMock() {
  return (
    <div className="w-full h-full bg-slate-950 text-slate-200 p-4 font-sans text-xs flex flex-col justify-between">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
        <div>
          <span className="font-bold text-white text-sm block">KDS (Kitchen Display System)</span>
          <span className="text-[9px] text-slate-400">Real-time tickets across preparation stations</span>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
      </div>

      <div className="grid grid-cols-3 gap-2 flex-1">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-1">
            <span className="font-bold text-white">Table 4</span>
            <span className="text-amber-500 font-semibold text-[9px]">Prep: 6m</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Paneer Tikka</span>
              <span className="font-bold text-white">x2</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Tandoori Roti</span>
              <span className="font-bold text-white">x4</span>
            </div>
          </div>
          <div className="bg-slate-800 text-[8px] text-slate-400 p-1 rounded text-center mt-2">
            Mains Station
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-1">
            <span className="font-bold text-white">Table 12</span>
            <span className="text-emerald-500 font-semibold text-[9px]">Prep: 2m</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Chilli Chicken</span>
              <span className="font-bold text-white">x1</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Fried Rice</span>
              <span className="font-bold text-white">x1</span>
            </div>
          </div>
          <div className="bg-slate-800 text-[8px] text-slate-400 p-1 rounded text-center mt-2">
            Chinese Station
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-1">
            <span className="font-bold text-white">Takeaway #2</span>
            <span className="text-red-500 font-semibold text-[9px] animate-pulse">SLA Over</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Margherita Pizza</span>
              <span className="font-bold text-white">x1</span>
            </div>
          </div>
          <div className="bg-red-950/40 text-[8px] text-red-400 p-1 rounded text-center mt-2 border border-red-900/30">
            Bakery Station
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsMock() {
  return (
    <div className="w-full h-full bg-slate-950 text-slate-200 p-4 font-sans text-xs flex flex-col justify-between">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
        <div>
          <span className="font-bold text-white text-sm block">Live Insights Center</span>
          <span className="text-[9px] text-slate-400">Revenue, order volume, and active outlets growth</span>
        </div>
        <div className="flex gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
          <span className="px-1.5 py-0.5 rounded bg-slate-850 text-white text-[8px] font-bold">CP Outlet</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 flex-1">
        <div className="col-span-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-slate-300">Net Sales Trend</span>
            <span className="text-emerald-400 text-[8px] font-bold">+22.4% vs last Sunday</span>
          </div>
          {/* Custom SVG/HTML Chart representation */}
          <div className="h-20 flex items-end justify-between px-2 gap-1 border-b border-slate-850 pb-1">
            <div className="w-full bg-[#6311f4]/30 h-1/4 rounded-t"></div>
            <div className="w-full bg-[#6311f4]/45 h-2/5 rounded-t"></div>
            <div className="w-full bg-[#6311f4]/60 h-3/5 rounded-t"></div>
            <div className="w-full bg-[#6311f4]/75 h-4/5 rounded-t"></div>
            <div className="w-full bg-[#6311f4] h-full rounded-t"></div>
            <div className="w-full bg-[#6311f4]/90 h-5/6 rounded-t"></div>
          </div>
          <div className="flex justify-between text-[8px] text-slate-500 mt-1">
            <span>12:00</span>
            <span>15:00</span>
            <span>18:00</span>
            <span>21:00</span>
            <span>00:00</span>
          </div>
        </div>

        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
          <span className="font-bold text-slate-300 mb-1.5 block">Region Mix</span>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px]">
              <span className="text-slate-400">Delhi CP</span>
              <span className="font-bold text-white">₹45.2K</span>
            </div>
            <div className="flex justify-between items-center text-[9px]">
              <span className="text-slate-400">Bangalore Ind.</span>
              <span className="font-bold text-white">₹30.8K</span>
            </div>
            <div className="flex justify-between items-center text-[9px]">
              <span className="text-slate-400">Pune Baner</span>
              <span className="font-bold text-white">₹28.9K</span>
            </div>
          </div>
          <div className="border-t border-slate-850 pt-1 text-[8px] text-slate-400 flex justify-between">
            <span>Aggregated Outlets</span>
            <span className="font-bold text-white">105+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderJourneyMock() {
  return (
    <div className="w-full h-full bg-slate-950 text-slate-200 p-4 font-sans text-xs flex flex-col justify-between">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
        <div>
          <span className="font-bold text-white text-sm block">Live Order Pipeline</span>
          <span className="text-[9px] text-slate-400">End-to-end dispatch and customer tracking metrics</span>
        </div>
        <div className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-[8px] font-bold">
          ID: #OM-9034
        </div>
      </div>

      <div className="flex items-center justify-between py-4 flex-1">
        <div className="flex flex-col items-center text-center w-1/5">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white mb-1 shadow-md shadow-emerald-500/10">✓</div>
          <span className="font-bold text-slate-200 block text-[9px]">Received</span>
          <span className="text-[7px] text-slate-400">12:04 PM</span>
        </div>
        <div className="h-0.5 bg-emerald-500 flex-1 -mt-4"></div>

        <div className="flex flex-col items-center text-center w-1/5">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white mb-1 shadow-md shadow-emerald-500/10">✓</div>
          <span className="font-bold text-slate-200 block text-[9px]">In Kitchen</span>
          <span className="text-[7px] text-slate-400">12:08 PM</span>
        </div>
        <div className="h-0.5 bg-emerald-500 flex-1 -mt-4"></div>

        <div className="flex flex-col items-center text-center w-1/5">
          <div className="w-6 h-6 rounded-full bg-[#6311f4] flex items-center justify-center font-bold text-white mb-1 animate-pulse shadow-md shadow-[#6311f4]/20">🧑‍🍳</div>
          <span className="font-bold text-[#6311f4] block text-[9px]">Preparing</span>
          <span className="text-[7px] text-slate-400">ETA: 5 mins</span>
        </div>
        <div className="h-0.5 bg-slate-800 flex-1 -mt-4"></div>

        <div className="flex flex-col items-center text-center w-1/5">
          <div className="w-6 h-6 rounded-full bg-slate-850 border border-slate-800 flex items-center justify-center font-bold text-slate-500 mb-1">🛵</div>
          <span className="font-bold text-slate-500 block text-[9px]">Dispatched</span>
          <span className="text-[7px] text-slate-400">-</span>
        </div>
      </div>

      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 flex justify-between items-center text-[9px]">
        <span className="text-slate-400 font-medium">Auto-dispatch SLA status</span>
        <span className="text-emerald-400 font-bold">14 mins left (On Track)</span>
      </div>
    </div>
  );
}

function StaffMgmtMock() {
  return (
    <div className="w-full h-full bg-slate-950 text-slate-200 p-4 font-sans text-xs flex flex-col justify-between">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
        <div>
          <span className="font-bold text-white text-sm block">Team & Roles Directory</span>
          <span className="text-[9px] text-slate-400">Global role-based permissions and user control</span>
        </div>
        <button className="px-2 py-0.5 bg-[#6311f4] text-white rounded font-bold text-[9px]">
          + Invite
        </button>
      </div>

      <div className="flex-1">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-500 border-b border-slate-850">
              <th className="pb-1.5 font-semibold text-[9px]">Member</th>
              <th className="pb-1.5 font-semibold text-[9px]">Role</th>
              <th className="pb-1.5 font-semibold text-[9px]">Scope</th>
              <th className="pb-1.5 font-semibold text-[9px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/40">
            <tr>
              <td className="py-1.5 flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-[8px]">MY</div>
                <div>
                  <span className="font-bold text-white block">Md Yusuf</span>
                  <span className="text-[8px] text-slate-400">yusuf@omniserve.io</span>
                </div>
              </td>
              <td className="py-1.5 text-slate-300 text-[9px]">Super Admin</td>
              <td className="py-1.5"><span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold text-[8px]">Global</span></td>
              <td className="py-1.5"><span className="inline-flex items-center gap-1"><span className="w-1 h-1 bg-emerald-500 rounded-full"></span> Active</span></td>
            </tr>
            <tr>
              <td className="py-1.5 flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-[8px]">SS</div>
                <div>
                  <span className="font-bold text-white block">Samir Singh</span>
                  <span className="text-[8px] text-slate-400">samir@omniserve.io</span>
                </div>
              </td>
              <td className="py-1.5 text-slate-300 text-[9px]">Operations Mgr</td>
              <td className="py-1.5"><span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold text-[8px]">Indiranagar</span></td>
              <td className="py-1.5"><span className="inline-flex items-center gap-1"><span className="w-1 h-1 bg-emerald-500 rounded-full"></span> Active</span></td>
            </tr>
            <tr>
              <td className="py-1.5 flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-[8px]">NK</div>
                <div>
                  <span className="font-bold text-white block">Nitish Kumar</span>
                  <span className="text-[8px] text-slate-400">nitish@omniserve.io</span>
                </div>
              </td>
              <td className="py-1.5 text-slate-300 text-[9px]">Kitchen Lead</td>
              <td className="py-1.5"><span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[8px]">Delhi CP</span></td>
              <td className="py-1.5"><span className="inline-flex items-center gap-1"><span className="w-1 h-1 bg-emerald-500 rounded-full"></span> Active</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { theme, selectTheme } = useTheme();

  const [themeOpen, setThemeOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState({});
  const [activeBentoModule, setActiveBentoModule] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [formStatus, setFormStatus] = useState('idle'); // idle, submitting, success, error
  const [formError, setFormError] = useState('');

  const toggleFaq = (index) => {
    setFaqOpen((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Reveal items on scroll
      const reveals = document.querySelectorAll('.reveal');
      reveals.forEach((element) => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 120;
        if (elementTop < windowHeight - elementVisible) {
          element.classList.add('active');
        }
      });

      // Update scrolled state for navbar
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('load', handleScroll);
    handleScroll(); // Initial run

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('load', handleScroll);
    };
  }, []);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (formStatus === 'submitting' || formStatus === 'success') return;

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      message: formData.message.trim(),
    };

    if (!payload.firstName || !payload.email || !payload.message) {
      setFormError('Please fill out all required fields.');
      setFormStatus('error');
      return;
    }

    setFormStatus('submitting');
    setFormError('');

    try {
      await api.post('/public/contact', payload);
      setSubmittedEmail(payload.email);
      setFormStatus('success');
    } catch (err) {
      console.error(err);
      setFormError('We could not send your message right now. Please try again in a moment.');
      setFormStatus('error');
    }
  };

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const teamMembers = [
    { name: 'Md Yusuf', image: '/images/landingpage/yusuf.png', role: 'Chief Architect' },
    { name: 'Samir Kumar Singh', image: '/images/landingpage/samir.jpg', role: 'Backend & Security lead' },
    { name: 'Nitish Kumar', image: '/images/landingpage/nitish.jpg', role: 'Full Stack & AI Engineer' },
    { name: 'Ajay Rathore', image: '/images/landingpage/ajay.jpg', role: 'UI/UX & Product Engineer' }
  ];

  const heroStats = [
    { label: 'Outlets live', value: '105+' },
    { label: 'Uptime SLA', value: '99.99%' },
    { label: 'Order sync', value: '<1s' },
  ];

  const bentoModules = [
    { id: 'ops', title: 'Operations Cockpit', desc: 'One live terminal for every table, session, and order across all outlets.', icon: Monitor, size: 'md:col-span-2' },
    { id: 'kds', title: 'KDS Engine', desc: 'Tickets auto-routed to the right station, tracked against SLA.', icon: ChefHat, size: 'col-span-1' },
    { id: 'inv', title: 'Smart Inventory', desc: 'Stock, waste, and recipes linked straight to billing.', icon: Package, size: 'col-span-1' },
    { id: 'bill', title: 'Unified Billing', desc: 'One checkout flow across cash, cards, and digital wallets.', icon: CreditCard, size: 'col-span-1' },
    { id: 'anal', title: 'Insights & Analytics', desc: 'Sales, SLA, and outlet performance in one live view.', icon: BarChart3, size: 'col-span-1' },
    { id: 'qr', title: 'QR Ordering', desc: 'Guests order and pay from the table — no app download.', icon: Scan, size: 'md:col-span-2' },
    { id: 'bus', title: 'Integrations Bus', desc: 'Swiggy, Zomato, ONDC, and ERP — connected by native webhooks.', icon: LinkIcon, size: 'col-span-1' },
    { id: 'logs', title: 'Security & Audit Logs', desc: 'Full audit trail across every tenant and outlet.', icon: FileText, size: 'col-span-1' },
  ];

  const techStackGroups = [
    {
      category: 'Databases & Cache',
      icon: Database,
      techs: [
        { name: 'PostgreSQL', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { name: 'MongoDB', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'Redis', badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
        { name: 'Neo4j (Graph)', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
        { name: 'Qdrant (Vector)', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
      ]
    },
    {
      category: 'Backend Services',
      icon: Server,
      techs: [
        { name: 'Node.js', badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { name: 'Express', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
        { name: 'NestJS', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
        { name: 'WebSocket (Socket.io)', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' }
      ]
    },
    {
      category: 'Frontend Logic',
      icon: Layout,
      techs: [
        { name: 'React', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
        { name: 'Vite', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
        { name: 'TypeScript', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { name: 'Tailwind CSS v4', badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20' }
      ]
    },
    {
      category: 'AI & Data Models',
      icon: Cpu,
      techs: [
        { name: 'OpenAI API', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'Gemini 1.5 Flash', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { name: 'RAG Pipeline', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
      ]
    },
    {
      category: 'Infrastructure & Cloud',
      icon: Cloud,
      techs: [
        { name: 'Docker', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
        { name: 'Kubernetes', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Nginx', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'AWS Cloud', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Cloudflare Proxy', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' }
      ]
    },
    {
      category: 'Streams & Message Queues',
      icon: Layers,
      techs: [
        { name: 'RabbitMQ', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Apache Kafka', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
        { name: 'Internal Event Bus', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
      ]
    }
  ];

  return (
    <div className="landing-page bg-background text-on-surface font-body-lg overflow-x-hidden selection:bg-secondary-container selection:text-on-secondary-container">
      {/* TopNavBar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'h-16 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md shadow-xs border-b border-zinc-200/50 dark:border-zinc-800/60'
          : 'h-20 bg-transparent border-b border-transparent'
      }`}>
        <div className="flex justify-between items-center h-full px-4 sm:px-6 lg:px-margin-desktop max-w-container-max mx-auto">
          {/* Logo & Wordmark */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity duration-200 no-underline">
            <img src="/logo.png" alt="OmniServe Logo" className="w-8 h-8 object-contain rounded-xl shadow-xs" />
            <div className="flex flex-col">
              <span className="font-hanken font-bold text-lg tracking-tight text-on-surface transition-colors">OmniServe</span>
              <span className="text-[8px] text-[#6311f4] dark:text-indigo-400 font-bold tracking-widest uppercase">Operations OS</span>
            </div>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#product" className="relative group text-on-surface/80 hover:text-[#6311f4] dark:hover:text-indigo-400 transition-colors duration-200 font-body-md text-sm font-medium no-underline py-2">
              Product
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#6311f4] dark:bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#solutions" className="relative group text-on-surface/80 hover:text-[#6311f4] dark:hover:text-indigo-400 transition-colors duration-200 font-body-md text-sm font-medium no-underline py-2">
              Solutions
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#6311f4] dark:bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#tech" className="relative group text-on-surface/80 hover:text-[#6311f4] dark:hover:text-indigo-400 transition-colors duration-200 font-body-md text-sm font-medium no-underline py-2">
              Technology
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#6311f4] dark:bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#contact" className="relative group text-on-surface/80 hover:text-[#6311f4] dark:hover:text-indigo-400 transition-colors duration-200 font-body-md text-sm font-medium no-underline py-2">
              Contact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#6311f4] dark:bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
          </div>

          {/* CTAs and Switcher */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Sliding segment theme selector */}
            <div className="flex bg-slate-100 dark:bg-zinc-900/80 p-0.5 rounded-full border border-zinc-200/60 dark:border-zinc-800/60 gap-0.5 transition-all">
              <button
                onClick={() => selectTheme('light')}
                className={`p-1.5 rounded-full transition-all duration-200 ${theme === 'light' ? 'bg-white dark:bg-zinc-800 text-amber-500 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                title="Light Mode"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => selectTheme('dark')}
                className={`p-1.5 rounded-full transition-all duration-200 ${theme === 'dark' ? 'bg-white dark:bg-zinc-850 text-indigo-400 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                title="Dark Mode"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => selectTheme('system')}
                className={`p-1.5 rounded-full transition-all duration-200 ${theme === 'system' ? 'bg-white dark:bg-zinc-850 text-slate-500 dark:text-slate-400 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                title="System Preferences"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>

            <Link to="/login" className="hidden sm:inline-flex px-5 py-2 bg-[#6311f4] hover:bg-[#520dd4] text-white rounded-full text-sm font-semibold transition-colors duration-200 active:scale-95 shadow-md shadow-[#6311f4]/15 no-underline">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 sm:pt-44 pb-20 sm:pb-24 overflow-hidden">
        {/* Signature ambient grid — sets the "operations grid" motif used across the page */}
        <div
          className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(99,17,244,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,17,244,0.06) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)'
          }}
        ></div>

        <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
          <div className="reveal">
            <div className="inline-flex items-center space-x-2 bg-emerald-500/10 px-4 py-1.5 rounded-full mb-8 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-500 dark:text-emerald-400 font-bold text-label-sm uppercase tracking-widest">Live across 105+ outlets</span>
            </div>
            <h1 className="font-display-lg text-display-lg leading-[1.1] mb-8 text-on-surface">
              Run every outlet<br />
              like it's <span className="text-[#6311f4] dark:text-indigo-400">one restaurant.</span>
            </h1>
            <p className="text-on-surface-variant text-body-lg mb-10 max-w-lg">
              OmniServe puts your kitchen, billing, inventory, and every delivery channel on one live feed — so nothing runs on guesswork, at one outlet or two hundred.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link to="/login" className="px-8 py-4 bg-[#6311f4] text-white rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-[#520dd4] transition-colors duration-200 shadow-lg shadow-[#6311f4]/20 no-underline">
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button onClick={scrollToContact} className="px-8 py-4 bg-white dark:bg-zinc-900 border border-lp-border dark:border-zinc-800 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-200 text-on-surface shadow-xs">
                <PlayCircle className="w-5 h-5 text-[#6311f4]" />
                <span>Book a Demo</span>
              </button>
            </div>
            {/* Trust stat bar — concrete, not decorative */}
            <div className="flex items-center gap-8 sm:gap-10 border-t border-lp-border dark:border-zinc-800/60 pt-6">
              {heroStats.map((stat) => (
                <div key={stat.label}>
                  <div className="font-headline-lg text-headline-lg text-on-surface leading-none mb-1">{stat.value}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative reveal delay-200">
            <div className="absolute -inset-10 bg-indigo-500/10 blur-[100px] rounded-full z-0 pointer-events-none"></div>
            <div className="relative rounded-3xl border border-zinc-200/50 dark:border-zinc-800/60 overflow-hidden bg-white/5 backdrop-blur-md shadow-2xl max-w-[580px] mx-auto">
              <img
                src="/images/landingpage/omniserve_hub.png"
                alt="OmniServe Operations Hub Connections"
                className="w-full h-auto object-contain rounded-3xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Control Center */}
      <section id="solutions" className="py-24 bg-surface-container-low border-y border-lp-border">
        <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-margin-desktop reveal">
          <div className="glass-card p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center space-x-2 bg-indigo-500/10 px-3.5 py-1 rounded-full mb-6 border border-indigo-500/20">
                  <span className="text-[#6311f4] dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">Integrations</span>
                </div>
                <h2 className="font-headline-xl text-headline-xl mb-4 text-on-surface">One inbox for every channel</h2>
                <p className="text-on-surface-variant mb-8 text-body-md leading-relaxed">
                  Swiggy, Zomato, ONDC, and your direct orders land in the same queue. Watch sync health, catch failed webhooks, and reconcile transactions without switching tabs.
                </p>
                <div className="flex gap-4">
                  <button onClick={scrollToContact} className="px-6 py-3 bg-[#6311f4] hover:bg-[#520dd4] text-white font-bold rounded-xl text-xs transition-colors duration-200 shadow-md">
                    Connect Your Channels
                  </button>
                </div>
              </div>
              <div>
                <IntegrationsDeviceMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Modules Bento */}
      <section className="py-24" id="product">
        <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-margin-desktop mb-16 text-center">
          <div className="reveal">
            <div className="inline-flex items-center space-x-2 bg-[#fc8a63]/10 px-3.5 py-1 rounded-full mb-4 border border-[#fc8a63]/20">
              <span className="text-[#fc8a63] font-bold text-xs uppercase tracking-widest">Core Modules</span>
            </div>
            <h2 className="font-headline-xl text-headline-xl mb-4 text-on-surface">Everything a kitchen needs, one dashboard</h2>
            <p className="text-on-surface-variant max-w-xl mx-auto text-body-md">
              Tap a module to see what it does.
            </p>
          </div>
        </div>
        <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-margin-desktop grid grid-cols-1 md:grid-cols-4 gap-6 reveal">
          {bentoModules.map((mod) => {
            const IconComponent = mod.icon;
            const isHighlighted = activeBentoModule === mod.id;
            return (
              <div
                key={mod.id}
                onClick={() => setActiveBentoModule(isHighlighted ? null : mod.id)}
                className={`glass-card p-8 rounded-3xl cursor-pointer select-none transition-all duration-300 ${mod.size} ${
                  isHighlighted ? 'ring-2 ring-[#6311f4] bg-indigo-500/5' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-2xl ${isHighlighted ? 'bg-[#6311f4] text-white' : 'bg-slate-100 dark:bg-zinc-800 text-[#6311f4] dark:text-indigo-400'} transition-colors duration-200`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  {isHighlighted && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-bold text-[9px] rounded-full border border-emerald-500/20">Selected</span>}
                </div>
                <h3 className="font-bold text-lg mb-2 text-on-surface">{mod.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{mod.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Product Screen Preview / Operations Cockpit */}
      <section className="py-24 bg-slate-950 text-white overflow-hidden border-y border-slate-900">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 px-3.5 py-1 rounded-full mb-6 border border-indigo-500/20">
              <span className="text-indigo-400 font-bold text-xs uppercase tracking-widest">Kitchen routing</span>
            </div>
            <h2 className="font-headline-xl text-headline-xl mb-6 text-white">The Operations Cockpit</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Dine-in, takeaway, and delivery orders route themselves to the right kitchen display the moment they land — no prep bottlenecks, no missed tickets.
            </p>
            <div className="space-y-4">
              <div className="flex items-start space-x-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors duration-200">
                <Layout className="text-indigo-400 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-white mb-1">Super Admin Console</h4>
                  <p className="text-xs text-slate-400">One dashboard for outlet permissions and every open checkout.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors duration-200">
                <Activity className="text-indigo-400 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-white mb-1">Real-time Order Flow</h4>
                  <p className="text-xs text-slate-400">Prep stages and waiter dispatch, synced under a second.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors duration-200">
                <TrendingUp className="text-indigo-400 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-white mb-1">SLA Analytics</h4>
                  <p className="text-xs text-slate-400">Know exactly which station is slowing an order down.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative reveal delay-200">
            <div className="absolute -inset-10 bg-indigo-500/10 blur-[100px] rounded-full z-0 pointer-events-none"></div>
            <div className="relative w-full max-w-[580px] mx-auto py-6 select-none">
              {/* Laptop Mockup Wrapper */}
              <div className="relative mx-auto w-[90%] aspect-[16/10] bg-zinc-950 rounded-t-2xl border-[6px] border-zinc-800 dark:border-zinc-900 shadow-2xl overflow-hidden z-10">
                {/* Screen Bezel Detail */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zinc-900 flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-zinc-700"></div>
                </div>

                {/* Viewport Screen */}
                <div className="w-full h-full bg-slate-900 overflow-hidden relative">
                  <img
                    src="/images/landingpage/operations_cockpit.png"
                    alt="OmniServe Operations Cockpit"
                    className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
                </div>
              </div>

              {/* Laptop Base */}
              <div className="relative mx-auto w-[100%] h-3 bg-zinc-700 dark:bg-zinc-800 rounded-b-xl shadow-lg border-t border-zinc-600 dark:border-zinc-705 z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-850 dark:bg-zinc-900 rounded-b-md"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="py-24 bg-surface-container-low border-b border-lp-border">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="reveal order-2 lg:order-1">
            <div className="relative w-full max-w-[580px] mx-auto py-6 select-none">
              {/* Laptop Mockup Wrapper */}
              <div className="relative mx-auto w-[90%] aspect-[16/10] bg-zinc-950 rounded-t-2xl border-[6px] border-zinc-800 dark:border-zinc-900 shadow-2xl overflow-hidden z-10">
                {/* Screen Bezel Detail */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zinc-900 flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-zinc-700"></div>
                </div>

                {/* Viewport Screen */}
                <div className="w-full h-full bg-slate-900 overflow-hidden relative">
                  <img
                    src="/images/landingpage/super_admin.png"
                    alt="OmniServe Super Admin Dashboard"
                    className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
                </div>
              </div>

              {/* Laptop Base */}
              <div className="relative mx-auto w-[100%] h-3 bg-zinc-700 dark:bg-zinc-800 rounded-b-xl shadow-lg border-t border-zinc-600 dark:border-zinc-705 z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-850 dark:bg-zinc-900 rounded-b-md"></div>
              </div>
            </div>
          </div>
          <div className="reveal order-1 lg:order-2">
            <div className="inline-flex items-center space-x-2 bg-amber-500/10 px-3.5 py-1 rounded-full mb-6 border border-amber-500/20">
              <span className="text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest">Live Analytics</span>
            </div>
            <h2 className="font-headline-xl text-headline-xl mb-6 text-on-surface">See revenue as it happens</h2>
            <p className="text-on-surface-variant mb-8 text-body-md leading-relaxed">
              Revenue, order mix, and outlet performance update live. Drill into one location or view the whole chain — no end-of-day spreadsheet needed.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-2xl">
                <div className="text-[#6311f4] dark:text-indigo-400 font-bold text-3xl mb-1">105+</div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Outlets in Scope</p>
              </div>
              <div className="glass-card p-6 rounded-2xl">
                <div className="text-[#6311f4] dark:text-indigo-400 font-bold text-3xl mb-1">₹85,070</div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Daily Avg Revenue</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alternating Feature Grid */}
      <section className="py-24">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center mb-16 reveal">
          <div className="inline-flex items-center space-x-2 bg-[#6311f4]/10 px-3.5 py-1 rounded-full mb-4 border border-[#6311f4]/20">
            <span className="text-[#6311f4] dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">Why Teams Switch</span>
          </div>
          <h2 className="font-headline-xl text-headline-xl mb-4 text-on-surface">Built to disappear into the background</h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto text-body-md">
            The best operations software is the kind your staff stops noticing. That's the bar we hold ourselves to.
          </p>
        </div>
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-5 gap-6 reveal">
          {/* Card 1: Continuous Innovation (col-span-3) */}
          <div className="lg:col-span-3 flex flex-col md:flex-row justify-between items-center bg-surface-container/30 border border-lp-border dark:border-zinc-800/60 p-8 md:p-10 rounded-[2.5rem] shadow-xs hover:border-[#6311f4]/30 dark:hover:border-indigo-400/30 transition-colors duration-300 overflow-hidden relative">
            <div className="max-w-xs space-y-4 text-left">
              <h3 className="font-bold text-xl text-on-surface flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#6311f4] dark:text-indigo-400" />
                Weekly Releases
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                We ship improvements every week with zero downtime — you get the update, your staff never notices the deploy.
              </p>
            </div>
            {/* Visual Micro-Illustration */}
            <div className="relative w-44 h-36 bg-slate-900/10 dark:bg-zinc-950/40 rounded-2xl border border-lp-border dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 mt-6 md:mt-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6311f4]/5 to-indigo-500/5 pointer-events-none"></div>
              <div className="relative flex flex-col items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-bold border border-emerald-500/20">
                  Active Sync
                </span>
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span className="text-[10px] text-on-surface font-bold">v1.12.0</span>
                </div>
                <div className="w-16 h-1 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '70%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Pricing (col-span-2) */}
          <div className="lg:col-span-2 flex flex-col justify-between bg-surface-container/30 border border-lp-border dark:border-zinc-800/60 p-8 md:p-10 rounded-[2.5rem] shadow-xs hover:border-[#6311f4]/30 dark:hover:border-indigo-400/30 transition-colors duration-300 overflow-hidden relative text-left">
            <div className="space-y-4">
              <h3 className="font-bold text-xl text-on-surface flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#6311f4] dark:text-indigo-400" />
                Flat, Transparent Pricing
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                No setup fee. One flat transaction rate that scales with your volume, not against it.
              </p>
            </div>
            {/* Visual Micro-Illustration */}
            <div className="relative w-full h-24 bg-slate-900/10 dark:bg-zinc-950/40 rounded-2xl border border-lp-border dark:border-zinc-800 flex items-center justify-between p-4 mt-6 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6311f4]/5 to-indigo-500/5 pointer-events-none"></div>
              <div className="flex flex-col justify-between h-full">
                <span className="text-[9px] uppercase font-bold text-on-surface-variant">Setup Charges</span>
                <span className="text-lg font-black text-emerald-500">₹0 Free</span>
              </div>
              <div className="w-0.5 h-full bg-lp-border dark:bg-zinc-800"></div>
              <div className="flex flex-col justify-between h-full text-right">
                <span className="text-[9px] uppercase font-bold text-on-surface-variant">Integration Fee</span>
                <span className="text-lg font-black text-indigo-500">Flat 1.5%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Simplicity (col-span-2) */}
          <div className="lg:col-span-2 flex flex-col justify-between bg-surface-container/30 border border-lp-border dark:border-zinc-800/60 p-8 md:p-10 rounded-[2.5rem] shadow-xs hover:border-[#6311f4]/30 dark:hover:border-indigo-400/30 transition-colors duration-300 overflow-hidden relative text-left">
            <div className="space-y-4">
              <h3 className="font-bold text-xl text-on-surface flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#6311f4] dark:text-indigo-400" />
                Zero-Training Interface
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Tap, select, done. New staff run a shift on OmniServe within their first hour.
              </p>
            </div>
            {/* Visual Micro-Illustration */}
            <div className="relative w-full h-24 bg-slate-900/10 dark:bg-zinc-950/40 rounded-2xl border border-lp-border dark:border-zinc-800 flex items-center justify-center p-4 mt-6 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6311f4]/5 to-indigo-500/5 pointer-events-none"></div>
              {/* Minimal tablet interface */}
              <div className="w-4/5 h-4/5 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-lp-border dark:border-zinc-800 p-2 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  </div>
                  <span className="text-[7px] text-slate-400">Simple View</span>
                </div>
                <div className="flex gap-2 justify-center py-1">
                  <div className="px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded text-[7px] font-bold">POS OK</div>
                  <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[7px] font-bold">KDS LIVE</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Support (col-span-3) */}
          <div className="lg:col-span-3 flex flex-col md:flex-row justify-between items-center bg-surface-container/30 border border-lp-border dark:border-zinc-800/60 p-8 md:p-10 rounded-[2.5rem] shadow-xs hover:border-[#6311f4]/30 dark:hover:border-indigo-400/30 transition-colors duration-300 overflow-hidden relative">
            <div className="max-w-xs space-y-4 text-left">
              <h3 className="font-bold text-xl text-on-surface flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#6311f4] dark:text-indigo-400" />
                24x7 Support
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Real people on standby for network, checkout, and device issues — most resolved in under two minutes.
              </p>
            </div>
            {/* Visual Micro-Illustration */}
            <div className="relative w-44 h-36 bg-slate-900/10 dark:bg-zinc-950/40 rounded-2xl border border-lp-border dark:border-zinc-800 flex flex-col justify-between p-3 shrink-0 mt-6 md:mt-0 overflow-hidden text-left">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6311f4]/5 to-indigo-500/5 pointer-events-none"></div>
              <div className="flex justify-between items-center border-b border-lp-border dark:border-zinc-800 pb-1.5">
                <span className="text-[8px] font-bold text-on-surface flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  OmniSupport
                </span>
                <span className="text-[7px] text-slate-400">Online</span>
              </div>
              <div className="space-y-1">
                <div className="bg-white dark:bg-zinc-900 p-1.5 rounded-lg border border-lp-border dark:border-zinc-800 text-[8px] max-w-[85%]">
                  Operational issue?
                </div>
                <div className="bg-indigo-500 text-white p-1.5 rounded-lg text-[8px] max-w-[85%] ml-auto text-right">
                  Resolved under 2 mins!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Staff Management */}
      <section className="py-24 bg-surface-container-low border-y border-lp-border">
        <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-margin-desktop grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-5 reveal">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 px-3.5 py-1 rounded-full mb-6 border border-indigo-500/20">
              <span className="text-[#6311f4] dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">Role Control</span>
            </div>
            <h2 className="font-headline-xl text-headline-xl mb-6 text-on-surface">Staff access, without the spreadsheet</h2>
            <p className="text-on-surface-variant mb-8 text-body-md leading-relaxed">
              Grant, restrict, and revoke access across hundreds of outlets from one console. Invite a new hire in seconds.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6311f4]"></span>
                <span className="font-semibold text-on-surface text-body-md">Role-based access control (RBAC)</span>
              </li>
              <li className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6311f4]"></span>
                <span className="font-semibold text-on-surface text-body-md">Outlet-specific permissions</span>
              </li>
              <li className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6311f4]"></span>
                <span className="font-semibold text-on-surface text-body-md">Centralized security audit logs</span>
              </li>
            </ul>
          </div>
          <div className="lg:col-span-7 reveal delay-200">
            <ProductShowcase
              src="/images/landingpage/staff.png"
              alt="OmniServe staff management directory with role badges and outlet assignments"
            />
          </div>
        </div>
      </section>

      {/* Technology Stack / Built for Scale */}
      <section className="py-24" id="tech">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center mb-20 reveal">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 px-3.5 py-1 rounded-full mb-4 border border-emerald-500/20">
            <span className="text-emerald-500 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest">Architecture</span>
          </div>
          <h2 className="font-headline-xl text-headline-xl mb-4 text-on-surface">Built for Scale</h2>
          <p className="text-on-surface-variant max-w-xl mx-auto text-body-md">
            A distributed stack engineered for 99.99% uptime and sub-second responses, even at peak service.
          </p>
        </div>

        <div className="max-w-container-max mx-auto px-margin-desktop reveal">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {techStackGroups.map((group, index) => {
              const IconComponent = group.icon;
              return (
                <div key={index} className="glass-card p-8 rounded-3xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-[#6311f4]/10 text-[#6311f4] dark:text-indigo-400">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-base text-on-surface">{group.category}</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.techs.map((tech, tIdx) => (
                      <span
                        key={tIdx}
                        className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${tech.badge}`}
                      >
                        {tech.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why OmniServe Comparative Grid */}
      <section className="py-24 bg-surface-container border-y border-lp-border">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-2 gap-12 reveal">
          <div className="bg-slate-100 dark:bg-zinc-900 border border-lp-border dark:border-zinc-800 p-10 md:p-12 rounded-[2.5rem] shadow-xs">
            <h3 className="font-headline-lg text-headline-lg mb-8 text-on-surface/40 dark:text-slate-500">Without OmniServe</h3>
            <ul className="space-y-6">
              <li className="flex items-start space-x-4">
                <XCircle className="text-red-500 shrink-0 mt-1" />
                <p className="text-on-surface-variant font-medium">Data scattered across 5+ disconnected apps</p>
              </li>
              <li className="flex items-start space-x-4">
                <XCircle className="text-red-500 shrink-0 mt-1" />
                <p className="text-on-surface-variant font-medium">Delivery and offline reports collated by hand</p>
              </li>
              <li className="flex items-start space-x-4">
                <XCircle className="text-red-500 shrink-0 mt-1" />
                <p className="text-on-surface-variant font-medium">No visibility into SLA breaches or wastage until it's too late</p>
              </li>
            </ul>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-10 md:p-12 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <CheckCheck className="w-32 h-32 text-indigo-400" />
            </div>
            <h3 className="font-headline-lg text-headline-lg mb-8 text-indigo-400">With OmniServe</h3>
            <ul className="space-y-6">
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-emerald-400 shrink-0 mt-1" />
                <p className="text-slate-200 font-medium">One source of truth for every checkout and session</p>
              </li>
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-emerald-400 shrink-0 mt-1" />
                <p className="text-slate-200 font-medium">Billing and inventory sync automatically</p>
              </li>
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-emerald-400 shrink-0 mt-1" />
                <p className="text-slate-200 font-medium">Predictive alerts catch waste and delays before they cost you</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Meet Our Team */}
      <section className="py-24">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center mb-16 reveal">
          <div className="inline-flex items-center space-x-2 bg-[#6311f4]/10 px-3.5 py-1 rounded-full mb-4 border border-[#6311f4]/20">
            <span className="text-[#6311f4] dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">Founding Team</span>
          </div>
          <h2 className="font-headline-xl text-headline-xl mb-4 text-on-surface">The Minds Behind OmniServe</h2>
          <p className="text-on-surface-variant max-w-lg mx-auto text-body-md">
            Engineers and designers building enterprise SaaS tools for global hospitality.
          </p>
        </div>
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 reveal">
          {teamMembers.map((member) => (
            <div key={member.name} className="text-center group">
              <div className="w-48 h-48 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-[#6311f4]/5 rounded-full"></div>
                <img
                  className="w-40 h-40 rounded-full mx-auto relative top-4 object-cover border-2 border-lp-border group-hover:border-[#6311f4]/50 transition-colors duration-300"
                  src={member.image}
                  alt={member.name}
                />
              </div>
              <h4 className="font-bold text-lg text-on-surface">{member.name}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-surface-container-low border-y border-lp-border">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-3 gap-8 reveal">
          {/* Review 1: 5 Stars */}
          <div className="glass-card p-10 rounded-[2rem] flex flex-col justify-between">
            <div>
              <div className="flex mb-6 space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="fill-[#FFB800] text-[#FFB800] w-4.5 h-4.5" />
                ))}
              </div>
              <p className="italic text-lg text-on-surface font-medium leading-relaxed mb-8">
                "OmniServe reduced our operational leakage by 22% in the first quarter alone. The inventory automation is unmatched."
              </p>
            </div>
            <div className="flex items-center space-x-4 border-t border-lp-border pt-4">
              <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[#6311f4] bg-[#6311f4]/15">JM</div>
              <div>
                <p className="font-bold text-on-surface text-sm">Julia Mendez</p>
                <p className="text-xs text-on-surface-variant">Director, Gusto Group</p>
              </div>
            </div>
          </div>

          {/* Review 2: 5 Stars */}
          <div className="glass-card p-10 rounded-[2rem] flex flex-col justify-between">
            <div>
              <div className="flex mb-6 space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="fill-[#FFB800] text-[#FFB800] w-4.5 h-4.5" />
                ))}
              </div>
              <p className="italic text-lg text-on-surface font-medium leading-relaxed mb-8">
                "Finally, a platform that understands the complexity of multi-outlet kitchen displays. Real-time updates are truly real-time."
              </p>
            </div>
            <div className="flex items-center space-x-4 border-t border-lp-border pt-4">
              <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[#6311f4] bg-[#6311f4]/15">KW</div>
              <div>
                <p className="font-bold text-on-surface text-sm">Kenji Wu</p>
                <p className="text-xs text-on-surface-variant">Operations Lead, Urban Eats</p>
              </div>
            </div>
          </div>

          {/* Review 3: 4 Stars */}
          <div className="glass-card p-10 rounded-[2rem] flex flex-col justify-between">
            <div>
              <div className="flex mb-6 space-x-1">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} className="fill-[#FFB800] text-[#FFB800] w-4.5 h-4.5" />
                ))}
                <Star className="text-slate-300 dark:text-zinc-700 w-4.5 h-4.5" />
              </div>
              <p className="italic text-lg text-on-surface font-medium leading-relaxed mb-8">
                "Integrating with Swiggy and Zomato used to be a nightmare. With OmniServe, it's a one-click setup. Absolute game changer."
              </p>
            </div>
            <div className="flex items-center space-x-4 border-t border-lp-border pt-4">
              <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[#6311f4] bg-[#6311f4]/15">RH</div>
              <div>
                <p className="font-bold text-on-surface text-sm">Robert Hart</p>
                <p className="text-xs text-on-surface-variant">Founder, Bistro Cloud</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-margin-desktop reveal">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 px-3.5 py-1 rounded-full mb-4 border border-indigo-500/20">
              <span className="text-[#6311f4] dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">Support Portal</span>
            </div>
            <h2 className="font-headline-xl text-headline-xl mb-4 text-on-surface">Frequently Asked Questions</h2>
            <p className="text-on-surface-variant text-body-md">
              Clear answers to the most common queries regarding implementation, billing and setup.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { q: 'What is OmniServe?', a: 'OmniServe is a next-generation Restaurant Operating System that merges your POS, Kitchen Display Systems (KDS), Table QR ordering, Inventory logs, and delivery channels into a unified network.' },
              { q: 'Who is it built for?', a: 'It is built specifically for enterprise restaurant operators, multi-brand cloud kitchens, franchises, and food tech groups looking to scale operations.' },
              { q: 'Can I manage multiple outlets?', a: 'Yes. OmniServe supports hierarchical tenant scopes allowing admins to toggle between, compare, and modify settings across hundreds of outlets.' },
              { q: 'Does it support QR ordering?', a: 'Absolutely. Customers can scan table-specific QR codes to review live digital menus and execute payments without needing an app download.' },
              { q: 'Can I integrate with existing POS systems?', a: 'Yes, OmniServe integrates natively with leading POS systems and legacy ERP solutions like SAP and Oracle via our REST APIs.' },
              { q: 'Is onboarding easy?', a: 'Yes. Single outlets can go live in 48 hours. Mid-size chains with up to 50 outlets typically complete rollout and employee onboarding within 2 weeks.' },
              { q: 'Does OmniServe provide real-time analytics?', a: 'Yes. We track gross and net sales, order volume mix, preparation SLAs, and kitchen bottlenecks on real-time webhooks.' },
              { q: 'What security measures are in place?', a: 'All data is encrypted in transit and at rest. We provide granular Role-Based Access Control (RBAC) and maintain full system audit logs.' },
              { q: 'How does offline mode function?', a: 'Our local sync node continues running billing terminals and kitchen displays even during internet outages, updating automatically once connectivity returns.' },
              { q: 'What support SLA is available?', a: 'Enterprise plans feature 24/7 dedicated support, emergency phone response, and an assigned implementation architect.' }
            ].map((faq, index) => {
              const isOpen = !!faqOpen[index];
              return (
                <div key={index} className="glass-card rounded-2xl overflow-hidden border border-lp-border">
                  <button
                    className="w-full p-6 text-left font-bold flex justify-between items-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-on-surface focus:outline-hidden"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                  >
                    <span className="text-base">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-[#6311f4] dark:text-indigo-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
                  </button>
                  <div
                    className="px-6 transition-all duration-300 overflow-hidden"
                    style={{
                      maxHeight: isOpen ? '160px' : '0px',
                      paddingBottom: isOpen ? '1.5rem' : '0px',
                      paddingTop: isOpen ? '0.5rem' : '0px'
                    }}
                  >
                    <p className="text-on-surface-variant text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-20 sm:py-24 bg-surface-container border-y border-lp-border">
        <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-margin-desktop reveal">
          <div className="glass-card p-6 sm:p-8 md:p-12 lg:p-16 rounded-[2rem] md:rounded-[3rem] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#6311f4]/5 rounded-full -mr-32 -mt-32 pointer-events-none"></div>
            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-12 items-center relative z-10">
              <div>
                <div className="inline-flex items-center space-x-2 bg-[#fc8a63]/10 px-3.5 py-1 rounded-full mb-6 border border-[#fc8a63]/20">
                  <span className="text-[#fc8a63] font-bold text-xs uppercase tracking-widest">Get In Touch</span>
                </div>
                <h2 className="font-headline-xl text-headline-xl md:font-display-lg md:text-display-lg mb-6 text-on-surface">Contact Us</h2>
                <p className="text-on-surface-variant text-body-lg mb-10 leading-relaxed">
                  Ready to bring your operations onto one platform? Reach out for a system audit and consultation, tailored to your outlets.
                </p>
                <div className="space-y-6">
                  <div className="flex items-center space-x-5">
                    <div className="w-12 h-12 bg-[#6311f4]/10 flex items-center justify-center rounded-xl text-[#6311f4] dark:text-indigo-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Email Us</p>
                      <a className="text-base font-bold text-[#6311f4] dark:text-indigo-400 hover:underline no-underline" href="mailto:ajaygurjar78692@gmail.com">ajaygurjar78692@gmail.com</a>
                    </div>
                  </div>
                  <div className="flex items-center space-x-5">
                    <div className="w-12 h-12 bg-[#6311f4]/10 flex items-center justify-center rounded-xl text-[#6311f4] dark:text-indigo-400">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Call Us</p>
                      <a className="text-base font-bold text-[#6311f4] dark:text-indigo-400 hover:underline no-underline" href="tel:+919939608743">+91 99396 08743</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-950 p-5 sm:p-6 md:p-8 rounded-3xl border border-lp-border dark:border-zinc-800 shadow-md">
                {formStatus === 'success' ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCheck className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-xl mb-3 text-on-surface">Message Sent!</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed max-w-sm mx-auto">
                      Thank you for contacting OmniServe support. Our enterprise team will reply to <span className="font-semibold">{submittedEmail}</span>.
                    </p>
                    <button
                      onClick={() => {
                        setFormData({ firstName: '', lastName: '', email: '', message: '' });
                        setSubmittedEmail('');
                        setFormStatus('idle');
                      }}
                      className="mt-6 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-on-surface rounded-xl text-xs font-bold transition-colors"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={handleContactSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5">First Name *</label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border border-lp-border dark:border-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-[#6311f4] bg-slate-50/50 dark:bg-zinc-900/50 text-on-surface text-sm"
                          placeholder="First Name"
                          type="text"
                          required
                          disabled={formStatus === 'submitting'}
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5">Last Name</label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border border-lp-border dark:border-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-[#6311f4] bg-slate-50/50 dark:bg-zinc-900/50 text-on-surface text-sm"
                          placeholder="Second Name"
                          type="text"
                          disabled={formStatus === 'submitting'}
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5">Email Address *</label>
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-lp-border dark:border-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-[#6311f4] bg-slate-50/50 dark:bg-zinc-900/50 text-on-surface text-sm"
                        placeholder="yusuf@omniserve.io"
                        type="email"
                        required
                        disabled={formStatus === 'submitting'}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5">Message *</label>
                      <textarea
                        className="w-full px-4 py-3 rounded-xl border border-lp-border dark:border-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-[#6311f4] bg-slate-50/50 dark:bg-zinc-900/50 text-on-surface text-sm"
                        placeholder="Tell us about your restaurant operations..."
                        rows="4"
                        required
                        disabled={formStatus === 'submitting'}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      ></textarea>
                    </div>

                    {formStatus === 'error' && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-medium">
                        {formError}
                      </div>
                    )}

                    <button
                      className="w-full py-4 bg-[#6311f4] hover:bg-[#520dd4] disabled:bg-slate-300 text-white rounded-xl font-bold transition-all shadow-md shadow-[#6311f4]/15"
                      type="submit"
                      disabled={formStatus === 'submitting'}
                    >
                      {formStatus === 'submitting' ? 'Submitting Message...' : 'Send Message'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 max-w-container-max mx-auto px-margin-desktop reveal">
        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden border border-slate-800 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#6311f4]/25 to-transparent pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="font-display-lg text-display-lg mb-6 text-white leading-tight">Ready to run one operation?</h2>
            <p className="text-lg text-slate-300 mb-10">
              Join 1,200+ restaurant groups worldwide who moved off spreadsheets and onto OmniServe.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link className="px-10 py-4.5 bg-[#6311f4] hover:bg-[#520dd4] text-white rounded-xl font-bold text-base transition-colors shadow-lg shadow-[#6311f4]/20 no-underline" to="/login">
                Get Started
              </Link>
              <button onClick={scrollToContact} className="px-10 py-4.5 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-xl font-bold text-base border border-white/15 transition-colors text-white">
                Schedule a Call
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-950 rounded-t-[3rem] border-t border-lp-border dark:border-zinc-900 pt-20 pb-10 transition-colors relative overflow-hidden">
        {/* Decorative top border highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#6311f4]/30 to-transparent"></div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 px-margin-desktop max-w-container-max mx-auto reveal mb-16">
          <div className="md:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="OmniServe Logo" className="w-9 h-9 object-contain rounded-xl shadow-xs" />
              <span className="font-hanken font-bold text-xl text-on-surface tracking-tight">OmniServe</span>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-sm">
              Empowering the world's best restaurants with the most advanced operational software on the market.
            </p>
            <div className="flex space-x-3.5 pt-2">
              <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-zinc-900 border border-lp-border dark:border-zinc-800 flex items-center justify-center cursor-pointer hover:bg-[#6311f4] hover:text-white dark:hover:bg-indigo-500 dark:hover:text-zinc-950 transition-colors duration-200 text-on-surface-variant">
                <TwitterIcon className="w-4 h-4" />
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-zinc-900 border border-lp-border dark:border-zinc-800 flex items-center justify-center cursor-pointer hover:bg-[#6311f4] hover:text-white dark:hover:bg-indigo-500 dark:hover:text-zinc-950 transition-colors duration-200 text-on-surface-variant">
                <LinkedinIcon className="w-4 h-4" />
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-zinc-900 border border-lp-border dark:border-zinc-800 flex items-center justify-center cursor-pointer hover:bg-[#6311f4] hover:text-white dark:hover:bg-indigo-500 dark:hover:text-zinc-950 transition-colors duration-200 text-on-surface-variant">
                <InstagramIcon className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-bold text-xs uppercase tracking-widest text-[#6311f4] dark:text-indigo-400 mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-on-surface-variant p-0 m-0 list-none">
              <li><a href="#product" className="inline-block hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors no-underline text-inherit font-medium">Operations Cockpit</a></li>
              <li><a href="#product" className="inline-block hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors no-underline text-inherit font-medium">Smart Inventory</a></li>
              <li><a href="#product" className="inline-block hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors no-underline text-inherit font-medium">Unified Billing</a></li>
              <li><a href="#product" className="inline-block hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors no-underline text-inherit font-medium">KDS Engine</a></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-bold text-xs uppercase tracking-widest text-[#6311f4] dark:text-indigo-400 mb-6">Security & Trust</h4>
            <ul className="space-y-4 text-sm text-on-surface-variant p-0 m-0 list-none">
              <li className="hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors cursor-pointer font-medium">Enterprise SLA</li>
              <li className="hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors cursor-pointer font-medium">Privacy Protocol</li>
              <li className="hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors cursor-pointer font-medium">Encryption Standards</li>
              <li className="hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors cursor-pointer font-medium">Global Audit Logs</li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-bold text-xs uppercase tracking-widest text-[#6311f4] dark:text-indigo-400 mb-6">Support</h4>
            <ul className="space-y-4 text-sm text-on-surface-variant p-0 m-0 list-none">
              <li className="hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors cursor-pointer font-medium">System Documentation</li>
              <li className="hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors cursor-pointer font-medium">Customer Case Studies</li>
              <li className="hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors cursor-pointer font-medium">Knowledge Base</li>
              <li><a href="#contact" className="inline-block hover:text-[#6311f4] dark:hover:text-indigo-400 duration-200 transition-colors no-underline text-inherit font-medium">Contact Support</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-container-max mx-auto px-margin-desktop pt-8 border-t border-lp-border dark:border-zinc-900 flex flex-col sm:flex-row justify-between items-center text-xs text-on-surface-variant gap-4">
          <p className="font-medium">© 2026 OmniServe Enterprise Solutions. All rights reserved.</p>
          <div className="flex space-x-6 font-medium">
            <span className="cursor-pointer hover:text-[#6311f4] dark:hover:text-indigo-400 transition-colors">Terms of Service</span>
            <span className="cursor-pointer hover:text-[#6311f4] dark:hover:text-indigo-400 transition-colors">Privacy Policy</span>
            <span className="cursor-pointer hover:text-[#6311f4] dark:hover:text-indigo-400 transition-colors">Cookies Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
