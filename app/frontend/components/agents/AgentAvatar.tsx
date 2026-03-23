import { useState } from "react"
import { cn } from "@/lib/utils"

interface AgentAvatarProps {
  name: string
  avatarUrl: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE_CLASSES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-xl",
}

export function AgentAvatar({ name, avatarUrl, size = "md", className }: AgentAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = SIZE_CLASSES[size]
  const initial = name?.charAt(0)?.toUpperCase() || "?"

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={cn("rounded-full object-cover", sizeClass, className)}
      />
    )
  }

  return (
    <div
      className={cn(
        "rounded-full bg-neutral-200 flex items-center justify-center font-medium text-neutral-600 select-none",
        sizeClass,
        className
      )}
    >
      {initial}
    </div>
  )
}
