"use client";

import { FormEvent } from "react";
import { AppSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type SettingsDialogProps = {
  open: boolean;
  settings: AppSettings;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: AppSettings) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SettingsDialog(props: SettingsDialogProps) {
  const { open, settings, isPending, onOpenChange, onChange, onSubmit } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Workspace settings</DialogTitle>
            <DialogDescription>Model and connection settings for this workspace.</DialogDescription>
          </DialogHeader>
          <label className="controlLabel">
            API Key
            <Input
              type="password"
              value={settings.apiKey}
              onChange={(event) => onChange({ ...settings, apiKey: event.target.value })}
            />
          </label>
          <label className="controlLabel">
            Model
            <select value={settings.model} onChange={(event) => onChange({ ...settings, model: event.target.value })}>
              <option value="deepseek-v4-flash">deepseek-v4-flash</option>
              <option value="deepseek-v4-pro">deepseek-v4-pro</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4.1-mini">gpt-4.1-mini</option>
              <option value="gpt-4.1">gpt-4.1</option>
            </select>
          </label>
          <label className="controlLabel">
            Base URL
            <Input value={settings.baseUrl} onChange={(event) => onChange({ ...settings, baseUrl: event.target.value })} />
          </label>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Close</Button>
            <Button variant="default" className="primaryAction" type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
