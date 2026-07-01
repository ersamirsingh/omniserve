import React from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

export default function OrderSuccessPage() {
  const { outletSlug } = useParams();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <Card className="bg-zinc-900 border-zinc-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl mx-auto">
          ✓
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Order Placed Successfully!</h1>
          <p className="text-sm text-zinc-400">
            Thank you for ordering. Your order has been registered in the kitchen pipeline.
          </p>
        </div>

        {orderId && (
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 text-left space-y-1.5">
            <span className="text-xs text-zinc-500 uppercase tracking-wider block">Order ID</span>
            <span className="font-mono text-sm font-bold text-zinc-200 block break-all">{orderId}</span>
          </div>
        )}

        <div className="pt-4 flex flex-col gap-3">
          {orderId && (
            <Link to={`/public/w/${outletSlug}/track/${orderId}`}>
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-sm">
                Track Live Progress
              </button>
            </Link>
          )}
          <Link to={`/public/w/${outletSlug}`}>
            <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 px-4 rounded-xl transition-all text-sm">
              Back to Menu
            </button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
