interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClassName = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export default function Avatar({
  src,
  alt = "프로필 이미지",
  name,
  size = "md",
  className = "",
}: AvatarProps) {
  const initial = name?.trim().charAt(0).toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 font-semibold text-slate-600 ${sizeClassName[size]} ${className}`}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span>{initial || "?"}</span>
      )}
    </div>
  );
}
