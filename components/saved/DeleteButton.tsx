"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteButtonProps {
  id: string;
  onDelete: (id: string) => void;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
}

export function DeleteButton({
  id,
  onDelete,
  disabled = false,
  size = "icon",
}: DeleteButtonProps) {
  const handleClick = () => {
    onDelete(id);
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      disabled={disabled}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      aria-label="削除"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}