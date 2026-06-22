<?php

namespace LinkRobins\Wiki\Search;

use Flarum\Search\Database\AbstractSearcher;
use Flarum\User\User;
use Illuminate\Database\Eloquent\Builder;
use LinkRobins\Wiki\Access\WikiAbilities;
use LinkRobins\Wiki\WikiReply;

/**
 * Searcher for wiki replies. Applies the same visibility rules as
 * the resource scope: guests see nothing; non-staff users see only
 * non-internal replies on tickets they own; staff sees everything.
 */
class ReplySearcher extends AbstractSearcher
{
    public function getQuery(User $actor): Builder
    {
        $query = WikiReply::query()->select('linkrobins_wiki_replies.*');

        if ($actor->isGuest()) {
            $query->whereRaw('1 = 0');
            return $query;
        }

        if (WikiAbilities::isStaff($actor)) {
            // Staff see soft-deleted replies in the index so they can
            // restore or force-delete them from the ticket detail
            // page. Non-staff get the default SoftDeletes scope which
            // hides trashed rows.
            $query->withTrashed();
            return $query;
        }

        return $query->whereHas('ticket', function ($q) use ($actor) {
            $q->where('user_id', (int) $actor->id);
        })->where('linkrobins_wiki_replies.is_internal_note', false);
    }
}
