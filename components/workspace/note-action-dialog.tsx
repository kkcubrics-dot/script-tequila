"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type NoteActionMode = "create" | "rename" | "move";

type NoteActionDialogProps = {
  open: boolean;
  mode: NoteActionMode;
  initialValue: string;
  title: string;
  description: string;
  confirmLabel: string;
  onSubmit: (value: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export function NoteActionDialog(props: NoteActionDialogProps) {
  const { open, mode, initialValue, title, description, confirmLabel, onSubmit, onOpenChange } = props;
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    setPending(false);
  }, [initialValue, open]);

  const placeholder = useMemo(() => {
    if (mode === "create") return "Untitled Note";
    if (mode === "rename") return "Rename note";
    return "Target folder";
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) return;
    setPending(true);
    try {
      await onSubmit(value.trim());
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="default" disabled={pending || !value.trim()}>{pending ? "Saving..." : confirmLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
