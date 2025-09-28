import { readClientFromClientMemberID } from "../client/client-members";

// Normalize a supplied id that could be either a client.id or a client member.id into a client id.
// If lookup fails or id already is a client id, just return the original.
export async function resolveClientId(id: string | null | undefined): Promise<string> {
     if (!id) return '';
     try {
          const { data } = await readClientFromClientMemberID(id);
          return data?.id || id; // data?.id present only when provided id was a member id
     } catch {
          return id;
     }
}
