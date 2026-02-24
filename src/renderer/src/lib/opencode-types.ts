import type { Message, Part, Permission } from '@opencode-ai/sdk/client';

export interface ChatMessage {
  info: Message;
  parts: Part[];
}

export interface PendingPermission {
  permission: Permission;
  responding: boolean;
}
