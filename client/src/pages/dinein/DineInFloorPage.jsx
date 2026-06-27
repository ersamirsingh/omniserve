import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import DineInPageShell from './DineInPageShell';
import { useDineInScope } from './useDineInScope';
import {
  createDineInFloorApi,
  createDineInSectionApi,
  createDineInTableApi,
  extractApiData,
  listDineInFloorMapApi,
  lockDineInTableApi,
  moveDineInTableApi,
  releaseDineInTableApi,
  unlockDineInTableApi,
  updateDineInTableStatusApi,
} from '../../api/models/dinein.api';
import { SECTION_TYPES, TABLE_SHAPES, TABLE_STATUSES } from './dinein.constants';
import { statusBadge, tableStatusStyle } from './dinein.utils';

const INITIAL_FLOOR_FORM = { name: '', floorNumber: 0, description: '' };
const INITIAL_SECTION_FORM = { floorId: '', name: '', type: 'INDOOR', description: '', capacity: '', displayOrder: 0 };
const INITIAL_TABLE_FORM = {
  floorId: '',
  sectionId: '',
  tableNumber: '',
  displayName: '',
  capacity: 4,
  minCapacity: 1,
  shape: 'SQUARE',
  position: { x: 0, y: 0, width: 96, height: 96, rotation: 0 },
  tags: '',
};

