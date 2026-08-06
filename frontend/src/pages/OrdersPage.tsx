import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Search } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Order } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  FINALIZED: "success",
  DRAFT: "secondary",
  VOIDED: "destructive",
  REFUNDED: "warning",
};

export default function OrdersPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await api.get<{ data: Order[] }>("/billing/orders", { params: { pageSize: 50 } })).data.data,
  });

  const orders = (data ?? []).filter(
    (o) => !search || o.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || o.customer?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="All finalized, voided, and refunded invoices." />

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search invoice # or customer…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders found" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link to={`/invoices/${order.id}`} className="font-medium text-primary hover:underline">
                        {order.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customer?.name ?? "Walk-in"}</TableCell>
                    <TableCell className="text-muted-foreground">{order.referredByDoctor ? `Dr. ${order.referredByDoctor.name}` : "—"}</TableCell>
                    <TableCell>{order.paymentMethod}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(order.netTotal)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[order.status] ?? "secondary"}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
