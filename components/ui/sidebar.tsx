import * as React from "react";
import { cn } from "@/lib/utils";

export function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
  return <aside className={cn("sidebar", className)} {...props} />;
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header className={cn("sidebarNavHeader", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("sidebarContentScroll", className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("sidebarGroup cardSoft", className)} {...props} />;
}

export function SidebarGroupHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header className={cn("sidebarHead", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("tree", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(className)} {...props} />;
}
