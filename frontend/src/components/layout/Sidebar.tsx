import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Pill,
  Users,
  Stethoscope,
  ShoppingCart,
  ClipboardList,
  ShieldCheck,
  Cross,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/types";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/billing", label: "Billing / POS", icon: ShoppingCart },
  { to: "/inventory", label: "Inventory", icon: Pill },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/doctors", label: "Doctors", icon: Stethoscope },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/audit-logs", label: "Audit Logs", icon: ShieldCheck, roles: ["ADMIN"] },
  { to: "/users", label: "Users", icon: Users, roles: ["ADMIN"] },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Cross className="h-4.5 w-4.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">MedStore Pharmacy</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems
          .filter((item) => !item.roles || (user && item.roles.includes(user.role)))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        <p>MedStore Pharmacy v1.0</p>
        <p>Corporate Billing &amp; Inventory Suite</p>
      </div>
    </aside>
  );
}
