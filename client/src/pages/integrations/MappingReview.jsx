import { useState, useEffect } from 'react';
import { getUnmappedItemsApi } from '../../api/models/integration.api';
import { getPayload } from '../../utils/apiData';
import { Link } from 'react-router-dom';

export default function MappingReview() {
  const [provider, setProvider] = useState('MOCK_SWIGGY');
  const [unmappedData, setUnmappedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUnmapped = async () => {
    try {
      setLoading(true);
      const res = await getUnmappedItemsApi(provider);
      setUnmappedData(getPayload(res));
    } catch (err) {
      console.error('Failed to fetch unmapped items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnmapped();
  }, [provider]);

  const items = unmappedData?.items || [];
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-2">
        <Link to="/integrations" className="text-xs font-bold text-primary dark:text-primary-fixed-dim hover:underline no-underline">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-bold text-on-surface dark:text-zinc-100 tracking-tight">
            Mapping Review Panel
          </h2>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
            Resolve unmapped menu items to ensure incoming external orders resolve cleanly to your catalog.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-border-base dark:border-zinc-800">
          <button
            onClick={() => setProvider('MOCK_SWIGGY')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              provider === 'MOCK_SWIGGY' 
                ? 'bg-white dark:bg-zinc-800 text-on-surface shadow-xs' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Swiggy Catalogs
          </button>
          <button
            onClick={() => setProvider('MOCK_ZOMATO')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              provider === 'MOCK_ZOMATO' 
                ? 'bg-white dark:bg-zinc-800 text-on-surface shadow-xs' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Zomato Catalogs
          </button>
        </div>
      </div>

      {/* Main Review Card */}
      <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-5.5 h-5.5 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-400">
              {filteredItems.length}
            </span>
            <span className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider">
              Unmapped Items
            </span>
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Search items by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-surface-subtle dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-on-surface dark:text-zinc-200 focus:outline-none focus:border-primary w-full sm:max-w-xs"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-on-surface-variant/60 dark:text-zinc-550 font-medium">
            Fetching unmapped catalog list...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-on-surface-variant/60 dark:text-zinc-550 font-medium">
            {searchQuery ? 'No matching unmapped items found.' : 'Excellent! All menu items are fully mapped for this provider.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-base dark:border-zinc-800 text-on-surface-variant/70 dark:text-zinc-550 font-bold uppercase tracking-wider">
                  <th className="py-2.5">Menu Item Name</th>
                  <th className="py-2.5">Internal ID</th>
                  <th className="py-2.5">Default Price</th>
                  <th className="py-2.5">SKU Reference</th>
                  <th className="py-2.5 text-right">Integrations Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base/55 dark:divide-zinc-850">
                {filteredItems.map((item) => (
                  <tr key={item._id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-950/20">
                    <td className="py-3.5 font-bold text-on-surface dark:text-zinc-200">
                      {item.name}
                    </td>
                    <td className="py-3.5 text-on-surface-variant/70 dark:text-zinc-500 font-mono text-[10px]">
                      {item._id}
                    </td>
                    <td className="py-3.5 font-semibold text-on-surface dark:text-zinc-300">
                      ₹{item.price}
                    </td>
                    <td className="py-3.5 text-on-surface-variant dark:text-zinc-400 font-semibold font-mono">
                      {item.sku || 'N/A'}
                    </td>
                    <td className="py-3.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-705 dark:bg-amber-950/10 dark:text-amber-400">
                        PENDING MAPPING
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
