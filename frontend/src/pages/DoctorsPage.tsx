import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Stethoscope, Loader2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Doctor } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const emptyForm = { name: "", speciality: "", clinicAddress: "", contactNumber: "", email: "" };

interface ReferralMetric {
  id: string;
  name: string;
  speciality: string;
  referralCount: number;
  totalRevenue: number;
}

export default function DoctorsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("directory");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const canManage = user?.role === "ADMIN" || user?.role === "PHARMACIST";

  const { data: doctors, isLoading } = useQuery({
    queryKey: ["doctors", search],
    queryFn: async () => (await api.get<{ data: Doctor[] }>("/doctors", { params: { search: search || undefined, pageSize: 50 } })).data.data,
    enabled: tab === "directory",
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ["doctor-referral-metrics"],
    queryFn: async () => (await api.get<{ data: ReferralMetric[] }>("/doctors/referral-metrics")).data.data,
    enabled: tab === "metrics",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/doctors", { ...form, email: form.email || undefined });
      setOpen(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast({ title: "Doctor added" });
    } catch (err) {
      toast({ title: "Could not save doctor", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Referrals"
        description="Directory of referring doctors and their referral performance."
        actions={
          canManage && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add Doctor
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="metrics">Referral Metrics</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "directory" ? (
        <>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or speciality…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : !doctors || doctors.length === 0 ? (
            <EmptyState icon={Stethoscope} title="No doctors found" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Speciality</TableHead>
                      <TableHead>Clinic</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Referrals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctors.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">Dr. {d.name}</TableCell>
                        <TableCell>{d.speciality}</TableCell>
                        <TableCell className="text-muted-foreground">{d.clinicAddress ?? "—"}</TableCell>
                        <TableCell>{d.contactNumber}</TableCell>
                        <TableCell>{d._count?.orders ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Referral Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Speciality</TableHead>
                  <TableHead className="text-right">Referred Orders</TableHead>
                  <TableHead className="text-right">Revenue Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">Dr. {m.name}</TableCell>
                    <TableCell>{m.speciality}</TableCell>
                    <TableCell className="text-right">{m.referralCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.totalRevenue)}</TableCell>
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
            <DialogTitle>Add Referring Doctor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Speciality</Label>
                <Input required value={form.speciality} onChange={(e) => setForm({ ...form, speciality: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Clinic Address</Label>
              <Input value={form.clinicAddress} onChange={(e) => setForm({ ...form, clinicAddress: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Contact Number</Label>
                <Input required value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Doctor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
