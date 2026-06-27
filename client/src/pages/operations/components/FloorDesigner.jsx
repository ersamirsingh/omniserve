import { useState, useEffect, useCallback } from 'react';
import { getTablesApi, getDiningAreasApi, updateTablesLayoutApi } from '../../../api/models/operations.api';
import { useToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import { HiOutlineSquares2X2, HiOutlineDevicePhoneMobile, HiArrowPath } from 'react-icons/hi2';

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
      {/* Designer Workspace controls */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="flex gap-2 overflow-x-auto">
            {diningAreas.map(area => (
              <button
                key={area._id || area.id}
                onClick={() => setSelectedAreaId(area._id || area.id)}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer transition-all ${
                  selectedAreaId === (area._id || area.id)
                    ? 'bg-primary text-white dark:bg-primary-fixed dark:text-zinc-950 shadow-md'
                    : 'bg-white text-on-surface-variant border border-border-base hover:bg-surface-container-low dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-900'
                }`}
              >
                {area.name}
              </button>
            ))}
          </div>
          <Button size="sm" variant="primary" onClick={saveLayouts} isLoading={isSaving}>
            Save Layout
          </Button>
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
            <div className="bg-surface-container-low dark:bg-zinc-900/40 p-3.5 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span>Selected Table:</span>
                <span className="font-bold text-primary dark:text-primary-fixed-dim">{activeEditTable.tableNumber}</span>
              </div>
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
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant dark:text-zinc-550 border border-dashed border-border-base dark:border-zinc-800 rounded-xl text-xs text-center">
            <span>No table selected.</span>
            <span className="text-[10px] mt-0.5">Click a table on the blueprint to start editing properties.</span>
          </div>
        )}
      </div>
    </div>
  );
}
