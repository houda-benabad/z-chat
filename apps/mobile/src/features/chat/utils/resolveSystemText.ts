function joinNames(names: string[]): string {
  if (names.length === 0) return 'someone';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function resolveSystemText(content: string | null, myUserId: string): string {
  if (!content) return 'Group updated';

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return content;
  }

  const actor = data.actorId === myUserId ? 'You' : ((data.actorName as string | null) ?? 'Someone');

  switch (data.event) {
    case 'group_created':
      return `${actor} created this group`;

    case 'members_added': {
      const memberIds = (data.memberIds as string[]) ?? [];
      const memberNames = (data.memberNames as (string | null)[]) ?? [];
      const names = memberIds.map((id, i) =>
        id === myUserId ? 'you' : (memberNames[i] ?? 'someone'),
      );
      return `${actor} added ${joinNames(names)}`;
    }

    case 'member_left':
      return `${actor} left`;

    case 'member_removed': {
      const target = data.targetId === myUserId ? 'you' : ((data.targetName as string | null) ?? 'someone');
      return `${actor} removed ${target}`;
    }

    case 'name_changed':
      return `${actor} changed the group name to "${(data.newName as string) ?? ''}"`;

    case 'icon_changed':
      return `${actor} changed the group icon`;

    case 'role_updated': {
      const target = data.targetId === myUserId ? 'you' : ((data.targetName as string | null) ?? 'someone');
      const roleLabel = data.role === 'admin' ? 'an admin' : 'a member';
      return `${actor} made ${target} ${roleLabel}`;
    }

    default:
      return (data.text as string | undefined) ?? 'Group updated';
  }
}