export default function DineInFloorPage() {
  const scopeState = useDineInScope();
  const { scope, isReady } = scopeState;
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [floorMap, setFloorMap] = useState({ floors: [], sections: [], tables: [] });
  const [selectedTableId, setSelectedTableId] = useState('');
  const [statusDraft, setStatusDraft] = useState('AVAILABLE');
  const [modals, setModals] = useState({ floor: false, section: false, table: false });
  const [floorForm, setFloorForm] = useState(INITIAL_FLOOR_FORM);
  const [sectionForm, setSectionForm] = useState(INITIAL_SECTION_FORM);
  const [tableForm, setTableForm] = useState(INITIAL_TABLE_FORM);

  const loadFloorMap = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const response = await listDineInFloorMapApi(scope);
      const data = extractApiData(response) || { floors: [], sections: [], tables: [] };
      setFloorMap(data);
      if (!selectedTableId && data.tables?.length) {
        setSelectedTableId(data.tables[0]._id || data.tables[0].id);
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load floor map', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, isReady, scope, selectedTableId]);

  useEffect(() => {
    void loadFloorMap();
  }, [loadFloorMap]);

  const selectedTable = useMemo(
    () => floorMap.tables.find((table) => (table._id || table.id) === selectedTableId) || null,
    [floorMap.tables, selectedTableId]
  );

  useEffect(() => {
    if (selectedTable?.status) {
      setStatusDraft(selectedTable.status);
    }
  }, [selectedTable]);

  const sectionsByFloor = useMemo(
    () =>
      floorMap.floors.map((floor) => ({
        ...floor,
        sections: floorMap.sections.filter((section) => String(section.floorId) === String(floor._id || floor.id)),
      })),
    [floorMap]
  );

  const handleCreateFloor = async (event) => {
    event.preventDefault();
    try {
      await createDineInFloorApi(scope, { ...floorForm, floorNumber: Number(floorForm.floorNumber) });
      addToast('Floor created', 'success');
      setFloorForm(INITIAL_FLOOR_FORM);
      setModals((current) => ({ ...current, floor: false }));
      await loadFloorMap();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create floor', 'error');
    }
  };

  const handleCreateSection = async (event) => {
    event.preventDefault();
    try {
      await createDineInSectionApi(scope, {
        ...sectionForm,
        capacity: sectionForm.capacity ? Number(sectionForm.capacity) : undefined,
        displayOrder: Number(sectionForm.displayOrder),
      });
      addToast('Section created', 'success');
      setSectionForm(INITIAL_SECTION_FORM);
      setModals((current) => ({ ...current, section: false }));
      await loadFloorMap();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create section', 'error');
    }
  };

  const handleCreateTable = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...tableForm,
        capacity: Number(tableForm.capacity),
        minCapacity: Number(tableForm.minCapacity),
        position: {
          x: Number(tableForm.position.x),
          y: Number(tableForm.position.y),
          width: Number(tableForm.position.width),
          height: Number(tableForm.position.height),
          rotation: Number(tableForm.position.rotation),
        },
        tags: tableForm.tags
          ? tableForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : [],
      };
      await createDineInTableApi(scope, payload);
      addToast('Table created', 'success');
      setTableForm(INITIAL_TABLE_FORM);
      setModals((current) => ({ ...current, table: false }));
      await loadFloorMap();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create table', 'error');
    }
  };

  const runTableAction = async (action) => {
    if (!selectedTable) return;

    try {
      if (action === 'status') {
        await updateDineInTableStatusApi(scope, selectedTable._id || selectedTable.id, { status: statusDraft });
      } else if (action === 'release') {
        await releaseDineInTableApi(scope, selectedTable._id || selectedTable.id);
      } else if (action === 'lock') {
        await lockDineInTableApi(scope, selectedTable._id || selectedTable.id, { reason: 'Managed from floor console' });
      } else if (action === 'unlock') {
        await unlockDineInTableApi(scope, selectedTable._id || selectedTable.id);
      } else if (action === 'move') {
        await moveDineInTableApi(scope, selectedTable._id || selectedTable.id, {
          floorId: selectedTable.floorId,
          sectionId: selectedTable.sectionId,
          position: {
            x: Number(selectedTable.position?.x || 0) + 20,
            y: Number(selectedTable.position?.y || 0) + 20,
            width: Number(selectedTable.position?.width || 96),
            height: Number(selectedTable.position?.height || 96),
            rotation: Number(selectedTable.position?.rotation || 0),
          },
        });
      }
      addToast('Table updated', 'success');
      await loadFloorMap();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update table', 'error');
    }
  };

  return (
    <DineInPageShell
      title="Floor"
      description="Manage floors, sections, and tables with live status controls for the dining room."
      scopeState={scopeState}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void loadFloorMap()} loading={loading}>Refresh</Button>
          <Button variant="secondary" onClick={() => setModals((current) => ({ ...current, floor: true }))}>New Floor</Button>
          <Button variant="secondary" onClick={() => setModals((current) => ({ ...current, section: true }))}>New Section</Button>
          <Button onClick={() => setModals((current) => ({ ...current, table: true }))}>New Table</Button>
        </div>
      }
    >
      <section className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-4">
          {sectionsByFloor.map((floor) => (
            <Card key={floor._id || floor.id} className="rounded-lg p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-on-surface dark:text-zinc-100">{floor.name}</h3>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                    Floor {floor.floorNumber} {floor.description ? `• ${floor.description}` : ''}
                  </p>
                </div>
                <div className="text-xs text-on-surface-variant dark:text-zinc-500 font-semibold uppercase tracking-wide">
                  {floor.sections.length} sections
                </div>
              </div>

              <div className="space-y-4">
                {floor.sections.map((section) => {
                  const sectionTables = floorMap.tables.filter(
                    (table) => String(table.sectionId) === String(section._id || section.id)
                  );

                  return (
                    <div key={section._id || section.id} className="rounded-lg border border-border-base dark:border-zinc-800 p-4">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="text-sm font-semibold text-on-surface dark:text-zinc-100">{section.name}</div>
                          <div className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                            {section.type} {section.capacity ? `• Capacity ${section.capacity}` : ''}
                          </div>
                        </div>
                        <div className="text-xs text-on-surface-variant dark:text-zinc-500 font-semibold uppercase">
                          {sectionTables.length} tables
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {sectionTables.map((table) => {
                          const tableId = table._id || table.id;
                          const isSelected = tableId === selectedTableId;

                          return (
                            <button
                              key={tableId}
                              type="button"
                              onClick={() => setSelectedTableId(tableId)}
                              className={`rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 ${isSelected ? 'ring-2 ring-primary' : 'border-border-base dark:border-zinc-800'}`}
                              style={tableStatusStyle(table.status)}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-bold text-on-surface dark:text-zinc-100">{table.displayName || table.tableNumber}</div>
                                  <div className="text-xs text-on-surface-variant dark:text-zinc-500 mt-1">
                                    {table.shape} • Cap {table.capacity}
                                  </div>
                                </div>
                                {statusBadge(table.status)}
                              </div>
                              <div className="mt-3 text-xs text-on-surface-variant dark:text-zinc-400">
                                Pos {table.position?.x || 0}, {table.position?.y || 0}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        <Card className="rounded-lg p-5">
          {selectedTable ? (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-on-surface dark:text-zinc-100">{selectedTable.displayName || selectedTable.tableNumber}</h3>
                  {statusBadge(selectedTable.status)}
                </div>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                  Shape {selectedTable.shape} • Capacity {selectedTable.capacity} • Min {selectedTable.minCapacity}
                </p>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div className="rounded-lg border border-border-base dark:border-zinc-800 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant dark:text-zinc-500">QR Token</div>
                  <div className="mt-2 text-xs font-mono break-all text-on-surface dark:text-zinc-200">{selectedTable.qrToken}</div>
                </div>
                <div className="rounded-lg border border-border-base dark:border-zinc-800 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant dark:text-zinc-500">Active Session</div>
                  <div className="mt-2 text-xs font-mono break-all text-on-surface dark:text-zinc-200">{selectedTable.activeSessionId || '—'}</div>
                </div>
              </div>

              <Select label="Next Status" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                {TABLE_STATUSES.map((status) => (
                  <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                ))}
              </Select>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => void runTableAction('status')}>Update Status</Button>
                <Button variant="secondary" onClick={() => void runTableAction('move')}>Nudge Position</Button>
                <Button variant="secondary" onClick={() => void runTableAction('release')}>Release Table</Button>
                {selectedTable.status === 'BLOCKED' ? (
                  <Button variant="secondary" onClick={() => void runTableAction('unlock')}>Unlock Table</Button>
                ) : (
                  <Button variant="secondary" onClick={() => void runTableAction('lock')}>Lock Table</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-on-surface-variant dark:text-zinc-400">Select a table to manage its state.</div>
          )}
        </Card>
      </section>

      <Modal isOpen={modals.floor} onClose={() => setModals((current) => ({ ...current, floor: false }))} title="Create Floor">
        <form className="space-y-4" onSubmit={handleCreateFloor}>
          <Input label="Name" value={floorForm.name} onChange={(event) => setFloorForm((current) => ({ ...current, name: event.target.value }))} required />
          <Input label="Floor Number" type="number" value={floorForm.floorNumber} onChange={(event) => setFloorForm((current) => ({ ...current, floorNumber: event.target.value }))} required />
          <Input label="Description" value={floorForm.description} onChange={(event) => setFloorForm((current) => ({ ...current, description: event.target.value }))} />
          <Button type="submit">Create Floor</Button>
        </form>
      </Modal>

      <Modal isOpen={modals.section} onClose={() => setModals((current) => ({ ...current, section: false }))} title="Create Section">
        <form className="space-y-4" onSubmit={handleCreateSection}>
          <Select label="Floor" value={sectionForm.floorId} onChange={(event) => setSectionForm((current) => ({ ...current, floorId: event.target.value }))} required>
            <option value="">Select floor</option>
            {floorMap.floors.map((floor) => (
              <option key={floor._id || floor.id} value={floor._id || floor.id}>{floor.name}</option>
            ))}
          </Select>
          <Input label="Name" value={sectionForm.name} onChange={(event) => setSectionForm((current) => ({ ...current, name: event.target.value }))} required />
          <Select label="Type" value={sectionForm.type} onChange={(event) => setSectionForm((current) => ({ ...current, type: event.target.value }))}>
            {SECTION_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
          </Select>
          <Input label="Capacity" type="number" value={sectionForm.capacity} onChange={(event) => setSectionForm((current) => ({ ...current, capacity: event.target.value }))} />
          <Button type="submit">Create Section</Button>
        </form>
      </Modal>

      <Modal isOpen={modals.table} onClose={() => setModals((current) => ({ ...current, table: false }))} title="Create Table" size="lg">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateTable}>
          <Select label="Floor" value={tableForm.floorId} onChange={(event) => setTableForm((current) => ({ ...current, floorId: event.target.value, sectionId: '' }))} required>
            <option value="">Select floor</option>
            {floorMap.floors.map((floor) => (
              <option key={floor._id || floor.id} value={floor._id || floor.id}>{floor.name}</option>
            ))}
          </Select>
          <Select label="Section" value={tableForm.sectionId} onChange={(event) => setTableForm((current) => ({ ...current, sectionId: event.target.value }))} required>
            <option value="">Select section</option>
            {floorMap.sections
              .filter((section) => String(section.floorId) === String(tableForm.floorId))
              .map((section) => (
                <option key={section._id || section.id} value={section._id || section.id}>{section.name}</option>
              ))}
          </Select>
          <Input label="Table Number" value={tableForm.tableNumber} onChange={(event) => setTableForm((current) => ({ ...current, tableNumber: event.target.value }))} required />
          <Input label="Display Name" value={tableForm.displayName} onChange={(event) => setTableForm((current) => ({ ...current, displayName: event.target.value }))} />
          <Input label="Capacity" type="number" value={tableForm.capacity} onChange={(event) => setTableForm((current) => ({ ...current, capacity: event.target.value }))} required />
          <Input label="Min Capacity" type="number" value={tableForm.minCapacity} onChange={(event) => setTableForm((current) => ({ ...current, minCapacity: event.target.value }))} required />
          <Select label="Shape" value={tableForm.shape} onChange={(event) => setTableForm((current) => ({ ...current, shape: event.target.value }))}>
            {TABLE_SHAPES.map((shape) => <option key={shape} value={shape}>{shape}</option>)}
          </Select>
          <Input label="Tags" value={tableForm.tags} onChange={(event) => setTableForm((current) => ({ ...current, tags: event.target.value }))} />
          <Input label="X Position" type="number" value={tableForm.position.x} onChange={(event) => setTableForm((current) => ({ ...current, position: { ...current.position, x: event.target.value } }))} />
          <Input label="Y Position" type="number" value={tableForm.position.y} onChange={(event) => setTableForm((current) => ({ ...current, position: { ...current.position, y: event.target.value } }))} />
          <Input label="Width" type="number" value={tableForm.position.width} onChange={(event) => setTableForm((current) => ({ ...current, position: { ...current.position, width: event.target.value } }))} />
          <Input label="Height" type="number" value={tableForm.position.height} onChange={(event) => setTableForm((current) => ({ ...current, position: { ...current.position, height: event.target.value } }))} />
          <div className="md:col-span-2">
            <Button type="submit">Create Table</Button>
          </div>
        </form>
      </Modal>
    </DineInPageShell>
  );
}
