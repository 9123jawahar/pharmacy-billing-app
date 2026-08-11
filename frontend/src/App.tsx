import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { BillingDraftsProvider } from "@/lib/billing-drafts-context";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/toaster";

import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import InventoryPage from "@/pages/InventoryPage";
import CustomersPage from "@/pages/CustomersPage";
import CustomerDetailPage from "@/pages/CustomerDetailPage";
import DoctorsPage from "@/pages/DoctorsPage";
import BillingPage from "@/pages/BillingPage";
import OrdersPage from "@/pages/OrdersPage";
import InvoicePage from "@/pages/InvoicePage";
import AuditLogPage from "@/pages/AuditLogPage";
import UsersPage from "@/pages/UsersPage";
import NotFoundPage from "@/pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BillingDraftsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/invoices/:id" element={<InvoicePage />} />

              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/doctors" element={<DoctorsPage />} />
                <Route path="/orders" element={<OrdersPage />} />

                <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
                  <Route path="/audit-logs" element={<AuditLogPage />} />
                  <Route path="/users" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster />
        </BillingDraftsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
