import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, Users, AlertTriangle, Loader2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import type { Customer } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const emptyForm = { name: "", phone: "", email: "", age: "", gender: "", address: "", chronicConditions: "", allergies: "" };

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: async () => (await api.get<{ data: Customer[] }>("/customers", { params: { search: search || undefined, pageSize: 50 } })).data.data,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/customers", {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender || undefined,
        address: form.address || undefined,
        chronicConditions: form.chronicConditions.split(",").map((s) => s.trim()).filter(Boolean),
        allergies: form.allergies.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setOpen(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer registered" });
    } catch (err) {
      toast({ title: "Could not save customer", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const customers = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Profiles, chronic conditions, allergies, and loyalty balances."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Customer
          </Button>
        }
      />

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or phone…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Age / Gender</TableHead>
                  <TableHead>Allergies</TableHead>
                  <TableHead>Loyalty Pts</TableHead>
                  <TableHead>Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to={`/customers/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.name}
                      </Link>
                      {c.chronicConditions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.chronicConditions.map((cond) => (
                            <Badge key={cond} variant="secondary">
                              {cond}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>
                      {c.age ?? "—"} {c.gender ?? ""}
                    </TableCell>
                    <TableCell>
                      {c.allergies.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-warning">
                          <AlertTriangle className="h-3.5 w-3.5" /> {c.allergies.join(", ")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None recorded</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{c.loyaltyPoints}</TableCell>
                    <TableCell>{c._count?.orders ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Age</Label>
                <Input type="number" min={0} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Chronic Conditions (comma-separated)</Label>
              <Textarea rows={2} value={form.chronicConditions} onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })} placeholder="Diabetes, Hypertension" />
            </div>
            <div className="space-y-1.5">
              <Label>Allergies (comma-separated — critical for interaction checks)</Label>
              <Textarea rows={2} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Penicillin, Sulfa drugs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
