import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/billing": "Billing / Point of Sale",
  "/inventory": "Drug Inventory",
  "/customers": "Customer Management",
  "/doctors": "Doctor Referrals",
  "/orders": "Orders",
  "/audit-logs": "Audit Logs",
  "/users": "User Management",
};

export function AppLayout() {
  const location = useLocation();
  const title = titles[location.pathname] ?? "MedStore Pharmacy";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
