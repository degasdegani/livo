import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, required, id, className, ...props }, ref) {
    return (
      <div>
        {label && (
          <label
            htmlFor={id}
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            {label}
            {required && (
              <span
                aria-hidden="true"
                style={{ color: "var(--color-primary)", marginLeft: 3 }}
              >
                {" "}
                *
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          required={required}
          className={[
            "livo-input",
            error ? "livo-input--error" : "",
            className ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error && id ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={id ? `${id}-error` : undefined}
            style={{ fontSize: 12, color: "var(--status-red)", marginTop: 4 }}
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);
