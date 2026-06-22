<?php

namespace LinkRobins\Wiki\Access;

use Flarum\User\Access\AbstractPolicy;
use Flarum\User\User;
use LinkRobins\Wiki\WikiReply;

/**
 * Per-reply permissions.
 *
 *   update -- staff only (edit content, soft-delete, restore)
 *   delete -- staff only (permanent removal of an already soft-deleted reply)
 *
 * These back the endpoint-level can() gates on WikiReplyResource. The
 * resource's updating()/deleting() hooks keep the same checks as
 * defense-in-depth.
 */
class WikiReplyPolicy extends AbstractPolicy
{
    public function update(User $actor, WikiReply $reply): bool
    {
        return $this->isStaff($actor);
    }

    public function delete(User $actor, WikiReply $reply): bool
    {
        return $this->isStaff($actor);
    }

    protected function isStaff(User $actor): bool
    {
        return WikiAbilities::isStaff($actor);
    }
}
