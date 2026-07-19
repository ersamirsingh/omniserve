import { useState, useEffect } from 'react';
import { 
  HiOutlineCircleStack, 
  HiOutlineGlobeAlt, 
  HiOutlineArrowPath,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineEye,
  HiOutlineCpuChip
} from 'react-icons/hi2';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { getSchemaGraphApi } from '../../api/models/systemAdmin.api';

const groupColors = {
  core: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', border: 'border-blue-500/30 dark:border-blue-500/50', text: 'text-blue-600 dark:text-blue-400', color: '#3b82f6' },
  menu: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-500/30 dark:border-amber-500/50', text: 'text-amber-600 dark:text-amber-400', color: '#f59e0b' },
  sales: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-emerald-500/30 dark:border-emerald-500/50', text: 'text-emerald-600 dark:text-emerald-400', color: '#10b981' },
  crm: { bg: 'bg-pink-500/10 dark:bg-pink-500/20', border: 'border-pink-500/30 dark:border-pink-500/50', text: 'text-pink-600 dark:text-pink-400', color: '#ec4899' },
  ops: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', border: 'border-purple-500/30 dark:border-purple-500/50', text: 'text-purple-600 dark:text-purple-400', color: '#a855f7' },
  support: { bg: 'bg-red-500/10 dark:bg-red-500/20', border: 'border-red-500/30 dark:border-red-500/50', text: 'text-red-600 dark:text-red-400', color: '#ef4444' },
  system: { bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', border: 'border-cyan-500/30 dark:border-cyan-500/50', text: 'text-cyan-600 dark:text-cyan-400', color: '#06b6d4' },
  finance: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', border: 'border-indigo-500/30 dark:border-indigo-500/50', text: 'text-indigo-600 dark:text-indigo-400', color: '#6366f1' },
};

// Preset positions in a circular grid for neat rendering
const getPresetPositions = (nodeId) => {
  const positions = {
    Tenant: { x: 300, y: 150 },
    User: { x: 150, y: 220 },
    Restaurant: { x: 450, y: 120 },
    Outlet: { x: 500, y: 240 },
    Category: { x: 650, y: 150 },
    MenuItem: { x: 680, y: 280 },
    Variant: { x: 780, y: 200 },
    Addon: { x: 780, y: 340 },
    Order: { x: 380, y: 360 },
    OrderItem: { x: 520, y: 400 },
    Payment: { x: 260, y: 440 },
    Customer: { x: 120, y: 360 },
    Table: { x: 480, y: 520 },
    Reservation: { x: 620, y: 480 },
    HelpRequest: { x: 80, y: 500 },
    AuditLog: { x: 80, y: 100 },
    WebhookLog: { x: 220, y: 80 },
    Subscription: { x: 400, y: 40 },
  };
  return positions[nodeId] || { x: 400, y: 300 };
};

export default function SchemaExplorer() {
  const { addToast } = useToast();
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterGroup, setFilterGroup] = useState('ALL');

  const fetchGraph = () => {
    setLoading(true);
    getSchemaGraphApi()
      .then((res) => {
        setData(res.data?.data || { nodes: [], edges: [] });
        // Set default selected node
        if (res.data?.data?.nodes?.length > 0) {
          setSelectedNode(res.data.data.nodes[0]);
        }
      })
      .catch(() => {
        addToast('Failed to load schema graph', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const nodes = data.nodes || [];
  const edges = data.edges || [];

  const filteredNodes = filterGroup === 'ALL' 
    ? nodes 
    : nodes.filter(n => n.group === filterGroup);

  const filteredEdges = edges.filter(e => {
    const fromNode = nodes.find(n => n.id === e.from);
    const toNode = nodes.find(n => n.id === e.to);
    if (!fromNode || !toNode) return false;
    if (filterGroup === 'ALL') return true;
    return fromNode.group === filterGroup || toNode.group === filterGroup;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        section="System Admin"
        title="Database Schema Explorer"
        description="Interactive relationship mapping of collections, document references, and schema architecture boundaries."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Graph Map */}
        <Card className="lg:col-span-8 p-5 space-y-4 border border-border-base dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-2xs">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-border-base dark:border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <HiOutlineAdjustmentsHorizontal className="text-lg text-primary" />
              <span className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">Filter Group View</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none max-w-full">
              {['ALL', 'core', 'menu', 'sales', 'ops', 'crm', 'system', 'finance'].map(g => (
                <button
                  key={g}
                  onClick={() => setFilterGroup(g)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                    filterGroup === g
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-border-base dark:border-zinc-900'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-[520px] flex items-center justify-center">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : (
            <div className="relative border border-border-base dark:border-zinc-900 rounded-2xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-1 h-[540px]">
              <svg 
                className="w-full h-full cursor-grab" 
                viewBox="0 0 900 600"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.02) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
              >
                {/* SVG Definitions for arrowheads */}
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                  </marker>
                </defs>

                {/* Draw Edges / Relationship Connections */}
                {filteredEdges.map((edge, idx) => {
                  const fromPos = getPresetPositions(edge.from);
                  const toPos = getPresetPositions(edge.to);
                  const isSelected = selectedNode && (selectedNode.id === edge.from || selectedNode.id === edge.to);

                  return (
                    <g key={idx} className="transition-opacity duration-300">
                      <line
                        x1={fromPos.x}
                        y1={fromPos.y}
                        x2={toPos.x}
                        y2={toPos.y}
                        stroke={isSelected ? '#6366f1' : '#cbd5e1'}
                        strokeWidth={isSelected ? 2 : 1}
                        strokeDasharray={isSelected ? '0' : '4 4'}
                        className="dark:stroke-zinc-800"
                        style={isSelected ? { stroke: '#818cf8', strokeWidth: 2.5 } : {}}
                        markerEnd="url(#arrow)"
                      />
                      {/* Optional Edge Label */}
                      <text
                        x={(fromPos.x + toPos.x) / 2}
                        y={(fromPos.y + toPos.y) / 2 - 4}
                        fill="#94a3b8"
                        className="text-[9px] font-bold font-mono text-center select-none opacity-0 hover:opacity-100 dark:fill-zinc-650"
                        textAnchor="middle"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}

                {/* Draw Nodes */}
                {filteredNodes.map(node => {
                  const pos = getPresetPositions(node.id);
                  const isSelected = selectedNode && selectedNode.id === node.id;
                  const groupStyle = groupColors[node.group] || groupColors.core;

                  return (
                    <g 
                      key={node.id} 
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="cursor-pointer transition-transform duration-200 hover:scale-105"
                      onClick={() => setSelectedNode(node)}
                    >
                      <circle
                        r="35"
                        fill={isSelected ? '#4f46e5' : groupStyle.color}
                        fillOpacity={isSelected ? '0.15' : '0.08'}
                        stroke={isSelected ? '#4f46e5' : groupStyle.color}
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="transition-all"
                      />
                      <circle
                        r="8"
                        fill={groupStyle.color}
                        className="opacity-75"
                      />
                      {/* Node Text Label */}
                      <rect
                        x="-45"
                        y="14"
                        width="90"
                        height="18"
                        rx="4"
                        fill={isSelected ? '#4f46e5' : '#ffffff'}
                        stroke={isSelected ? '#4f46e5' : '#e2e8f0'}
                        strokeWidth="1"
                        className="dark:fill-zinc-950 dark:stroke-zinc-900"
                      />
                      <text
                        y="26"
                        textAnchor="middle"
                        fill={isSelected ? '#ffffff' : '#334155'}
                        className="text-[10px] font-black select-none dark:fill-zinc-300 font-sans"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-[10px] text-zinc-400 font-semibold bg-white/80 dark:bg-zinc-950/80 p-2.5 rounded-xl backdrop-blur-xs border border-border-base dark:border-zinc-900">
                <span className="flex items-center gap-1"><HiOutlineGlobeAlt className="text-primary text-sm" /> Click nodes to explore schema properties</span>
                <span className="font-mono text-[9px] uppercase">Group: {filterGroup} ({filteredNodes.length} nodes, {filteredEdges.length} edges)</span>
              </div>
            </div>
          )}
        </Card>

        {/* Right Column: Node Details Inspector */}
        <Card className="lg:col-span-4 p-5 space-y-4 border border-border-base dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-2xs min-h-[500px]">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="border-b border-border-base dark:border-zinc-900 pb-3 space-y-2">
                <div className="flex justify-between items-center">
                  <Badge className="uppercase text-[9px] font-bold" variant="info">
                    {selectedNode.group} group
                  </Badge>
                  <span className="text-[10px] font-mono text-zinc-400">ObjectId ref ready</span>
                </div>
                <h3 className="text-lg font-black text-on-surface dark:text-zinc-150 flex items-center gap-1.5">
                  <HiOutlineCircleStack className="text-primary text-xl" />
                  {selectedNode.label}
                </h3>
              </div>

              {/* Fields List */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider block">Schema Fields</span>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {selectedNode.fields?.map(field => {
                    const isFKey = field.toLowerCase().endsWith('id');
                    return (
                      <div key={field} className="flex justify-between items-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-900 text-xs font-semibold">
                        <span className="font-mono text-on-background">{field}</span>
                        <span className={`text-[9.5px] uppercase font-bold font-mono ${isFKey ? 'text-primary' : 'text-zinc-400'}`}>
                          {isFKey ? 'Ref ObjectId' : 'Field'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Connections list */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-extrabold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider block">Relations Mapping</span>
                <div className="space-y-1.5">
                  {edges.filter(e => e.from === selectedNode.id || e.to === selectedNode.id).map((e, idx) => {
                    const isFrom = e.from === selectedNode.id;
                    const partner = isFrom ? e.to : e.from;
                    return (
                      <div key={idx} className="p-2.5 rounded-lg border border-border-base dark:border-zinc-900 flex justify-between items-center text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span className="badge badge-xs badge-neutral text-[8px] uppercase">{isFrom ? 'Out' : 'In'}</span>
                          <span className="text-zinc-400">{isFrom ? 'References' : 'Referenced by'}</span>
                          <span className="text-on-background font-bold">{partner}</span>
                        </div>
                        <span className="font-mono text-[10px] text-primary">{e.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center p-8 text-zinc-400">
              <HiOutlineEye className="text-4xl text-zinc-300 dark:text-zinc-800 mb-2" />
              <p className="text-xs">No node selected. Click on a database schema node in the graph map to inspect details.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
