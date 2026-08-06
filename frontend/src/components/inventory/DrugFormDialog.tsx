import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import type { Drug, Supplier } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drug: Drug | null;
  onSaved: () => void;
}

const emptyForm = {
  name: "",
  genericName: "",
  composition: "",
  symptoms: "",
  manufacturer: "",
  category: "",
  batchNumber: "",
  supplierId: "",
  stockQuantity: "0",
  reorderLevel: "10",
  costPrice: "",
  sellingPrice: "",
  gstPercent: "12",
  expiryDate: "",
  rackLocation: "",
  requiresRx: false,
};

export function DrugFormDialog({ open, onOpenChange, drug, onSaved }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await api.get<{ data: Supplier[] }>("/inventory/suppliers")).data.data,
    enabled: open,
  });

  useEffect(() => {
    if (drug) {
      setForm({
        name: drug.name,
        genericName: drug.genericName,
        composition: drug.composition ?? "",
        symptoms: drug.symptoms.join(", "),
        manufacturer: drug.manufacturer ?? "",
        category: drug.category ?? "",
        batchNumber: drug.batchNumber,
        supplierId: drug.supplierId,
        stockQuantity: String(drug.stockQuantity),
        reorderLevel: String(drug.reorderLevel),
        costPrice: drug.costPrice,
        sellingPrice: drug.sellingPrice,
        gstPercent: drug.gstPercent,
        expiryDate: drug.expiryDate.slice(0, 10),
        rackLocation: drug.rackLocation ?? "",
        requiresRx: drug.requiresRx,
      });
    } else {
      setForm(emptyForm);
    }
  }, [drug, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        genericName: form.genericName,
        composition: form.composition || undefined,
        symptoms: form.symptoms
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
        manufacturer: form.manufacturer || undefined,
        category: form.category || undefined,
        batchNumber: form.batchNumber,
        supplierId: form.supplierId,
        stockQuantity: Number(form.stockQuantity),
        reorderLevel: Number(form.reorderLevel),
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        gstPercent: Number(form.gstPercent),
        expiryDate: form.expiryDate,
        rackLocation: form.rackLocation || undefined,
        requiresRx: form.requiresRx,
      };

      if (drug) {
        await api.patch(`/inventory/${drug.id}`, payload);
      } else {
        await api.post("/inventory", payload);
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast({ title: "Could not save drug", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{drug ? "Edit Drug" : "Add Drug"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Brand Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Generic / Active Ingredient</Label>
              <Input required value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Composition</Label>
            <Input value={form.composition} onChange={(e) => setForm({ ...form, composition: e.target.value })} placeholder="e.g. Paracetamol 500mg" />
          </div>

          <div className="space-y-1.5">
            <Label>Symptoms (comma-separated, powers smart search)</Label>
            <Textarea rows={2} value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} placeholder="fever, headache, body pain" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Manufacturer</Label>
              <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Analgesic, Antibiotic…" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Batch Number</Label>
              <Input required value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rack / Shelf Location</Label>
              <Input value={form.rackLocation} onChange={(e) => setForm({ ...form, rackLocation: e.target.value })} placeholder="A-01-2" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Stock Qty</Label>
              <Input type="number" min={0} required value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Reorder Level</Label>
              <Input type="number" min={0} required value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Cost Price (₹)</Label>
              <Input type="number" min={0} step="0.01" required value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Selling Price (₹)</Label>
              <Input type="number" min={0} step="0.01" required value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>GST %</Label>
              <Input type="number" min={0} max={100} step="0.01" required value={form.gstPercent} onChange={(e) => setForm({ ...form, gstPercent: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input type="date" required value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="flex items-end gap-2 pb-1.5">
              <Switch checked={form.requiresRx} onCheckedChange={(v) => setForm({ ...form, requiresRx: v })} id="requiresRx" />
              <Label htmlFor="requiresRx">Requires prescription</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !form.supplierId}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {drug ? "Save Changes" : "Add Drug"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
