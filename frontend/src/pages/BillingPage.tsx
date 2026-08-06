import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Trash2, Plus, Minus, ShoppingCart, Loader2, Tag, Award, AlertTriangle } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import type { Customer, Doctor, Drug } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";

interface CartLine {
  drug: Drug;
  quantity: number;
}

const paymentMethods = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "WALLET", label: "Wallet" },
  { value: "INSURANCE", label: "Insurance" },
];

export default function BillingPage() {
  const navigate = useNavigate();
  const [drugQuery, setDrugQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [doctorId, setDoctorId] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ discount: number } | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [submitting, setSubmitting] = useState(false);

  const { data: drugResults = [] } = useQuery({
    queryKey: ["billing-drug-search", drugQuery],
    queryFn: async () => (await api.get<{ data: Drug[] }>("/inventory/search", { params: { q: drugQuery } })).data.data,
    enabled: drugQuery.trim().length >= 2,
  });

  const { data: customerResults = [] } = useQuery({
    queryKey: ["billing-customer-search", customerSearch],
    queryFn: async () => (await api.get<{ data: Customer[] }>("/customers", { params: { search: customerSearch, pageSize: 8 } })).data.data,
    enabled: customerSearch.trim().length >= 2 && !customer,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["billing-doctors"],
    queryFn: async () => (await api.get<{ data: Doctor[] }>("/doctors", { params: { pageSize: 100 } })).data.data,
  });

  const allergyWarnings = useMemo(() => {
    if (!customer) return [];
    return cart
      .filter((line) =>
        customer.allergies.some((a) => `${line.drug.name} ${line.drug.genericName} ${line.drug.composition ?? ""}`.toLowerCase().includes(a.toLowerCase()))
      )
      .map((line) => `${customer.name} has a recorded allergy that may conflict with ${line.drug.name}.`);
  }, [cart, customer]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, l) => sum + Number(l.drug.sellingPrice) * l.quantity, 0);
    const taxAmount = cart.reduce((sum, l) => sum + Number(l.drug.sellingPrice) * l.quantity * (Number(l.drug.gstPercent) / 100), 0);
    const discount = couponResult?.discount ?? 0;
    const loyaltyDiscount = Math.min(Number(loyaltyPoints) || 0, subtotal + taxAmount - discount);
    const netTotal = Math.max(0, subtotal + taxAmount - discount - loyaltyDiscount);
    return { subtotal, taxAmount, discount, loyaltyDiscount, netTotal };
  }, [cart, couponResult, loyaltyPoints]);

  function addToCart(drug: Drug) {
    setCart((prev) => {
      const existing = prev.find((l) => l.drug.id === drug.id);
      if (existing) {
        if (existing.quantity >= drug.stockQuantity) {
          toast({ title: "Stock limit reached", description: `Only ${drug.stockQuantity} units of ${drug.name} available.`, variant: "destructive" });
          return prev;
        }
        return prev.map((l) => (l.drug.id === drug.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { drug, quantity: 1 }];
    });
    setDrugQuery("");
  }

  function updateQuantity(drugId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.drug.id !== drugId) return l;
          const next = l.quantity + delta;
          if (next > l.drug.stockQuantity) {
            toast({ title: "Stock limit reached", description: `Only ${l.drug.stockQuantity} units available.`, variant: "destructive" });
            return l;
          }
          return { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0)
    );
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    try {
      const res = await api.get("/loyalty/coupons/validate", { params: { code: couponCode, subtotal: totals.subtotal } });
      setCouponResult({ discount: res.data.data.discount });
      toast({ title: "Coupon applied", description: `Discount of ${formatCurrency(res.data.data.discount)}` });
    } catch (err) {
      setCouponResult(null);
      toast({ title: "Invalid coupon", description: getErrorMessage(err), variant: "destructive" });
    }
  }

  async function finalizeOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post("/billing/orders", {
        customerId: customer?.id,
        doctorId: doctorId || undefined,
        items: cart.map((l) => ({ drugId: l.drug.id, quantity: l.quantity })),
        couponCode: couponResult ? couponCode.toUpperCase() : undefined,
        loyaltyPointsToRedeem: Number(loyaltyPoints) || 0,
        paymentMethod,
        notifyCustomer: true,
      });

      const order = res.data.data;

      // Mock SMS/WhatsApp gateway confirmation — mirrors the console log the backend emits.
      toast({
        title: "Invoice finalized",
        description: `${order.invoiceNumber} — digital invoice link sent to ${customer?.phone ?? "walk-in (no SMS)"}`,
        variant: "success",
      });

      setCart([]);
      setCustomer(null);
      setDoctorId("");
      setCouponCode("");
      setCouponResult(null);
      setLoyaltyPoints("0");
      navigate(`/invoices/${order.id}`);
    } catch (err) {
      toast({ title: "Could not finalize order", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Billing / Point of Sale" description="Search drugs, build the cart, and finalize the invoice." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Search className="h-4 w-4" /> Add drugs to bill
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input placeholder="Search by brand, generic name, or symptom…" value={drugQuery} onChange={(e) => setDrugQuery(e.target.value)} />
              {drugResults.length > 0 && (
                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                  {drugResults.map((drug) => (
                    <button
                      key={drug.id}
                      type="button"
                      onClick={() => addToCart(drug)}
                      disabled={drug.stockQuantity === 0}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-secondary disabled:opacity-40"
                    >
                      <span>
                        <span className="font-medium">{drug.name}</span>{" "}
                        <span className="text-muted-foreground">({drug.genericName})</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge variant={drug.stockQuantity <= drug.reorderLevel ? "warning" : "secondary"}>{drug.stockQuantity} in stock</Badge>
                        <span className="font-medium">{formatCurrency(drug.sellingPrice)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Cart</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="Cart is empty" description="Search for a drug above to add it to the bill." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drug</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((line) => (
                      <TableRow key={line.drug.id}>
                        <TableCell>
                          <div className="font-medium">{line.drug.name}</div>
                          <div className="text-xs text-muted-foreground">Batch {line.drug.batchNumber}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1.5">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(line.drug.id, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center">{line.quantity}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(line.drug.id, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(line.drug.sellingPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(line.drug.sellingPrice) * line.quantity)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setCart((prev) => prev.filter((l) => l.drug.id !== line.drug.id))}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {allergyWarnings.length > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              {allergyWarnings.map((w, i) => (
                <p key={i} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Customer (optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer ? (
                <div className="flex items-center justify-between rounded-md border border-border p-2.5">
                  <div>
                    <p className="text-sm font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.phone} · {customer.loyaltyPoints} pts
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input placeholder="Search by name or phone…" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                  {customerResults.length > 0 && (
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomer(c);
                            setCustomerSearch("");
                          }}
                          className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-secondary"
                        >
                          {c.name} <span className="text-muted-foreground">— {c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Referring Doctor (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      Dr. {d.name} ({d.speciality})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Discounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                <Button variant="outline" onClick={applyCoupon}>
                  <Tag className="h-4 w-4" /> Apply
                </Button>
              </div>
              {customer && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Award className="h-3.5 w-3.5" /> Redeem loyalty points (max {customer.loyaltyPoints})
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={customer.loyaltyPoints}
                    value={loyaltyPoints}
                    onChange={(e) => setLoyaltyPoints(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-2 pt-5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (GST)</span>
                <span>{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className={cn("flex justify-between", totals.discount > 0 && "text-success")}>
                <span className="text-muted-foreground">Coupon Discount</span>
                <span>-{formatCurrency(totals.discount)}</span>
              </div>
              <div className={cn("flex justify-between", totals.loyaltyDiscount > 0 && "text-success")}>
                <span className="text-muted-foreground">Loyalty Discount</span>
                <span>-{formatCurrency(totals.loyaltyDiscount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Net Total</span>
                <span>{formatCurrency(totals.netTotal)}</span>
              </div>

              <Button className="mt-2 w-full" size="lg" disabled={cart.length === 0 || submitting} onClick={finalizeOrder}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Finalize &amp; Send Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
