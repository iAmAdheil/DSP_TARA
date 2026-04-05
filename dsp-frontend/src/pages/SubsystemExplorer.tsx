import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Layers, Filter, Loader2 } from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import { useRisks } from '../hooks/useRisks';
import clsx from 'clsx';

function getHeat(riskCount: number): 'Critical' | 'High' | 'Medium' | 'Low' {
  if (riskCount >= 10) return 'Critical';
  if (riskCount >= 5)  return 'High';
  if (riskCount >= 1)  return 'Medium';
  return 'Low';
}

export function SubsystemExplorer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');

  const { data: assetsPayload, isLoading: assetsLoading } = useAssets(runId);
  const { data: risks } = useRisks(runId);

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-info-bg flex items-center justify-center mb-[24px]">
          <Box className="w-[36px] h-[36px] text-info-fg" />
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">No Subsystem mapping available</h2>
        <p className="text-[13px] text-text-secondary mb-[24px]">Ingest a system to view its subsystems.</p>
        <button className="btn-primary btn-md" onClick={() => navigate('/ingestion')}>
          Go to System Ingestion
        </button>
      </div>
    );
  }

  if (assetsLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-[28px] h-[28px] text-accent-500 animate-spin" />
      </div>
    );
  }

  const assets = assetsPayload?.assets ?? [];

  // Group assets by kind
  const kindMap = new Map<string, { name: string; assetIds: string[] }>();
  for (const asset of assets) {
    const key = asset.kind || 'unknown';
    if (!kindMap.has(key)) {
      kindMap.set(key, { name: key, assetIds: [] });
    }
    kindMap.get(key)!.assetIds.push(asset.id);
  }

  // Build groups with risk counts
  const groups = Array.from(kindMap.entries()).map(([kind, group]) => {
    const riskCount = (risks ?? []).filter(r => {
      // Count risks linked to assets in this group
      const linkedAssetIds = new Set([
        ...(r.threat?.entryPoints?.map(a => a.id) ?? []),   // FD1a: safe chain
        ...(r.threat?.impactedAssets?.map(a => a.id) ?? []), // FD1a: safe chain
        ...(r.attackPath ? [r.attackPath.targetAssetId] : []),
        ...(r.cveMatch?.matchedAssets?.map(a => a.id) ?? []), // FD1b: count CVE-sourced risks
      ]);
      return group.assetIds.some(id => linkedAssetIds.has(id));
    }).length;
    return { kind, assetCount: group.assetIds.length, riskCount, heat: getHeat(riskCount) };
  });

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[24px] flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Subsystem Explorer</h2>
          <p className="text-[13px] text-text-secondary">Asset groups derived from kind classification. {assets.length} total assets across {groups.length} groups.</p>
        </div>
        <div className="flex items-center gap-[12px]">
          <button className="btn-secondary btn-md">
            <Layers className="w-[14px] h-[14px] mr-[6px]" />
            Toggle 3D View (Alpha)
          </button>
          <button className="btn-secondary btn-md">
            <Filter className="w-[14px] h-[14px] mr-[6px]" />
            Risk Heat Overlay
          </button>
        </div>
      </header>

      <div className="flex-1 card-panel flex border border-border-default shadow-sm relative overflow-hidden bg-[#f4f6f8]">
        <div className="absolute inset-[32px] grid gap-[16px] p-[16px]"
          style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 3)}, 1fr)` }}
        >
          {groups.map((group) => (
            <div
              key={group.kind}
              className={clsx(
                "border-2 border-transparent rounded-[12px] flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden p-[16px]",
                group.heat === 'Critical' ? "bg-[rgba(180,35,24,0.12)] border-[rgba(180,35,24,0.45)] hover:border-[rgba(180,35,24,0.72)]" :
                group.heat === 'High'     ? "bg-[rgba(209,67,67,0.12)] border-[rgba(209,67,67,0.45)] hover:border-[rgba(209,67,67,0.64)]" :
                group.heat === 'Medium'   ? "bg-[rgba(194,122,16,0.12)] border-[rgba(194,122,16,0.45)] hover:border-[rgba(194,122,16,0.56)]" :
                "bg-[rgba(47,133,90,0.12)] border-[rgba(47,133,90,0.45)] hover:border-[rgba(47,133,90,0.52)]"
              )}
            >
              <h3 className="text-[16px] font-bold text-text-primary z-10 capitalize">{group.kind}</h3>
              <span className="text-[12px] font-semibold text-text-secondary z-10 mt-1">{group.assetCount} Asset{group.assetCount !== 1 ? 's' : ''}</span>
              {group.riskCount > 0 && (
                <span className="text-[11px] font-semibold text-text-muted z-10">{group.riskCount} Risk{group.riskCount !== 1 ? 's' : ''}</span>
              )}
            </div>
          ))}

          {groups.length === 0 && (
            <div className="flex items-center justify-center h-[200px] text-[13px] text-text-muted col-span-3">
              No assets found for this run.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
