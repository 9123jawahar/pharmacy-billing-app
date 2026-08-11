import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Customer, Drug } from "@/types";

export interface CartLine {
  drug: Drug;
  quantity: number;
}

export interface DraftBill {
  id: string;
  cart: CartLine[];
  customer: Customer | null;
  doctorId: string;
  couponCode: string;
  couponResult: { discount: number } | null;
  loyaltyPoints: string;
  paymentMethod: string;
}

function makeId() {
  return `bill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyBill(id: string): DraftBill {
  return { id, cart: [], customer: null, doctorId: "", couponCode: "", couponResult: null, loyaltyPoints: "0", paymentMethod: "CASH" };
}

interface StoredState {
  bills: DraftBill[];
  activeBillId: string;
}

// Kept in sessionStorage (not localStorage) so in-progress bills survive
// navigating away/back or an accidental reload within the same tab, but
// don't linger indefinitely with stale prices/stock across days.
const STORAGE_KEY = "pharmacy-billing-drafts";

function loadInitial(): StoredState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredState;
      if (parsed.bills?.length && parsed.bills.some((b) => b.id === parsed.activeBillId)) return parsed;
    }
  } catch {
    // corrupt/unavailable storage - fall through to a fresh single bill
  }
  const bill = emptyBill(makeId());
  return { bills: [bill], activeBillId: bill.id };
}

interface BillingDraftsContextValue {
  bills: DraftBill[];
  activeBillId: string;
  activeBill: DraftBill;
  setActiveBillId: (id: string) => void;
  addBill: () => void;
  closeBill: (id: string) => void;
  updateActiveBill: (patch: Partial<DraftBill>) => void;
}

const BillingDraftsContext = createContext<BillingDraftsContextValue | null>(null);

export function BillingDraftsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(loadInitial);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeBill = state.bills.find((b) => b.id === state.activeBillId) ?? state.bills[0];

  function setActiveBillId(id: string) {
    setState((s) => ({ ...s, activeBillId: id }));
  }

  function addBill() {
    const bill = emptyBill(makeId());
    setState((s) => ({ bills: [...s.bills, bill], activeBillId: bill.id }));
  }

  function closeBill(id: string) {
    setState((s) => {
      const remaining = s.bills.filter((b) => b.id !== id);
      if (remaining.length === 0) {
        const fresh = emptyBill(makeId());
        return { bills: [fresh], activeBillId: fresh.id };
      }
      return { bills: remaining, activeBillId: s.activeBillId === id ? remaining[0].id : s.activeBillId };
    });
  }

  function updateActiveBill(patch: Partial<DraftBill>) {
    setState((s) => ({ ...s, bills: s.bills.map((b) => (b.id === s.activeBillId ? { ...b, ...patch } : b)) }));
  }

  return (
    <BillingDraftsContext.Provider
      value={{ bills: state.bills, activeBillId: state.activeBillId, activeBill, setActiveBillId, addBill, closeBill, updateActiveBill }}
    >
      {children}
    </BillingDraftsContext.Provider>
  );
}

export function useBillingDrafts() {
  const ctx = useContext(BillingDraftsContext);
  if (!ctx) throw new Error("useBillingDrafts must be used within BillingDraftsProvider");
  return ctx;
}
