import type { Message, Part, Permission } from '@opencode-ai/sdk/client';
import type { ChatMessage, PendingPermission } from './opencode-types';

/**
 * Updates or appends a part within the messages array.
 * When `createPlaceholder` is true, a placeholder message is created if the
 * part's messageID doesn't exist yet (used by use-chat for early-arriving parts).
 */
export function updateMessagePart(
  messages: ChatMessage[],
  part: Part,
  opts?: { createPlaceholder?: boolean },
): ChatMessage[] {
  const msgIdx = messages.findIndex((m) => m.info.id === part.messageID);
  if (msgIdx === -1) {
    if (opts?.createPlaceholder) {
      return [
        ...messages,
        {
          info: { id: part.messageID, role: 'assistant' } as Message,
          parts: [part],
        },
      ];
    }
    return messages;
  }
  const msg = messages[msgIdx];
  const partIdx = msg.parts.findIndex((p) => p.id === part.id);
  const updatedParts =
    partIdx === -1 ? [...msg.parts, part] : msg.parts.map((p, i) => (i === partIdx ? part : p));
  return messages.map((m, i) => (i === msgIdx ? { ...m, parts: updatedParts } : m));
}

export function removeMessagePart(
  messages: ChatMessage[],
  messageID: string,
  partID: string,
): ChatMessage[] {
  return messages.map((m) =>
    m.info.id === messageID ? { ...m, parts: m.parts.filter((p) => p.id !== partID) } : m,
  );
}

export function updateMessage(messages: ChatMessage[], info: Message): ChatMessage[] {
  const idx = messages.findIndex((m) => m.info.id === info.id);
  if (idx === -1) return [...messages, { info, parts: [] }];
  return messages.map((m, i) => (i === idx ? { ...m, info } : m));
}

export function removeMessage(messages: ChatMessage[], messageID: string): ChatMessage[] {
  return messages.filter((m) => m.info.id !== messageID);
}

export function addPermission(
  permissions: PendingPermission[],
  permission: Permission,
): PendingPermission[] {
  if (permissions.some((p) => p.permission.id === permission.id)) return permissions;
  return [...permissions, { permission, responding: false }];
}

export function removePermission(
  permissions: PendingPermission[],
  permissionID: string,
): PendingPermission[] {
  return permissions.filter((p) => p.permission.id !== permissionID);
}

export function extractSessionError(errorProps: Record<string, unknown>): string | null {
  const errData = errorProps.error as { name?: string; data?: { message?: string } } | undefined;
  if (errData && 'data' in errData) {
    const data = errData.data as { message?: string } | undefined;
    return `${errData.name}: ${data?.message ?? 'Unknown error'}`;
  }
  return null;
}
