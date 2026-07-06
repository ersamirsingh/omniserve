import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getQrSessionBillApi, payQrSessionBillApi } from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { QRCodeSVG } from "qrcode.react";
import { 
  HiOutlineCreditCard, 
  HiOutlineCurrencyRupee, 
  HiOutlineCheckCircle, 
  HiOutlineBellAlert,
  HiOutlineInboxArrowDown,
  HiArrowPath
} from "react-icons/hi2";

export default function TableSessionPage() {
  const { outletSlug } = useParams();
  const navigate = useNavigate();
  const sessionToken = localStorage.getItem("sessionToken");

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);

  // Tip options
  const [selectedTipPct, setSelectedTipPct] = useState(null);
  const [customTip, setCustomTip] = useState("");
  const [calculatedTip, setCalculatedTip] = useState(0);

  // Payment states
  const [selectedMethod, setSelectedMethod] = useState(null); // 'UPI' | 'PHONEPE' | 'CARD' | 'CASH'
  const [processing, setProcessing] = useState(false);
  const [cashRequested, setCashRequested] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  const fetchSessionBill = () => {
    if (!sessionToken) {
      setError("No active dine-in table session found. Please scan a table QR code.");
      setLoading(false);
      return;
    }

    getQrSessionBillApi(sessionToken)
      .then((res) => {
        const data = res.data.data;
        setSessionData(data);
        // If the table session has already been settled on the server, redirect or show success
        if (data.billSession && data.billSession.status === "SETTLED") {
          setPaymentSuccessData(data.billSession);
          localStorage.removeItem("sessionToken");
        }
        // Sync cash request state
        if (data.table && data.table.operationalStatus === "BILL_REQUESTED") {
          setCashRequested(true);
        }
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load active table session bill.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSessionBill();
    // Poll every 10s to see if waiter changes something or order gets added/ready
    const interval = setInterval(fetchSessionBill, 10000);
    return () => clearInterval(interval);
  }, [sessionToken]);

  // Recalculate tip whenever selection changes
  useEffect(() => {
    if (!sessionData?.billSession) return;
    const subtotal = sessionData.billSession.subtotal || 0;
    if (selectedTipPct !== null) {
      setCalculatedTip(Number((subtotal * (selectedTipPct / 100)).toFixed(2)));
      setCustomTip("");
    } else if (customTip) {
      setCalculatedTip(Number(Number(customTip).toFixed(2)) || 0);
    } else {
      setCalculatedTip(0);
    }
  }, [selectedTipPct, customTip, sessionData]);

  if (loading && !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !sessionToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center space-y-4">
        <HiOutlineBellAlert className="text-5xl text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold">No Table Session Found</h2>
        <p className="text-zinc-400 max-w-sm text-sm leading-relaxed">{error || "Please scan a valid table QR code to start ordering and view your session."}</p>
        <Link to={`/public/w/${outletSlug}/menu`}>
          <Button variant="primary">Browse Menu</Button>
        </Link>
      </div>
    );
  }

  const { billSession, items, table } = sessionData || {};
  const ordersCount = billSession?.orderIds?.length || 0;
  const subtotal = billSession?.subtotal || 0;
  const tax = billSession?.tax || 0;
  const finalTotal = subtotal + tax + calculatedTip;

  const handlePay = async (methodOverride) => {
    const method = methodOverride || selectedMethod;
    if (!method) return;

    setProcessing(true);
    try {
      const res = await payQrSessionBillApi(sessionToken, {
        paymentMode: method,
        tip: calculatedTip,
        seatNumber: billSession?.seatNumber || undefined
      });

      if (method === "CASH") {
        setCashRequested(true);
        setCalculatedTip(0);
        setSelectedTipPct(null);
        fetchSessionBill();
      } else {
        setPaymentSuccessData(res.data.data);
        localStorage.removeItem("sessionToken");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to process payment. Please try again.");
    } finally {
      setProcessing(false);
      setSelectedMethod(null);
    }
  };

  // Payment Success Screen
  if (paymentSuccessData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-6 space-y-6">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500 rounded-full flex items-center justify-center text-emerald-400 text-3xl animate-bounce">
          ✓
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h1 className="text-2xl font-bold text-white">Bill Settled Successfully!</h1>
          <p className="text-zinc-400 text-sm">
            Thank you for dining with us! Your payment has been processed and table {table?.tableNumber || "session"} is now fully checked out.
          </p>
        </div>

        <Card className="bg-zinc-900 border-zinc-800 w-full max-w-sm p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-850 pb-2">Receipt Details</h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Status:</span>
              <Badge variant="success">PAID</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Settled:</span>
              <span className="font-bold text-white">₹{paymentSuccessData.totalAmount || finalTotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Settled At:</span>
              <span className="font-medium text-zinc-300">
                {paymentSuccessData.settledAt ? new Date(paymentSuccessData.settledAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </Card>

        <Link to={`/public/w/${outletSlug}`}>
          <Button variant="primary" className="px-8 py-3 rounded-xl shadow-lg">
            Return to Store Menu
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <Link to={`/public/w/${outletSlug}/menu`} className="text-zinc-400 hover:text-white transition-all text-sm font-semibold flex items-center gap-2">
          ← Back to Menu
        </Link>
        <h1 className="font-bold text-lg text-white">Table {table?.tableNumber || "Session"} Bill</h1>
        <button onClick={fetchSessionBill} className="text-xs text-zinc-400 hover:text-white border border-zinc-800 rounded-lg px-2.5 py-1 flex items-center gap-1">
          <HiArrowPath className="w-3.5 h-3.5" /> Refresh
        </button>
      </header>

      <div className="flex-grow max-w-4xl w-full mx-auto p-6 flex flex-col lg:flex-row gap-6">
        {/* Ordered items list */}
        <div className="flex-1 space-y-6">
          <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white">Dishes Ordered ({items?.length || 0})</h2>
              <Badge variant="info" className="uppercase font-semibold text-[10px]">Session Active</Badge>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {items && items.length > 0 ? (
                items.map((item, index) => {
                  const unitPrice = item.price || item.unitPrice || 0;
                  const itemTotal = unitPrice * item.quantity;
                  return (
                    <div key={index} className="flex justify-between items-start text-xs border-b border-zinc-950/40 pb-3 last:border-0 last:pb-0">
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {item.name || "Dish"} <span className="text-zinc-500 font-normal">x{item.quantity}</span>
                        </h4>
                        {item.addons && item.addons.length > 0 && (
                          <p className="text-[10px] text-zinc-500 pl-1.5 mt-0.5">
                            + {item.addons.map(a => a.name || "Addon").join(", ")}
                          </p>
                        )}
                      </div>
                      <span className="font-bold text-zinc-300">₹{itemTotal}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-zinc-500 text-center py-6 text-sm">No items ordered yet. Add items from the menu page!</p>
              )}
            </div>
          </Card>

          {/* Tips configurator */}
          {!cashRequested && (
            <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400">Add a Tip for Service</h3>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "No Tip", value: null },
                  { label: "5%", value: 5 },
                  { label: "10%", value: 10 },
                  { label: "15%", value: 15 }
                ].map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTipPct(opt.value)}
                    className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all ${
                      selectedTipPct === opt.value
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Or enter custom tip amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={customTip}
                  onChange={(e) => {
                    setSelectedTipPct(null);
                    setCustomTip(e.target.value);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </Card>
          )}
        </div>

        {/* Pricing details & payment */}
        <div className="w-full lg:w-90 shrink-0">
          <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-2xl space-y-5 sticky top-24">
            <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3">Bill Breakdown</h2>
            
            <div className="space-y-2.5 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-zinc-200">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST / Taxes (5%)</span>
                <span className="text-zinc-200">₹{tax}</span>
              </div>
              <div className="flex justify-between">
                <span>Tips added</span>
                <span className="text-emerald-400">+₹{calculatedTip}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-850 pt-3 text-sm font-extrabold text-white">
                <span>Total Amount</span>
                <span className="text-indigo-400">₹{finalTotal}</span>
              </div>
            </div>

            {/* Payment state */}
            {cashRequested ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                  <HiOutlineInboxArrowDown className="w-4 h-4 animate-bounce" />
                  <span>Cash Payment Pending</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  We have notified the waiter to collect cash from table {table?.tableNumber}. Please wait at your table. Thank you!
                </p>
              </div>
            ) : selectedMethod ? (
              <div className="space-y-4 pt-2 border-t border-zinc-800">
                {/* Method details */}
                {selectedMethod === "UPI" || selectedMethod === "PHONEPE" ? (
                  <div className="flex flex-col items-center p-4 bg-white rounded-xl space-y-3">
                    <span className="text-xs font-extrabold text-zinc-950 uppercase tracking-wide">
                      Scan to Pay ₹{finalTotal}
                    </span>
                    <QRCodeSVG
                      value={`upi://pay?pa=mockmerchant@upi&pn=UrbanPiperMock&am=${finalTotal}&cu=INR`}
                      size={144}
                      level="Q"
                      includeMargin={true}
                    />
                    <div className="w-full space-y-2">
                      <Button
                        variant="primary"
                        onClick={() => handlePay()}
                        disabled={processing}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500"
                      >
                        {processing ? "Confirming..." : "Simulate Success"}
                      </Button>
                      <button
                        onClick={() => setSelectedMethod(null)}
                        className="w-full text-zinc-500 hover:text-zinc-700 text-[10px] font-bold text-center uppercase tracking-wide transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : selectedMethod === "CARD" ? (
                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Mock Card Number</span>
                      <input
                        type="text"
                        placeholder="4111 2222 3333 4444"
                        disabled
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-zinc-300"
                      />
                    </div>
                    <div className="w-full flex gap-2">
                      <Button
                        variant="primary"
                        onClick={() => handlePay()}
                        disabled={processing}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-600"
                      >
                        {processing ? "Processing..." : "Tap / Pay Now"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedMethod(null)}
                        className="px-3 text-xs"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Choose Payment Option</span>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => setSelectedMethod("UPI")}
                    className="w-full flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-900/30 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-indigo-400 group-hover:scale-110 transition-all text-base"><HiOutlineCurrencyRupee /></span>
                      <span className="text-xs font-bold text-white">UPI (GPay, Paytm, etc)</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-md">Instantly</span>
                  </button>

                  <button
                    onClick={() => setSelectedMethod("PHONEPE")}
                    className="w-full flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-900/30 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-purple-400 group-hover:scale-110 transition-all text-base">🟣</span>
                      <span className="text-xs font-bold text-white">PhonePe Wallet</span>
                    </div>
                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider bg-purple-500/10 px-2 py-0.5 rounded-md">Instantly</span>
                  </button>

                  <button
                    onClick={() => setSelectedMethod("CARD")}
                    className="w-full flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-900/30 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-blue-400 group-hover:scale-110 transition-all text-base"><HiOutlineCreditCard /></span>
                      <span className="text-xs font-bold text-white">Credit / Debit Card</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider bg-zinc-800 px-2 py-0.5 rounded-md">Mock Pin</span>
                  </button>

                  <button
                    onClick={() => handlePay("CASH")}
                    disabled={processing}
                    className="w-full flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900/30 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 group-hover:scale-110 transition-all text-base">💵</span>
                      <span className="text-xs font-bold text-white">Pay by Cash</span>
                    </div>
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-md">Waiter Alert</span>
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
