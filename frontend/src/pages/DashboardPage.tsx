import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { IndianRupee, ShoppingBag, Users, AlertTriangle, CalendarClock, PackageX, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime, daysUntil } from "@/lib/utils";
import type { DashboardSummary } from "@/types";
import { StatCard } from "@/components/shared/StatCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => (await api.get<{ data: DashboardSummary }>("/dashboard/summary")).data.data,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return <LoadingSpinner label="Loading dashboard…" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Sales" value={formatCurrency(data.todaysSales)} icon={IndianRupee} tone="success" hint={`${data.todaysOrderCount} orders today`} />
        <StatCard label="This Month" value={formatCurrency(data.monthlySales)} icon={TrendingUp} tone="default" />
        <StatCard label="Active Customers" value={String(data.totalCustomers)} icon={Users} tone="default" />
        <StatCard label="Refills Due (30d)" value={String(data.dueSubscriptions.length)} icon={CalendarClock} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/inventory?tab=low-stock">
          <StatCard label="Low Stock Warnings" value={String(data.lowStockCount)} icon={AlertTriangle} tone="warning" hint="Stock at or below reorder level" />
        </Link>
        <Link to="/inventory?tab=expired">
          <StatCard label="Expired Drugs" value={String(data.expiredCount)} icon={PackageX} tone="destructive" hint="Remove from sale immediately" />
        </Link>
        <Link to="/inventory?tab=expired">
          <StatCard label="Expiring Within 30 Days" value={String(data.expiringSoonCount)} icon={ShoppingBag} tone="warning" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <Link to={`/invoices/${order.id}`} className="text-primary hover:underline">
                          {order.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{order.customer?.name ?? "Walk-in"}</TableCell>
                      <TableCell>{order.items.length}</TableCell>
                      <TableCell className="text-right">{formatCurrency(order.netTotal)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Refills Due Soon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.dueSubscriptions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No upcoming refills.</p>
            ) : (
              data.dueSubscriptions.slice(0, 8).map((sub) => {
                const days = daysUntil(sub.nextDueDate);
                return (
                  <div key={sub.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{sub.customer?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{sub.drug?.name}</p>
                    </div>
                    <Badge variant={days < 0 ? "destructive" : days <= 3 ? "warning" : "secondary"}>
                      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `In ${days}d`}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
