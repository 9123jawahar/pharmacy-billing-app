import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, Cross, MessageSquareText } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Order } from "@/types";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await api.get<{ data: Order }>(`/billing/orders/${id}`)).data.data,
    enabled: !!id,
  });

  if (isLoading || !order) return <LoadingSpinner label="Loading invoice…" />;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        <div className="flex gap-2">
          {order.notifications && order.notifications.length > 0 && (
            <Badge variant="success" className="flex items-center gap-1">
              <MessageSquareText className="h-3 w-3" /> Invoice link sent via SMS
            </Badge>
          )}
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardContent className="space-y-6 p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Cross className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">MedStore Pharmacy</p>
                <p className="text-xs text-muted-foreground">123 Health Street, Mumbai — GSTIN 27ABCDE1234F1Z5</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{order.invoiceNumber}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
              <Badge variant={order.status === "FINALIZED" ? "success" : order.status === "VOIDED" ? "destructive" : "secondary"} className="mt-1">
                {order.status}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Billed To</p>
              <p className="font-medium">{order.customer?.name ?? "Walk-in Customer"}</p>
              {order.customer?.phone && <p className="text-muted-foreground">{order.customer.phone}</p>}
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Served By</p>
              <p className="font-medium">{order.createdByUser?.name}</p>
              {order.referredByDoctor && <p className="text-muted-foreground">Referred by Dr. {order.referredByDoctor.name}</p>}
            </div>
          </div>

          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">GST%</th>
                  <th className="py-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="py-2">
                      <p className="font-medium">{item.drug?.name}</p>
                      <p className="text-xs text-muted-foreground">Batch {item.drug?.batchNumber}</p>
                    </td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right">{Number(item.gstPercent).toFixed(0)}%</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (GST)</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Coupon Discount {order.coupon && `(${order.coupon.code})`}</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              {Number(order.loyaltyDiscount) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Loyalty Points ({order.loyaltyPointsUsed})</span>
                  <span>-{formatCurrency(order.loyaltyDiscount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Net Total</span>
                <span>{formatCurrency(order.netTotal)}</span>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">Payment method: {order.paymentMethod}</p>
            </div>
          </div>

          <Separator />
          <p className="text-center text-xs text-muted-foreground">
            Thank you for choosing MedStore Pharmacy. For queries, contact support@medstore.example.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
