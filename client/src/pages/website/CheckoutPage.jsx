import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  getQrSessionBillApi,
  payQrSessionBillApi,
  splitQrSessionBillApi,
  submitQrSessionFeedbackApi
} from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import { useSocket } from "../../context/SocketContext";
import { 
  HiOutlineChevronLeft,
  HiOutlineCreditCard,
  HiOutlineQrCode,
  HiOutlineCheckBadge,
  HiOutlineInboxArrowDown,
  HiOutlineBanknotes,
  HiOutlineArrowDownTray,
  HiOutlineUsers,
  HiOutlineHeart,
  HiOutlineUser
} from "react-icons/hi2";

export default function CheckoutPage() {
  const { outletSlug } = useParams();
  const navigate = useNavigate();
  const { lastMessage } = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billData, setBillData] = useState(null);

  // Split billing states
  const [splitMode, setSplitMode] = useState("NONE"); // 'NONE' | 'EQUAL' | 'BY_SEAT' | 'CUSTOM'
  const [customSplits, setCustomSplits] = useState([]); // [{ seatNumber: 'Seat 1', amount: 100 }]
  const [selectedSeatToPay, setSelectedSeatToPay] = useState(null); // seatNumber to pay for

  // Payment states
  const [paymentMode, setPaymentMode] = useState("UPI"); // 'UPI' | 'CARD' | 'CASH' | 'PAY_LATER'
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null); // 'SUCCESS' | 'FAILED' | 'REQUESTED'
  const [transactionId, setTransactionId] = useState("");

  // Feedback states
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Tip contribution
  const [tipAmount, setTipAmount] = useState(0);

  const sessionToken = localStorage.getItem("sessionToken");
  const guestSessionToken = localStorage.getItem("guestSessionToken");

  const fetchBillDetails = async () => {
    if (!sessionToken) return;
    try {
      const res = await getQrSessionBillApi(sessionToken);
      setBillData(res.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load session billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillDetails();
  }, [sessionToken]);

  // Listen to WebSocket events for real-time split/payment sync
  useEffect(() => {
    if (lastMessage) {
      const { event, payload } = lastMessage;
      if (
        event === "BILL_SPLIT_CREATED" ||
        event === "BILL_REQUESTED" ||
        event === "BILL_SETTLED"
      ) {
        console.log("[CheckoutPage] Webhook sync received, refreshing bill...");
        fetchBillDetails();
      }
    }
  }, [lastMessage]);

  // Handle split calculations on the backend
  const handleApplySplitMode = async (mode) => {
    if (!sessionToken || !billData?.billSession) return;
    setLoading(true);

    try {
      let payload = { splitType: mode };
      if (mode === "CUSTOM") {
        // Initialize custom splits with equal distribution initially
        const seatCount = billData.billSession.seats?.length || 1;
        const equalShare = Number((grandTotalAmount / seatCount).toFixed(2));
        const initSplits = (billData.billSession.seats || []).map((seat, idx) => ({
          seatNumber: seat.seatNumber || `Seat ${idx + 1}`,
          amount: idx === seatCount - 1 ? grandTotalAmount - equalShare * (seatCount - 1) : equalShare
        }));
        setCustomSplits(initSplits);
        setSplitMode("CUSTOM");
        setLoading(false);
        return;
      }

      const res = await splitQrSessionBillApi(sessionToken, payload);
      setSplitMode(mode);
      fetchBillDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to apply split strategy");
      setLoading(false);
    }
  };

  // Submit custom split
  const handleApplyCustomSplit = async () => {
    const totalCustom = customSplits.reduce((sum, s) => sum + Number(s.amount), 0);
    
    // Allow minor decimal rounding difference (within ₹1)
    if (Math.abs(totalCustom - grandTotalAmount) > 1) {
      alert(`Total sum of custom splits (₹${totalCustom}) must equal the grand total bill (₹${grandTotalAmount})`);
      return;
    }

    setLoading(true);
    try {
      await splitQrSessionBillApi(sessionToken, {
        splitType: "CUSTOM",
        customSplits
      });
      fetchBillDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to apply custom splits");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSplitChange = (idx, amount) => {
    const updated = [...customSplits];
    updated[idx].amount = Number(amount) || 0;
    setCustomSplits(updated);
  };

  // Initiate QR session bill payment
  const handleProcessPayment = async () => {
    if (!sessionToken) return;
    setProcessingPayment(true);

    try {
      const payload = {
        paymentMode,
        tip: tipAmount,
        seatNumber: selectedSeatToPay || undefined
      };

      const res = await payQrSessionBillApi(sessionToken, payload);
      const data = res.data.data;

      // Handle CASH payment requested case
      if (paymentMode === "CASH") {
        setPaymentResult("REQUESTED");
      } else {
        setPaymentResult("SUCCESS");
        setTransactionId(`TXN-SIM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Payment execution failed");
      setPaymentResult("FAILED");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Submit feedback review
  const handleFeedbackSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!sessionToken) return;

    setSubmittingFeedback(true);
    try {
      await submitQrSessionFeedbackApi(sessionToken, {
        rating,
        reviewText: feedbackText
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Download digital receipt printout
  const handleDownloadReceipt = () => {
    if (!billData || !billData.billSession) return;
    const { billSession, items } = billData;

    const receiptContent = `
=========================================
          DIGITAL RECEIPT
=========================================
Restaurant: ${outletSlug.toUpperCase()}
Table: ${billData.table?.tableNumber || "N/A"}
Transaction: ${transactionId}
Date: ${new Date().toLocaleString()}
-----------------------------------------
Items Ordered:
${items.map(item => `- ${item.name} (x${item.quantity}) : ₹${(item.price || 0) * item.quantity}`).join("\n")}
-----------------------------------------
Subtotal: ₹${billSession.subtotal}
Taxes (5%): ₹${billSession.tax}
Service Charge: ₹15
Grand Total Paid: ₹${grandTotalAmount}
Payment Method: ${paymentMode}
=========================================
Thank you for dining with us!
=========================================
    `;

    const blob = new Blob([receiptContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Receipt-${transactionId || "Session"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Pricing helper computations
  const grandTotalAmount = useMemo(() => {
    if (!billData?.billSession) return 0;
    const sub = billData.billSession.subtotal || 0;
    const tax = billData.billSession.tax || 0;
    return sub + tax + 15; // subtotal + tax + service/packing fee
  }, [billData]);

  const payableAmountForActiveUser = useMemo(() => {
    if (!billData?.billSession) return 0;
    const { splits } = billData.billSession;
    
    // If table has active splits and a specific seat is chosen to pay
    if (splits && splits.length > 0) {
      if (selectedSeatToPay) {
        const split = splits.find(s => s.seatNumber === selectedSeatToPay);
        return split ? split.amount : 0;
      }
      // Default to the first unpaid split
      const firstUnpaid = splits.find(s => !s.isPaid);
      return firstUnpaid ? firstUnpaid.amount : 0;
    }
    return grandTotalAmount;
  }, [billData, selectedSeatToPay, grandTotalAmount]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-900 guest-ordering">
        <Spinner size="lg" className="text-[#6311f4]" />
      </div>
    );
  }

  if (error || !billData || !billData.billSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-zinc-950 p-6 text-center space-y-4 guest-ordering">
        <h2 className="text-lg font-black text-rose-500">No Outstanding Bill</h2>
        <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
          There is no outstanding balance or active billing session for this table right now.
        </p>
        <button
          onClick={() => navigate(`/public/w/${outletSlug}/menu`)}
          className="px-6 py-2.5 bg-[#6311f4] text-white font-bold rounded-xl text-xs uppercase tracking-wider"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  const { billSession, items, table } = billData;

  // 1. Processing State
  if (processingPayment) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-950 space-y-4 guest-ordering">
        <Spinner size="lg" className="text-[#6311f4]" />
        <div className="text-center space-y-1">
          <h2 className="font-black text-base tracking-tight">Processing Payment...</h2>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Please do not refresh or close this screen</p>
        </div>
      </div>
    );
  }

  // 2. requested Cash / Settle Success State
  if (paymentResult) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-5 guest-ordering">
        <div className="bg-white border border-zinc-100 p-6 rounded-3xl max-w-md w-full text-center space-y-6 shadow-xl shadow-zinc-200/50">
          {paymentResult === "REQUESTED" ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-center justify-center text-amber-500 text-4xl mx-auto animate-bounce-short">
                <HiOutlineInboxArrowDown />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-black text-zinc-950 tracking-tight">Cash Settle Requested</h1>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
                  A waiter task has been dispatched. A waiter will visit <strong>Table {table?.tableNumber}</strong> shortly to collect cash payment of ₹{payableAmountForActiveUser}.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-500 text-4xl mx-auto animate-bounce-short">
                <HiOutlineCheckBadge />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-black text-zinc-950 tracking-tight">Payment Settled!</h1>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
                  Your table payment of ₹{payableAmountForActiveUser} has been successfully settled.
                </p>
              </div>

              {/* Digital Receipt breakdown */}
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-left space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Digital Invoice</span>
                  <span className="font-mono text-[9px] text-zinc-400 font-bold">{transactionId}</span>
                </div>
                <div className="space-y-1.5 text-xs font-bold text-zinc-600">
                  <div className="flex justify-between">
                    <span>Items Subtotal</span>
                    <span className="text-zinc-900">₹{billSession.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%)</span>
                    <span className="text-zinc-900">₹{billSession.tax}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Fee</span>
                    <span className="text-zinc-900">₹15</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-2 font-black text-zinc-900 text-sm">
                    <span>Amount Paid</span>
                    <span className="text-[#6311f4]">₹{payableAmountForActiveUser}</span>
                  </div>
                </div>
              </div>

              {/* Download Digital Receipt Actions */}
              <button
                onClick={handleDownloadReceipt}
                className="w-full bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HiOutlineArrowDownTray className="w-4 h-4 text-[#6311f4]" />
                <span>Download Receipt</span>
              </button>

              {/* Feedback and rating section */}
              <div className="border-t border-zinc-100 pt-5 space-y-4">
                {feedbackSubmitted ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-center gap-2 text-emerald-700 text-xs font-bold justify-center">
                    <HiOutlineHeart className="w-5 h-5" />
                    <span>Thank you for your feedback!</span>
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-3 text-left">
                    <h3 className="font-extrabold text-xs text-zinc-800 text-center">Rate Your Dining Experience</h3>
                    
                    {/* Stars Selectors */}
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`text-2xl transition ${
                            star <= rating ? "text-amber-500" : "text-zinc-200 hover:text-amber-400"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Share optional review comments..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-100 text-zinc-900 placeholder-zinc-400 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6311f4]/35"
                    />

                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="w-full bg-zinc-950 hover:bg-zinc-800 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition"
                    >
                      {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <Link to={`/public/w/${outletSlug}/menu`}>
              <button className="w-full bg-[#6311f4] hover:bg-[#520dd4] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-[#6311f4]/15 active:scale-95 transition-all">
                Return to Menu
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col guest-ordering pb-24 select-none">
      {/* sticky navigation bar */}
      <header className="bg-white border-b border-zinc-100/80 sticky top-0 z-40 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <Link 
          to={`/public/w/${outletSlug}/menu`}
          className="w-9 h-9 bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600 transition"
        >
          <HiOutlineChevronLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <h1 className="font-black text-[14px] text-zinc-900 tracking-tight">Settle Bill</h1>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Table {table?.tableNumber} • Settle Balance</p>
        </div>
        <div className="w-9"></div>
      </header>

      {/* Settle main catalog container */}
      <div className="flex-grow max-w-xl w-full mx-auto p-4 space-y-4">
        
        {/* Bill Breakdown Items Summary */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-xs p-4 space-y-3">
          <h3 className="font-black text-xs text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-2">Table Orders</h3>
          <div className="divide-y divide-zinc-50 max-h-36 overflow-y-auto space-y-2 pr-1.5">
            {items.map((item) => (
              <div key={item.name} className="pt-2 first:pt-0 flex justify-between text-xs font-bold text-zinc-700">
                <span>{item.name} (x{item.quantity})</span>
                <span className="text-zinc-900">₹{(item.price || 0) * item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Split Billing Options block */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-xs p-4 space-y-4">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-xs text-zinc-800 tracking-tight">Split Options</h3>
            <p className="text-[9px] text-zinc-400">Decide how you want to divide the outstanding table balance.</p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "NONE", label: "Full Bill" },
              { id: "EQUAL", label: "Equal" },
              { id: "BY_SEAT", label: "By Seat" },
              { id: "CUSTOM", label: "Custom" }
            ].map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => handleApplySplitMode(strategy.id)}
                className={`py-2 text-[10px] font-black uppercase tracking-wider border rounded-xl transition cursor-pointer ${
                  splitMode === strategy.id 
                    ? "bg-[#6311f4]/10 border-[#6311f4]/20 text-[#6311f4]" 
                    : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200"
                }`}
              >
                {strategy.label}
              </button>
            ))}
          </div>

          {/* Render custom splits input rows */}
          {splitMode === "CUSTOM" && (
            <div className="space-y-3 pt-3 border-t border-zinc-100">
              <h4 className="font-extrabold text-xs text-zinc-800">Custom Splits Amount</h4>
              <div className="space-y-2">
                {customSplits.map((split, idx) => (
                  <div key={split.seatNumber} className="flex items-center justify-between gap-3 bg-zinc-50 border border-zinc-100 rounded-xl p-2">
                    <span className="text-xs font-bold text-zinc-700">{split.seatNumber}</span>
                    <div className="w-24">
                      <input
                        type="number"
                        value={split.amount}
                        onChange={(e) => handleCustomSplitChange(idx, e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs text-right font-black focus:outline-none focus:border-[#6311f4]"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleApplyCustomSplit}
                className="w-full bg-zinc-950 hover:bg-zinc-800 text-white font-black text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition"
              >
                Confirm Custom Distribution
              </button>
            </div>
          )}

          {/* Render Multi-Guest active splits list */}
          {billSession.splits && billSession.splits.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-zinc-100">
              <h4 className="font-extrabold text-xs text-zinc-800">Seats Distribution</h4>
              <div className="space-y-2">
                {billSession.splits.map((split) => (
                  <div 
                    key={split.seatNumber}
                    onClick={() => {
                      if (!split.isPaid) setSelectedSeatToPay(split.seatNumber);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedSeatToPay === split.seatNumber 
                        ? "bg-[#6311f4]/5 border-[#6311f4]/25 shadow-xs" 
                        : split.isPaid 
                          ? "bg-emerald-500/5 border-emerald-500/10 opacity-70" 
                          : "bg-zinc-50 border-zinc-100 hover:border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <HiOutlineUser className={`w-4 h-4 ${split.isPaid ? "text-emerald-500" : "text-zinc-400"}`} />
                      <span className="text-xs font-black text-zinc-700">{split.seatNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-900">₹{split.amount}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        split.isPaid ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      }`}>
                        {split.isPaid ? "Paid" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settle Payment method selection */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-xs p-4 space-y-4">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-xs text-zinc-800 tracking-tight">Select Payment Method</h3>
            <p className="text-[9px] text-zinc-400">Choose how you want to transact this payment.</p>
          </div>

          <div className="space-y-2">
            {[
              { id: "UPI", label: "Instant UPI QR Code", sub: "Scan dynamic QR via GPay, PhonePe", icon: <HiOutlineQrCode className="w-5 h-5" /> },
              { id: "CARD", label: "Credit / Debit Cards", sub: "Visa, Mastercard, RuPay processed", icon: <HiOutlineCreditCard className="w-5 h-5" /> },
              { id: "CASH", label: "Cash Settle at Counter", sub: "Request waiter to visit table to collect cash", icon: <HiOutlineBanknotes className="w-5 h-5 text-emerald-600" /> }
            ].map((method) => (
              <div
                key={method.id}
                onClick={() => setPaymentMode(method.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  paymentMode === method.id 
                    ? "bg-[#6311f4]/5 border-[#6311f4]/25" 
                    : "bg-white border-zinc-100 hover:border-zinc-200"
                }`}
              >
                <div className={`p-2.5 rounded-lg ${paymentMode === method.id ? "bg-[#6311f4]/10 text-[#6311f4]" : "bg-zinc-50 text-zinc-400"}`}>
                  {method.icon}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-zinc-800">{method.label}</h4>
                  <p className="text-[9px] text-zinc-400 mt-0.5">{method.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* dynamic QR Code generation view */}
          {paymentMode === "UPI" && (
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-center space-y-3">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Scan to Pay</span>
              <div className="w-36 h-36 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center mx-auto relative shadow-xs p-3">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=omniserve@bank%26pn=OmniServe%26am=${payableAmountForActiveUser}`} 
                  alt="Payment QR" 
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[9px] text-zinc-400 leading-relaxed max-w-xs mx-auto">
                Scan this QR using your UPI app (GPay, PhonePe, Paytm) to transfer exactly <strong>₹{payableAmountForActiveUser}</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Tip selector block */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-xs p-4 space-y-3">
          <h3 className="font-extrabold text-xs text-zinc-800 tracking-tight">Tip Staff</h3>
          <div className="flex gap-2">
            {[0, 20, 50, 100].map((tip) => (
              <button
                key={tip}
                onClick={() => setTipAmount(tip)}
                className={`flex-1 py-2 text-xs font-extrabold border rounded-xl transition ${
                  tipAmount === tip 
                    ? "bg-[#6311f4]/10 border-[#6311f4]/20 text-[#6311f4]" 
                    : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200"
                }`}
              >
                {tip === 0 ? "No Tip" : `₹${tip}`}
              </button>
            ))}
          </div>
        </div>

        {/* Settle breakdown breakdown */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-xs p-4 space-y-3">
          <h3 className="font-black text-xs text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-2">Bill Summary</h3>
          <div className="space-y-2 text-xs font-bold text-zinc-600">
            <div className="flex justify-between">
              <span>Table Total Subtotal</span>
              <span className="text-zinc-900">₹{billSession.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (5%)</span>
              <span className="text-zinc-900">₹{billSession.tax}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Charge</span>
              <span className="text-zinc-900">₹15</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between text-[#6311f4]">
                <span>Tip Contribution</span>
                <span>₹{tipAmount}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-100 pt-3 font-black text-sm text-zinc-900">
              <span>Payable Amount</span>
              <span className="text-[#6311f4] text-base">₹{payableAmountForActiveUser + tipAmount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Pay CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 p-4 z-40 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Payable Balance</p>
            <p className="text-base font-black text-[#6311f4]">₹{payableAmountForActiveUser + tipAmount}</p>
          </div>
          <button
            onClick={handleProcessPayment}
            className="flex-1 bg-[#6311f4] hover:bg-[#520dd4] text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl shadow-lg shadow-[#6311f4]/15 active:scale-97 transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Confirm & Settle Bill →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
