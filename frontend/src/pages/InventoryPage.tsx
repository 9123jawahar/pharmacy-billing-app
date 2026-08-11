import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, AlertTriangle, PackageX, Pill, MapPin, PlusCircle, MinusCircle } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Drug } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DrugFormDialog } from "@/components/inventory/DrugFormDialog";
import { StockAdjustDialog } from "@/components/inventory/StockAdjustDialog";

type TabKey = "all" | "low-stock" | "expired";

export default function InventoryPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as TabKey) ?? "all";
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [adjustingDrug, setAdjustingDrug] = useState<Drug | null>(null);
  const queryClient = useQueryClient();

  const canManage = user?.role === "ADMIN" || user?.role === "PHARMACIST";

  const listQuery = useQuery({
    queryKey: ["drugs", tab, search],
    queryFn: async () => {
      if (search.trim().length >= 1) {
        return (await api.get<{ data: Drug[] }>("/inventory/search", { params: { q: search } })).data.data;
      }
      if (tab === "low-stock") return (await api.get<{ data: Drug[] }>("/inventory/alerts/low-stock")).data.data;
      if (tab === "expired") return (await api.get<{ data: Drug[] }>("/inventory/alerts/expired", { params: { withinDays: 30 } })).data.data;
      return (await api.get<{ data: Drug[] }>("/inventory", { params: { pageSize: 100 } })).data.data;
    },
  });

  const drugs = listQuery.data ?? [];

  const stats = useMemo(
    () => ({
      total: drugs.length,
    }),
    [drugs]
  );

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["drugs"] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drug Inventory"
        description="Search by brand name, active ingredient, or symptom — substitutes are surfaced automatically."
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditingDrug(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add Drug
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setSearchParams(v === "all" ? {} : { tab: v });
            setSearch("");
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All Drugs</TabsTrigger>
            <TabsTrigger value="low-stock">
              <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
            </TabsTrigger>
            <TabsTrigger value="expired">
              <PackageX className="h-3.5 w-3.5" /> Expired / Expiring
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search “Paracetamol”, “fever”, brand…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {listQuery.isLoading ? (
        <LoadingSpinner label="Loading inventory…" />
      ) : drugs.length === 0 ? (
        <EmptyState icon={Pill} title="No drugs found" description="Try a different search term, or add a new drug to the catalog." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Rack</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drugs.map((drug) => {
                  const expired = new Date(drug.expiryDate) < new Date();
                  const lowStock = drug.stockQuantity <= drug.reorderLevel;
                  return (
                    <TableRow key={drug.id}>
                      <TableCell>
                        <div className="font-medium">{drug.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {drug.genericName}
                          {drug.requiresRx && (
                            <Badge variant="outline" className="ml-2">
                              Rx
                            </Badge>
                          )}
                        </div>
                        {drug.substitutes && drug.substitutes.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Substitutes: {drug.substitutes.map((s) => s.name).join(", ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{drug.batchNumber}</TableCell>
                      <TableCell>
                        <span className={cn("font-medium", lowStock && "text-warning")}>{drug.stockQuantity}</span>
                        {lowStock && <Badge variant="warning" className="ml-2">Low</Badge>}
                      </TableCell>
                      <TableCell>
                        <span className={cn(expired && "font-medium text-destructive")}>{formatDate(drug.expiryDate)}</span>
                        {expired && <Badge variant="destructive" className="ml-2">Expired</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {drug.rackLocation && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {drug.rackLocation}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(drug.sellingPrice)}</TableCell>
                      <TableCell className="text-right">
                        {canManage && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Adjust stock" onClick={() => setAdjustingDrug(drug)}>
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingDrug(drug);
                                setFormOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <DrugFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        drug={editingDrug}
        onSaved={() => {
          refresh();
          toast({ title: editingDrug ? "Drug updated" : "Drug added", description: "Inventory has been refreshed." });
        }}
      />

      <StockAdjustDialog
        drug={adjustingDrug}
        onOpenChange={(open) => !open && setAdjustingDrug(null)}
        onAdjusted={() => {
          refresh();
          toast({ title: "Stock adjusted" });
        }}
      />
    </div>
  );
}

export async function reportInventoryError(err: unknown) {
  toast({ title: "Something went wrong", description: getErrorMessage(err), variant: "destructive" });
}
