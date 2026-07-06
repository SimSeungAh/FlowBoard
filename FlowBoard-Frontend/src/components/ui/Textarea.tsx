import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  errorMessage?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, errorMessage, className = "", id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}

        <textarea
          id={id}
          ref={ref}
          className={`min-h-28 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${className}`}
          {...props}
        />

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export default Textarea;
