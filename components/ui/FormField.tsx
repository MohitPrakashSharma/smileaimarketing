export default function FormField({
  label,
  id,
  error,
  hint,
  required = false,
  optionalLabel = true,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optionalLabel?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 text-body-small font-semibold text-foreground">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
        {!required && optionalLabel && (
          <span className="ml-1 font-normal text-muted-foreground">(Optional)</span>
        )}
      </label>
      {children}
      {hint && !error && <span className="mt-1.5 text-metadata text-muted-foreground">{hint}</span>}
      {error && (
        <span id={`${id}-error`} role="alert" className="mt-1.5 text-metadata font-semibold text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
