import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const actions = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "STOCK_ADJUST", "ORDER_FINALIZE", "ORDER_VOID"];

const actionTone: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  CREATE: "success",
  UPDATE: "default",
  DELETE: "destructive",
  LOGIN: "secondary",
  LOGOUT: "secondary",
  STOCK_ADJUST: "warning",
  ORDER_FINALIZE: "success",
  ORDER_VOID: "destructive",
};

export default function AuditLogPage() {
  const [action, setAction] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", action],
    queryFn: async () => (await api.get<{ data: AuditLog[] }>("/audit-logs", { params: { action: action || undefined, pageSize: 100 } })).data.data,
  });

  const logs = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Complete trail of sensitive actions across the system." />

      <Select value={action} onValueChange={(v) => setAction(v === "ALL" ? "" : v)}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Filter by action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All actions</SelectItem>
          {actions.map((a) => (
            <SelectItem key={a} value={a}>
              {a.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No audit entries yet" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={actionTone[log.action] ?? "secondary"}>{log.action.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{log.description}</TableCell>
                    <TableCell>{log.user ? `${log.user.name} (${log.user.role})` : "System"}</TableCell>
                    <TableCell className="text-muted-foreground">{log.entity}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
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
