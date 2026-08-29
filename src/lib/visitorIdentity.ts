/**
 * Locally cached visitor identity.
 *
 * visitor_devices is readable by admins only (RLS), so anonymous visitors can
 * never read their own row back. We therefore keep a local copy of the contact
 * details the visitor already shared, which lets the auto lead-capture engine
 * know "we know this person" without a DB read.
 */

const KEY = "bt_visitor_identity_v1";

export interface VisitorIdentity {
  name?: string;
  phone: string;
  email?: string;
  city?: string;
  savedAt: number;
}

export function saveVisitorIdentity(identity: Omit<VisitorIdentity, "savedAt">) {
  if (!identity.phone) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...identity, savedAt: Date.now() }));
  } catch {
    /* storage unavailable */
  }
}

export function getVisitorIdentity(): VisitorIdentity | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VisitorIdentity;
    return parsed?.phone ? parsed : null;
  } catch {
    return null;
  }
}
