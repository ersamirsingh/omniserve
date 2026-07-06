import { useState, useEffect } from 'react';
import { getTablesApi, rotateTableQrTokenApi } from '../../../api/models/operations.api';
import { useToast } from '../../../components/ui/Toast';
import { useSocket } from '../../../context/SocketContext';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { QRCodeSVG } from 'qrcode.react';
import {
  HiOutlineQrCode,
  HiOutlineClipboardDocument,
  HiOutlineArrowDownTray,
  HiOutlinePrinter,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle
} from 'react-icons/hi2';

export default function QRCodesCenter() {
  const { lastMessage } = useSocket();
  const { addToast } = useToast();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rotatingTableId, setRotatingTableId] = useState(null);

  const fetchTables = async () => {
    try {
      const res = await getTablesApi();
      setTables(res.data?.data?.tables || []);
    } catch {
      addToast('Failed to load dining tables', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Handle table updates from socket
  useEffect(() => {
    if (!lastMessage) return;
    const { event } = lastMessage;
    const refreshEvents = ['TABLE_STATUS_CHANGED', 'TABLE_OCCUPIED', 'TABLE_AVAILABLE', 'SESSION_CLOSED'];
    if (refreshEvents.includes(event)) {
      fetchTables();
    }
  }, [lastMessage]);

  const handleCopyLink = (token) => {
    const url = `${window.location.origin}/public/qr/${token}`;
    navigator.clipboard.writeText(url);
    addToast('QR Code URL copied to clipboard', 'success');
  };

  const handleDownloadPng = (tableNumber, token, tableId) => {
    const svg = document.getElementById(`svg-${tableId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `Table-${tableNumber}-QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      addToast(`Table ${tableNumber} QR downloaded`, 'success');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePrintSingle = (tableNumber, tableId) => {
    const parentSvg = document.getElementById(`svg-${tableId}`);
    if (!parentSvg) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Print Table ${tableNumber} QR</title></head>
        <body style="margin: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; text-align: center;">
          <div style="border: 2px dashed #ccc; padding: 40px; border-radius: 20px; width: 280px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h1 style="margin: 0 0 10px 0; font-size: 28px; color: #1e1b4b;">TABLE ${tableNumber}</h1>
            <div style="font-size: 14px; color: #4f46e5; margin-bottom: 25px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
              Scan QR to order food & pay bill
            </div>
            <div id="print-qr-target" style="display: inline-block;"></div>
          </div>
          <script>
            window.onload = function() {
              const svgHtml = window.opener.document.getElementById('svg-${tableId}').outerHTML;
              const target = document.getElementById('print-qr-target');
              target.innerHTML = svgHtml;
              const svg = target.querySelector('svg');
              svg.setAttribute('width', '240');
              svg.setAttribute('height', '240');
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAll = () => {
    if (tables.length === 0) return;

    const printWindow = window.open('', '_blank');
    const tableCardsHTML = tables.map(table => `
      <div style="border: 2px dashed #bbb; padding: 25px; text-align: center; font-family: sans-serif; display: inline-block; margin: 15px; width: 200px; border-radius: 12px; box-sizing: border-box; background: #fff;">
        <h2 style="margin: 0 0 6px 0; font-size: 20px; color: #1e1b4b;">TABLE ${table.tableNumber}</h2>
        <div style="font-size: 11px; color: #666; margin-bottom: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Scan to Order & Pay</div>
        <div id="qr-all-target-${table._id}" style="margin: 10px 0;"></div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print All Table QR Codes</title>
          <style>
            @media print {
              body { background: white; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body style="padding: 20px; background: #f8fafc; font-family: sans-serif; text-align: center;">
          <h1 style="color: #1e1b4b; margin-bottom: 5px;">Restaurant Table QRs</h1>
          <p style="color: #64748b; font-size: 13px; margin-top: 0; margin-bottom: 25px;">Print, cut out along dotted borders, and mount on tables.</p>
          <div style="display: flex; flex-wrap: wrap; justify-content: center; max-width: 1000px; margin: 0 auto;">
            ${tableCardsHTML}
          </div>
          <script>
            window.onload = function() {
              ${tables.map(t => `
                const parentSvg = window.opener.document.getElementById('svg-${t._id}');
                if (parentSvg) {
                  const targetDiv = document.getElementById('qr-all-target-${t._id}');
                  targetDiv.innerHTML = parentSvg.outerHTML;
                  const svg = targetDiv.querySelector('svg');
                  svg.setAttribute('width', '160');
                  svg.setAttribute('height', '160');
                }
              `).join('')}
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleRotateToken = async (tableId, tableNumber) => {
    if (rotatingTableId) return;

    if (!window.confirm(`Are you sure you want to rotate the QR code for Table ${tableNumber}? This will detach any active sessions immediately.`)) {
      return;
    }

    setRotatingTableId(tableId);
    try {
      await rotateTableQrTokenApi(tableId);
      addToast(`QR Token for Table ${tableNumber} rotated successfully`, 'success');
      fetchTables();
    } catch (err) {
      addToast(err.response?.data?.message || `Failed to rotate Table ${tableNumber} QR`, 'error');
    } finally {
      setRotatingTableId(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-950 p-4 border border-border-base dark:border-zinc-900 rounded-xl">
        <div>
          <h3 className="text-sm font-bold text-on-background">Batch Table QR Codes</h3>
          <p className="text-[11px] text-on-surface-variant dark:text-zinc-500">Generate, print, download, or rotate secure diner QR codes for all tables.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={handlePrintAll} className="flex items-center gap-1.5 text-xs">
            <HiOutlinePrinter className="w-4 h-4" /> Print All Table QR Sheet
          </Button>
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map((table) => {
          const qrUrl = `${window.location.origin}/public/qr/${table.qrToken}`;
          const isOccupied = !!table.activeSessionId;

          return (
            <Card key={table._id} className="bg-white dark:bg-zinc-950 border-border-base dark:border-zinc-900 p-5 rounded-xl flex flex-col justify-between relative overflow-hidden group">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-[15px] text-on-background">Table {table.tableNumber}</h4>
                  <span className="text-[11px] text-on-surface-variant dark:text-zinc-500 block">{table.seatCount} Seats ({table.layout?.shape || 'SQUARE'})</span>
                </div>
                <Badge variant={isOccupied ? 'error' : 'success'} size="sm" className="uppercase font-semibold text-[9px] tracking-wide">
                  {isOccupied ? 'Occupied' : 'Available'}
                </Badge>
              </div>

              {/* QR Code Container */}
              <div className="my-3 flex flex-col items-center p-4 bg-white rounded-lg border border-border-base dark:border-zinc-900/50 shadow-inner">
                <QRCodeSVG
                  id={`svg-${table._id}`}
                  value={qrUrl}
                  size={120}
                  level="H"
                  includeMargin={true}
                />
                <span className="text-[9px] text-zinc-400 font-mono tracking-tighter truncate max-w-full mt-2 select-all">
                  {table.qrToken}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => handleCopyLink(table.qrToken)}
                    title="Copy QR URL"
                    className="p-2 border border-border-base dark:border-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-on-surface-variant dark:text-zinc-400 flex justify-center items-center transition cursor-pointer"
                  >
                    <HiOutlineClipboardDocument className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDownloadPng(table.tableNumber, table.qrToken, table._id)}
                    title="Download PNG"
                    className="p-2 border border-border-base dark:border-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-on-surface-variant dark:text-zinc-400 flex justify-center items-center transition cursor-pointer"
                  >
                    <HiOutlineArrowDownTray className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handlePrintSingle(table.tableNumber, table._id)}
                    title="Print QR"
                    className="p-2 border border-border-base dark:border-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-on-surface-variant dark:text-zinc-400 flex justify-center items-center transition cursor-pointer"
                  >
                    <HiOutlinePrinter className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleRotateToken(table._id, table.tableNumber)}
                  disabled={rotatingTableId === table._id || isOccupied}
                  className={`w-full py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    isOccupied
                      ? 'border-zinc-800 text-zinc-600 bg-zinc-950 cursor-not-allowed'
                      : 'border-zinc-800 hover:border-red-500/30 hover:text-red-500 text-on-surface-variant dark:text-zinc-400 dark:hover:bg-red-500/5'
                  }`}
                  title={isOccupied ? 'Cannot rotate token while occupied' : 'Rotate QR Token'}
                >
                  <HiOutlineArrowPath className={`w-3.5 h-3.5 ${rotatingTableId === table._id ? 'animate-spin' : ''}`} />
                  <span>Rotate QR Token</span>
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
