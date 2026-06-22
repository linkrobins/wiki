<?php

namespace LinkRobins\Wiki\Search;

use Flarum\Search\Database\AbstractSearcher;
use Flarum\User\User;
use Illuminate\Database\Eloquent\Builder;
use LinkRobins\Wiki\Access\WikiAbilities;
use LinkRobins\Wiki\WikiRevision;

/**
 * Searcher for article revisions (the history list). Revisions are public,
 * scoped to their article via the articleId filter. Revisions of a
 * soft-deleted article stay visible only to editors, matching ArticleSearcher.
 */
class RevisionSearcher extends AbstractSearcher
{
    public function getQuery(User $actor): Builder
    {
        $query = WikiRevision::query()->select('linkrobins_wiki_revisions.*');

        if (! WikiAbilities::isEditor($actor)) {
            $query->whereHas('article');
        }

        return $query;
    }
}
