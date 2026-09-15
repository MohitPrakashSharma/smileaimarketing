export default function ProgressSteps({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={steps.length}>
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const done = stepNum < current;
          const active = stepNum === current;
          return (
            <span
              key={label}
              className={`h-1 flex-1 rounded-full transition-colors duration-[var(--duration-normal)] ${
                done ? "bg-primary" : active ? "bg-primary/70" : "bg-border"
              }`}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <p className="mt-3 text-eyebrow text-muted-foreground">
        Step {current} of {steps.length} &middot; {steps[current - 1]}
      </p>
    </div>
  );
}
