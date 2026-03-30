export function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
      <div className="w-[64px] h-[64px] rounded-full bg-surface-2 flex items-center justify-center mb-[24px]">
        <span className="text-[24px] text-text-muted font-bold">🛠</span>
      </div>
      <h2 className="text-[20px] font-bold tracking-tight text-text-primary mb-[8px]">
        {title}
      </h2>
      <p className="text-[14px] text-text-secondary max-w-sm leading-relaxed">
        This module is currently under development. To see the full interaction, navigate to Project Workspace or System Ingestion.
      </p>
    </div>
  );
}
