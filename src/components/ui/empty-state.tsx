// src/components/ui/empty-state.tsx

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {icon && <div className="mb-4 text-[#2A2A33] text-6xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#9A9AA6] max-w-xs mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
