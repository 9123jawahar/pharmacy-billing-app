import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import type { Drug } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export function StockAdjustDialog({
  drug,
  onOpenChange,
  onAdjusted,
}: {
  drug: Drug | null;
  onOpenChange: (open: boolean) => void;
  onAdjusted: () => void;
}) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!drug) return;
    setSubmitting(true);
    try {
      await api.post(`/inventory/${drug.id}/stock-adjustment`, { delta: Number(delta), reason });
      setDelta("");
      setReason("");
      onOpenChange(false);
      onAdjusted();
    } catch (err) {
      toast({ title: "Adjustment failed", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!drug} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>{drug?.name} — current stock: {drug?.stockQuantity}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Adjustment (use negative to remove, e.g. -5)</Label>
            <Input type="number" required value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. 50 or -5" />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="New stock received, damaged goods, recount…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
