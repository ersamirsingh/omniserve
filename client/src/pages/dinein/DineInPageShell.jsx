import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import { DINEIN_TABS } from './dinein.constants';

export default function DineInPageShell({
  title,
  description,
  scopeState,
  actions,
  children,
}) {
  const { scope, isReady, updateScopeField, resetScope } = scopeState;

  return (
    <div className="space-y-6">
      <PageHeader
        section="Dine In"
        title={title}
        description={description}
        actions={actions}
        tabs={DINEIN_TABS}
      />

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border border-border-base dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-on-surface dark:text-zinc-100">Service Scope</h3>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                Requests use these tenant and outlet headers when a shared JWT is not available.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={resetScope}>Reset</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input label="Tenant ID" value={scope.tenantId} onChange={(e) => updateScopeField('tenantId', e.target.value)} />
            <Input label="Outlet ID" value={scope.outletId} onChange={(e) => updateScopeField('outletId', e.target.value)} />
            <Input label="User ID" value={scope.userId} onChange={(e) => updateScopeField('userId', e.target.value)} />
            <Input label="Role" value={scope.userRole} onChange={(e) => updateScopeField('userRole', e.target.value)} />
            <Input label="Email" value={scope.userEmail} onChange={(e) => updateScopeField('userEmail', e.target.value)} />
          </div>
        </div>

        <Card className="rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-on-surface-variant dark:text-zinc-500 font-semibold">
            Connectivity
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-sm font-semibold text-on-surface dark:text-zinc-100">
              {isReady ? 'Ready to query dine-in service' : 'Tenant and outlet scope required'}
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-on-surface-variant dark:text-zinc-400">
            Backend default path: <span className="font-mono">/api/v1</span>. Override with <span className="font-mono">VITE_DINEIN_API_URL</span> if the service runs on a separate host.
          </p>
        </Card>
      </section>

      {children}
    </div>
  );
}
