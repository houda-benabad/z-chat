function joinNames(names: string[]): string {
  if (names.length === 0) return 'someone';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/**
 * Resolves the display text for a system event message.
 *
 * @param resolveName  Optional callback: given a userId returns the contact
 *   name (nickname first, then profile name) or phone number for non-contacts,
 *   or null to fall back to the server-snapshotted name.
 */
export function resolveSystemText(
  content: string | null,
  myUserId: string,
  resolveName?: (userId: string) => string | null,
): string {
  if (!content) return 'Group updated';

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return content;
  }

  const resolveActor = (id: unknown, fallback: unknown) => {
    if (id === myUserId) return 'You';
    return resolveName?.(id as string) ?? (fallback as string | null) ?? 'Someone';
  };
  const resolveTarget = (id: unknown, fallback: unknown) => {
    if (id === myUserId) return 'you';
    return resolveName?.(id as string) ?? (fallback as string | null) ?? 'someone';
  };

  const actor = resolveActor(data.actorId, data.actorName);

  switch (data.event) {
    case 'group_created':
      return `${actor} created this group`;

    case 'members_added': {
      const memberIds = (data.memberIds as string[]) ?? [];
      const memberNames = (data.memberNames as (string | null)[]) ?? [];
      const names = memberIds.map((id, i) =>
        id === myUserId ? 'you' : (resolveName?.(id) ?? memberNames[i] ?? 'someone'),
      );
      return `${actor} added ${joinNames(names)}`;
    }

    case 'member_left':
      return `${actor} left`;

    case 'member_removed':
      return `${actor} removed ${resolveTarget(data.targetId, data.targetName)}`;

    case 'name_changed':
      return `${actor} changed the group name to "${(data.newName as string) ?? ''}"`;

    case 'icon_changed':
      return `${actor} changed the group icon`;

    case 'role_updated': {
      const roleLabel = data.role === 'admin' ? 'an admin' : 'a member';
      return `${actor} made ${resolveTarget(data.targetId, data.targetName)} ${roleLabel}`;
    }

    default:
      return (data.text as string | undefined) ?? 'Group updated';
  }
}
