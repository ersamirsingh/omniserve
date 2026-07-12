import React from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { HiOutlineCheckBadge, HiOutlineArrowRight, HiOutlineHome } from "react-icons/hi2";

export default function OrderSuccessPage() {
  const { outletSlug } = useParams();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-5 guest-ordering">
      <div className="bg-white border border-zinc-100 p-6 rounded-3xl max-w-md w-full text-center space-y-6 shadow-xl shadow-zinc-200/50">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-500 text-4xl mx-auto animate-bounce-short">
          <HiOutlineCheckBadge />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl font-black text-zinc-950 tracking-tight">Order Confirmed!</h1>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
            Your order has been placed successfully and sent to the kitchen. Chef has started preparing your food.
          </p>
        </div>

        {orderId && (
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-left space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Order Reference ID</span>
            <span className="font-mono text-xs font-black text-zinc-800 block break-all">{orderId}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col gap-3">
          {orderId && (
            <Link to={`/public/w/${outletSlug}/track/${orderId}`}>
              <button className="w-full bg-[#6311f4] hover:bg-[#520dd4] text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg shadow-[#6311f4]/15 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <span>Track Live Progress</span>
                <HiOutlineArrowRight className="w-4 h-4" />
              </button>
            </Link>
          )}
          <Link to={`/public/w/${outletSlug}/menu`}>
            <button className="w-full bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <HiOutlineHome className="w-4 h-4 text-[#6311f4]" />
              <span>Back to Menu</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
