import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Cross, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const demoAccounts = [
  { role: "Admin", email: "admin@pharmacy.test", password: "Admin@123" },
  { role: "Pharmacist", email: "pharmacist@pharmacy.test", password: "Pharma@123" },
  { role: "Billing Clerk", email: "clerk@pharmacy.test", password: "Clerk@123" },
];

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-background to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Cross className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">MedStore Pharmacy</h1>
          <p className="text-sm text-muted-foreground">Billing &amp; Management Suite</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the console.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@pharmacy.test" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>

              {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>

            <div className="mt-6 rounded-lg border border-dashed border-border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Demo accounts (after seeding the database)</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {demoAccounts.map((acc) => (
                  <li key={acc.email} className="flex justify-between gap-2">
                    <span className="font-medium text-foreground">{acc.role}</span>
                    <span>
                      {acc.email} / {acc.password}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
