'use client';

interface AnalyticsCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function AnalyticsCard({ 
  title, 
  description, 
  icon, 
  children, 
  className = "" 
}: AnalyticsCardProps) {
  return (
    <div className={`bg-card/50 backdrop-blur-xl rounded-xl border border-border p-6 shadow-lg ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        {icon && <div className="text-primary">{icon}</div>}
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      {description && (
        <div className="text-sm text-muted-foreground mb-4">
          {description}
        </div>
      )}
      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}
