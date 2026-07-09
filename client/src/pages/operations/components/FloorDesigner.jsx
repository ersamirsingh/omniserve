import { useState, useEffect, useCallback } from 'react';
import { getTablesApi, getDiningAreasApi, updateTablesLayoutApi, createDiningAreaApi, createTableApi, archiveDiningAreaApi, archiveTableApi, updateTableApi } from '../../../api/models/operations.api';
import { useToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Modal from '../../../components/ui/Modal';
import { HiOutlineSquares2X2, HiOutlineDevicePhoneMobile, HiArrowPath, HiPlus, HiTrash, HiOutlineQrCode, HiOutlineClipboardDocument } from 'react-icons/hi2';
import { QRCodeSVG } from 'qrcode.react';

export default function FloorDesigner() {
  const { addToast } = useToast();
  const [diningAreas, setDiningAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Drag-and-drop workspace states
  const [selectedTable, setSelectedTable] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggingTable, setDraggingTable] = useState(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // CRUD Modals state
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [showTableModal, setShowTableModal] = useState(false);
  const [newTableData, setNewTableData] = useState({ tableNumber: '', seatCount: 4 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline edit states for table properties
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editSeatCount, setEditSeatCount] = useState(4);
  const [isSavingProps, setIsSavingProps] = useState(false);

  const handleAddArea = async () => {
    if (!newAreaName.trim()) return addToast('Name is required', 'error');
    setIsSubmitting(true);
    try {
      const res = await createDiningAreaApi({ name: newAreaName.trim() });
      addToast('Floor created successfully', 'success');
      setShowAreaModal(false);
      setNewAreaName('');
      await fetchData();
      if (res.data?.data?._id) setSelectedAreaId(res.data.data._id);
    } catch (e) {
      addToast(e.response?.data?.message || 'Failed to create floor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTable = async () => {
    if (!newTableData.tableNumber) return addToast('Table number is required', 'error');
    setIsSubmitting(true);
    try {
      await createTableApi({
        tableNumber: newTableData.tableNumber.trim(),
        seatCount: Number(newTableData.seatCount),
        diningAreaId: selectedAreaId,
        layout: { x: 50, y: 50, width: 80, height: 80, rotation: 0, shape: 'square', zIndex: 10, labelPosition: 'CENTER' }
      });
      addToast('Table created successfully', 'success');
      setShowTableModal(false);
      setNewTableData({ tableNumber: '', seatCount: 4 });
      fetchData();
    } catch (e) {
      addToast(e.response?.data?.message || 'Failed to create table', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteArea = async () => {
    if (!window.confirm('Are you sure you want to archive this floor?')) return;
    try {
      await archiveDiningAreaApi(selectedAreaId);
      addToast('Floor archived', 'success');
      setSelectedAreaId('');
      fetchData();
    } catch (e) {
      addToast(e.response?.data?.message || 'Failed to archive floor', 'error');
    }
  };

  const handleDeleteTable = async () => {
    if (!selectedTable || !window.confirm('Are you sure you want to archive this table?')) return;
    try {
      await archiveTableApi(selectedTable._id);
      addToast('Table archived', 'success');
      setSelectedTable(null);
      fetchData();
    } catch (e) {
      addToast(e.response?.data?.message || 'Failed to archive table', 'error');
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [areasRes, tablesRes] = await Promise.all([
        getDiningAreasApi(),
        getTablesApi()
      ]);
      const areas = areasRes.data?.data?.areas || [];
      setDiningAreas(areas);
      setTables(tablesRes.data?.data?.tables || []);

      if (areas.length > 0 && !selectedAreaId) {
        setSelectedAreaId(areas[0]._id || areas[0].id);
      }
    } catch {
      addToast('Failed to load layouts', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedAreaId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentAreaTables = tables.filter(t => t.diningAreaId?.toString() === selectedAreaId || t.diningAreaId?._id?.toString() === selectedAreaId);

  // Mouse handlers for layout dragging
  const handleDragStart = (e, table) => {
    e.preventDefault();
    setDraggingTable(table);
    setHasDragged(false);
    setDragStartPos({ x: e.clientX, y: e.clientY });

    const layout = table.layout || { x: 50, y: 50, width: 80, height: 80, rotation: 0, shape: 'square' };
    setDragOffset({
      x: e.clientX - layout.x,
      y: e.clientY - layout.y
    });
  };

  const handleDragMove = (e) => {
    if (!draggingTable) return;

    // Check distance threshold to set hasDragged
    const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
    if (dist > 3) {
      setHasDragged(true);
    }

    const parentBounds = e.currentTarget.getBoundingClientRect();
    const computedX = Math.max(0, Math.min(e.clientX - dragOffset.x, parentBounds.width - (draggingTable.layout?.width || 80)));
    const computedY = Math.max(0, Math.min(e.clientY - dragOffset.y, parentBounds.height - (draggingTable.layout?.height || 80)));

    setTables(prev => prev.map(t => {
      if (t._id === draggingTable._id) {
        return {
          ...t,
          layout: {
            ...(t.layout || { width: 80, height: 80, rotation: 0, shape: 'square' }),
            x: Math.round(computedX),
            y: Math.round(computedY)
          }
        };
      }
      return t;
    }));
  };

  const handleDragEnd = () => {
    if (!draggingTable) return;

    if (!hasDragged) {
      // Toggle select state on click
      setSelectedTable(prev => (prev?._id === draggingTable._id ? null : draggingTable));
    } else {
      // Retain active selection on drag end
      setSelectedTable(draggingTable);
    }

    setDraggingTable(null);
  };

  // Edit specific table properties in designer panel
  const updateTableProperty = (tableId, property, value) => {
    setTables(prev => prev.map(t => {
      if (t._id === tableId) {
        return {
          ...t,
          layout: {
            ...(t.layout || { x: 50, y: 50, width: 80, height: 80, rotation: 0, shape: 'square' }),
            [property]: value
          }
        };
      }
      return t;
    }));
  };

  // Batch save layouts to backend
  const saveLayouts = async () => {
    setIsSaving(true);
    try {
      const payload = currentAreaTables.map(t => ({
        tableId: t._id,
        layout: t.layout || { x: 50, y: 50, width: 80, height: 80, rotation: 0, shape: 'square', zIndex: 10, labelPosition: 'CENTER' }
      }));
      await updateTablesLayoutApi({ tables: payload });
      addToast('Floor layout saved successfully', 'success');
      fetchData();
    } catch {
      addToast('Failed to save layout changes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  const activeEditTable = tables.find(t => t._id === selectedTable?._id);

  // Sync edit fields when selected table changes
  useEffect(() => {
    if (activeEditTable) {
      setEditTableNumber(activeEditTable.tableNumber || '');
      setEditSeatCount(activeEditTable.seatCount || 4);
    }
  }, [activeEditTable?._id]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
      {/* Designer Workspace controls */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="flex gap-2 overflow-x-auto items-center">
            {diningAreas.map(area => (
              <button
                key={area._id || area.id}
                onClick={() => setSelectedAreaId(area._id || area.id)}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                  selectedAreaId === (area._id || area.id)
                    ? 'bg-primary text-white dark:bg-primary-fixed dark:text-zinc-950 shadow-md'
                    : 'bg-white text-on-surface-variant border border-border-base hover:bg-surface-container-low dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-900'
                }`}
              >
                {area.name}
              </button>
            ))}
            <button
              onClick={() => setShowAreaModal(true)}
              className="p-2 border border-dashed border-primary/50 text-primary hover:bg-primary/5 rounded-lg flex items-center justify-center transition-colors"
              title="Add Floor"
            >
              <HiPlus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {selectedAreaId && (
              <Button size="sm" variant="danger" onClick={handleDeleteArea} className="!bg-red-500/10 !text-red-500 border-none hover:!bg-red-500/20">
                <HiTrash className="w-4 h-4" />
              </Button>
            )}
            {selectedAreaId && (
              <Button size="sm" variant="outline" onClick={() => setShowTableModal(true)}>
                <HiPlus className="w-4 h-4 mr-1" /> Add Table
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={saveLayouts} isLoading={isSaving}>
              Save Layout
            </Button>
          </div>
        </div>

        {/* Drag-and-drop board */}
        <div
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          className="relative w-full h-[600px] bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl overflow-hidden shadow-inner cursor-crosshair select-none"
        >
          {/* Engineering blueprint grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] [background-size:25px_25px] opacity-70" />

          {currentAreaTables.map((table) => {
            const layout = table.layout || { x: 50, y: 50, width: 80, height: 80, rotation: 0, shape: 'square', zIndex: 10, labelPosition: 'CENTER' };
            const isRound = layout.shape === 'round';
            const isSelected = selectedTable?._id === table._id;

            return (
              <div
                key={table._id}
                onMouseDown={(e) => handleDragStart(e, table)}
                style={{
                  position: 'absolute',
                  left: `${layout.x}px`,
                  top: `${layout.y}px`,
                  width: `${layout.width}px`,
                  height: `${layout.height}px`,
                  transform: `rotate(${layout.rotation || 0}deg)`,
                  zIndex: layout.zIndex || 10,
                }}
                className={`flex flex-col items-center justify-center font-bold text-[12px] shadow-md border ${
                  isSelected ? 'border-primary ring-2 ring-primary/45' : 'border-black/10'
                } ${isRound ? 'rounded-full' : 'rounded-lg'} ${
                  isSelected ? 'bg-primary/10 text-primary dark:text-primary-fixed-dim' : 'bg-surface-container dark:bg-zinc-900 text-on-surface'
                }`}
              >
                <span>{table.tableNumber}</span>
                <span className="text-[9px] opacity-60 font-normal">({layout.x}, {layout.y})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor Properties Panel Sidebar */}
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900 space-y-6 h-fit">
        <div>
          <h3 className="text-[14px] font-bold text-on-background uppercase tracking-wider mb-2">Properties</h3>
          <p className="text-[11px] text-on-surface-variant dark:text-zinc-550">
            Drag tables on the grid to change coordinates. Select table to edit shape, rotation, or sizing.
          </p>
        </div>

        {activeEditTable ? (
          <div className="space-y-4">
            {/* Table Name + Seat Count editing */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Table Name / Number</label>
                <input
                  type="text"
                  value={editTableNumber}
                  onChange={(e) => setEditTableNumber(e.target.value)}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs font-semibold text-on-surface dark:text-zinc-200"
                  placeholder="e.g. T1, Bar-1"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Seat Count</label>
                <input
                  type="number"
                  min="1"
                  value={editSeatCount}
                  onChange={(e) => setEditSeatCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs"
                />
              </div>
              {(editTableNumber !== activeEditTable.tableNumber || editSeatCount !== (activeEditTable.seatCount || 4)) && (
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  isLoading={isSavingProps}
                  onClick={async () => {
                    if (!editTableNumber.trim()) return addToast('Table name is required', 'error');
                    setIsSavingProps(true);
                    try {
                      await updateTableApi(activeEditTable._id, {
                        tableNumber: editTableNumber.trim(),
                        seatCount: editSeatCount,
                      });
                      addToast('Table updated', 'success');
                      fetchData();
                    } catch (e) {
                      addToast(e.response?.data?.message || 'Failed to update table', 'error');
                    } finally {
                      setIsSavingProps(false);
                    }
                  }}
                >
                  Save Name & Seats
                </Button>
              )}
            </div>

            <div className="bg-surface-container-low dark:bg-zinc-900/40 p-3.5 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span>Coordinates:</span>
                <span className="font-semibold">{activeEditTable.layout?.x || 50}px, {activeEditTable.layout?.y || 50}px</span>
              </div>
            </div>

            {/* Shape selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Table Shape</label>
              <div className="grid grid-cols-3 gap-1">
                {['square', 'round', 'rectangle'].map(shape => (
                  <button
                    key={shape}
                    onClick={() => updateTableProperty(activeEditTable._id, 'shape', shape)}
                    className={`p-2 border rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${
                      activeEditTable.layout?.shape === shape
                        ? 'bg-primary text-white border-primary dark:bg-primary-fixed dark:text-zinc-950'
                        : 'border-border-base text-on-surface-variant hover:bg-surface-container-low dark:border-zinc-900'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizing inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Width (px)</label>
                <input
                  type="number"
                  value={activeEditTable.layout?.width || 80}
                  onChange={(e) => updateTableProperty(activeEditTable._id, 'width', parseInt(e.target.value, 10))}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Height (px)</label>
                <input
                  type="number"
                  value={activeEditTable.layout?.height || 80}
                  onChange={(e) => updateTableProperty(activeEditTable._id, 'height', parseInt(e.target.value, 10))}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs"
                />
              </div>
            </div>

            {/* Rotation slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">
                <span>Rotation</span>
                <span>{activeEditTable.layout?.rotation || 0}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={activeEditTable.layout?.rotation || 0}
                onChange={(e) => updateTableProperty(activeEditTable._id, 'rotation', parseInt(e.target.value, 10))}
                className="w-full h-1 bg-surface-container rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Label positioning selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Label Placement</label>
              <select
                value={activeEditTable.layout?.labelPosition || 'CENTER'}
                onChange={(e) => updateTableProperty(activeEditTable._id, 'labelPosition', e.target.value)}
                className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs text-on-background"
              >
                {['TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'CENTER'].map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            {/* Z-Index editor */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Z-Index Elevation</label>
              <input
                type="number"
                value={activeEditTable.layout?.zIndex || 10}
                onChange={(e) => updateTableProperty(activeEditTable._id, 'zIndex', parseInt(e.target.value, 10))}
                className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs"
              />
            </div>

            {/* QR Code Section */}
            {activeEditTable.qrToken && (
              <div className="pt-4 border-t border-border-base dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">
                  <HiOutlineQrCode className="w-4 h-4" />
                  <span>Table QR Code</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-border-base dark:border-zinc-800">
                  <QRCodeSVG 
                    value={`${window.location.origin}/qr/${activeEditTable.qrToken}`} 
                    size={128} 
                    level="H" 
                    includeMargin={true}
                  />
                  <div className="mt-3 flex gap-2 w-full">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-[10px]"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/qr/${activeEditTable.qrToken}`);
                        addToast('URL copied to clipboard', 'success');
                      }}
                    >
                      <HiOutlineClipboardDocument className="w-3 h-3 mr-1" /> Copy URL
                    </Button>
                    <Button 
                      size="sm" 
                      variant="primary" 
                      className="flex-1 text-[10px]"
                      onClick={() => {
                        const svg = document.querySelector('.bg-white svg');
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement("canvas");
                          const ctx = canvas.getContext("2d");
                          const img = new Image();
                          img.onload = () => {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0);
                            const pngFile = canvas.toDataURL("image/png");
                            const downloadLink = document.createElement("a");
                            downloadLink.download = `Table-${activeEditTable.tableNumber}-QR.png`;
                            downloadLink.href = `${pngFile}`;
                            downloadLink.click();
                          };
                          img.src = "data:image/svg+xml;base64," + btoa(svgData);
                        }
                      }}
                    >
                      Print/Save
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border-base dark:border-zinc-800">
              <Button size="sm" variant="danger" className="w-full" onClick={handleDeleteTable}>
                <HiTrash className="w-4 h-4 mr-2" /> Archive Table
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant dark:text-zinc-550 border border-dashed border-border-base dark:border-zinc-800 rounded-xl text-xs text-center">
            <span>No table selected.</span>
            <span className="text-[10px] mt-0.5">Click a table on the blueprint to start editing properties.</span>
          </div>
        )}
      </div>

      {/* Add Floor Modal */}
      <Modal isOpen={showAreaModal} onClose={() => setShowAreaModal(false)} title="Add New Floor">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Floor Name</label>
            <input 
              type="text" 
              value={newAreaName} 
              onChange={e => setNewAreaName(e.target.value)} 
              className="w-full border rounded-lg p-2 bg-surface-container dark:bg-zinc-900 border-border-base dark:border-zinc-800"
              placeholder="e.g. Ground Floor, Patio"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowAreaModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddArea} isLoading={isSubmitting}>Create Floor</Button>
          </div>
        </div>
      </Modal>

      {/* Add Table Modal */}
      <Modal isOpen={showTableModal} onClose={() => setShowTableModal(false)} title="Add New Table">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Table Number</label>
            <input 
              type="text" 
              value={newTableData.tableNumber} 
              onChange={e => setNewTableData({...newTableData, tableNumber: e.target.value})} 
              className="w-full border rounded-lg p-2 bg-surface-container dark:bg-zinc-900 border-border-base dark:border-zinc-800"
              placeholder="e.g. T1, Bar-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Seat Count</label>
            <input 
              type="number" 
              value={newTableData.seatCount} 
              onChange={e => setNewTableData({...newTableData, seatCount: e.target.value})} 
              className="w-full border rounded-lg p-2 bg-surface-container dark:bg-zinc-900 border-border-base dark:border-zinc-800"
              min="1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowTableModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddTable} isLoading={isSubmitting}>Create Table</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
