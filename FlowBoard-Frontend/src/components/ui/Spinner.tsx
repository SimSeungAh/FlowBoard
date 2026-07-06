interface SpinnerProps {
  size?: "sm" | "md" | "lg";
}

const sizeClass = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-4",
};

export default function Spinner({ size = "md" }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-gray-300 border-t-blue-600 ${sizeClass[size]}`}
      role="status"
      aria-label="loading"
    />
  );
}
