import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminStatus = {
  user_id: string | null;
  email: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
  request_status: "pending" | "approved" | "rejected" | "revoked" | null;
};

export type AdminRequest = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected" | "revoked";
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
};

export type AdminRow = {
  user_id: string;
  email: string;
  role: string;
  is_super: boolean;
  granted_at: string;
};

export type CustomerRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  orders_count: number;
  total_spent_da: number;
};

export type AuditRow = {
  id: string;
  actor_email: string | null;
  action: string;
  target_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export const adminStatusQuery = queryOptions({
  queryKey: ["admin_status"],
  queryFn: async (): Promise<AdminStatus> => {
    const { data, error } = await supabase.rpc("my_admin_status");
    if (error) throw error;
    return data as unknown as AdminStatus;
  },
});

export const adminRequestsQuery = queryOptions({
  queryKey: ["admin_requests"],
  queryFn: async (): Promise<AdminRequest[]> => {
    const { data, error } = await supabase
      .from("admin_requests")
      .select("id,user_id,email,full_name,message,status,created_at,decided_at,decision_note")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as AdminRequest[];
  },
});

export const adminsQuery = queryOptions({
  queryKey: ["admins"],
  queryFn: async (): Promise<AdminRow[]> => {
    const { data, error } = await supabase.rpc("list_admins");
    if (error) throw error;
    return (data ?? []) as unknown as AdminRow[];
  },
});

export const customersQuery = queryOptions({
  queryKey: ["customers"],
  queryFn: async (): Promise<CustomerRow[]> => {
    const { data, error } = await supabase.rpc("list_customers");
    if (error) throw error;
    return (data ?? []) as unknown as CustomerRow[];
  },
});

export const auditQuery = queryOptions({
  queryKey: ["admin_audit_log"],
  queryFn: async (): Promise<AuditRow[]> => {
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("id,actor_email,action,target_email,details,created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return (data ?? []) as unknown as AuditRow[];
  },
});

export const ACTION_LABEL: Record<string, string> = {
  request_created: "Demande envoyée",
  request_approved: "Demande approuvée",
  request_rejected: "Demande refusée",
  admin_revoked: "Accès administrateur retiré",
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
  revoked: "Révoquée",
};

export function friendlyAdminError(message: string): string {
  const map: Record<string, string> = {
    FORBIDDEN: "Action réservée au super administrateur.",
    NOT_AUTHENTICATED: "Vous devez être connecté.",
    EMAIL_NOT_VERIFIED: "Confirmez d'abord votre adresse e-mail.",
    ALREADY_ADMIN: "Vous avez déjà un accès administrateur.",
    REQUEST_PENDING: "Votre demande est déjà en attente de validation.",
    REQUEST_NOT_FOUND: "Demande introuvable.",
    REQUEST_NOT_PENDING: "Cette demande a déjà été traitée.",
    CANNOT_APPROVE_OWN_REQUEST: "Vous ne pouvez pas approuver votre propre demande.",
    CANNOT_DECIDE_OWN_REQUEST: "Vous ne pouvez pas traiter votre propre demande.",
    CANNOT_REVOKE_SELF: "Vous ne pouvez pas retirer votre propre accès.",
    CANNOT_REVOKE_SUPER_ADMIN: "Le super administrateur ne peut pas être retiré.",
  };
  const key = Object.keys(map).find((k) => message.includes(k));
  return key ? (map[key] as string) : message;
}
