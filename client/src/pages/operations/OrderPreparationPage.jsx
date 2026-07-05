import PageHeader from '../../components/ui/PageHeader';
import KitchenDisplay from './components/KitchenDisplay';

export default function OrderPreparationPage() {
  return (
    <div className="h-[calc(100vh-112px)] flex flex-col overflow-hidden space-y-4 animate-fade-in">
      {/* Page Header */}
      <div className="shrink-0">
        <PageHeader 
          section="Operations"
          title="Order Preparation" 
          description="Real-time Kitchen Display System (KDS). Monitor food and beverage prep status across all online and offline channels."
        />
      </div>

      {/* Embedded KDS Display */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900">
        <KitchenDisplay />
      </div>
    </div>
  );
}
