'use client';

import { useSession } from '@/entities/session';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Card, CardContent } from '@/shared/ui/card';
import { formatDate } from '@/shared/lib/format';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** No fetch of its own — RequireAuth has already refreshed the session. */
export function UserProfileCard() {
  const { user } = useSession();

  if (!user) return null;

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {user.currency} · з нами з {formatDate(user.createdAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
