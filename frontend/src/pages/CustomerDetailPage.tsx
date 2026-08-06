import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, Award, CalendarClock, Loader2, Plus } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import type { Customer, Drug } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomerDetail extends Customer {
  subscriptions: Array<{
    id: string;
    quantity: number;
    frequencyDays: number;
    nextDueDate: string;
    status: string;
    drug: { name: string; genericName: string };
  }>;
  orders: Array<{ id: string; invoiceNumber: string; netTotal: string; createdAt: string; items: unknown[] }>;
  loyaltyLedger: Array<{ id: string; points: number; reason: string; createdAt: string }>;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [subOpen, setSubOpen] = useState(false);
  const [subForm, setSubForm] = useState({ drugId: "", quantity: "30", frequencyDays: "30", nextDueDate: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => (await api.get<{ data: CustomerDetail }>(`/customers/${id}`)).data.data,
    enabled: !!id,
  });

  const { data: drugs = [] } = useQuery({
    queryKey: ["drugs-list"],
    queryFn: async () => (await api.get<{ data: Drug[] }>("/inventory", { params: { pageSize: 200 } })).data.data,
    enabled: subOpen,
  });

  async function handleSubSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await api.post("/subscriptions", {
        customerId: id,
        drugId: subForm.drugId,
        quantity: Number(subForm.quantity),
        frequencyDays: Number(subForm.frequencyDays),
        nextDueDate: subForm.nextDueDate,
      });
      setSubOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      toast({ title: "Subscription created" });
    } catch (err) {
      toast({ title: "Could not create subscription", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !customer) return <LoadingSpinner label="Loading customer…" />;

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{customer.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-y-2">
              <span className="text-muted-foreground">Phone</span>
              <span>{customer.phone}</span>
              <span className="text-muted-foreground">Email</span>
              <span>{customer.email ?? "—"}</span>
              <span className="text-muted-foreground">Age / Gender</span>
              <span>
                {customer.age ?? "—"} {customer.gender ?? ""}
              </span>
              <span className="text-muted-foreground">Address</span>
              <span>{customer.address ?? "—"}</span>
            </div>

            <Separator />

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 font-medium text-warning">
                <AlertTriangle className="h-4 w-4" /> Allergies
              </p>
              {customer.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {customer.allergies.map((a) => (
                    <Badge key={a} variant="warning">
                      {a}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">None recorded</p>
              )}
            </div>

            <div>
              <p className="mb-1.5 font-medium">Chronic Conditions</p>
              {customer.chronicConditions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {customer.chronicConditions.map((c) => (
                    <Badge key={c} variant="secondary">
                      {c}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">None recorded</p>
              )}
            </div>

            <Separator />

            <div className="flex items-center gap-2 text-success">
              <Award className="h-4 w-4" />
              <span className="font-semibold">{customer.loyaltyPoints} loyalty points</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> Refill Subscriptions
              </CardTitle>
              <Button size="sm" onClick={() => setSubOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              {customer.subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active subscriptions.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drug</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.subscriptions.map((s) => {
                      const days = daysUntil(s.nextDueDate);
                      return (
                        <TableRow key={s.id}>
                          <TableCell>{s.drug.name}</TableCell>
                          <TableCell>{s.quantity}</TableCell>
                          <TableCell>Every {s.frequencyDays}d</TableCell>
                          <TableCell>{formatDate(s.nextDueDate)}</TableCell>
                          <TableCell>
                            <Badge variant={days < 0 ? "destructive" : days <= 3 ? "warning" : "success"}>
                              {days < 0 ? "Overdue" : days <= 3 ? "Due soon" : s.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Link to={`/invoices/${o.id}`} className="text-primary hover:underline">
                            {o.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{o.items.length}</TableCell>
                        <TableCell className="text-right">{formatCurrency(o.netTotal)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Refill Subscription</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Drug</Label>
              <Select value={subForm.drugId} onValueChange={(v) => setSubForm({ ...subForm, drugId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select drug" />
                </SelectTrigger>
                <SelectContent>
                  {drugs.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.genericName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Quantity per refill</Label>
                <Input type="number" min={1} required value={subForm.quantity} onChange={(e) => setSubForm({ ...subForm, quantity: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Frequency (days)</Label>
                <Input type="number" min={1} required value={subForm.frequencyDays} onChange={(e) => setSubForm({ ...subForm, frequencyDays: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Next Due Date</Label>
              <Input type="date" required value={subForm.nextDueDate} onChange={(e) => setSubForm({ ...subForm, nextDueDate: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !subForm.drugId}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Subscription
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
