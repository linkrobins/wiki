<?php

namespace LinkRobins\Wiki\Search;

use Flarum\Search\Database\AbstractSearcher;
use Flarum\User\User;
use Illuminate\Database\Eloquent\Builder;
use LinkRobins\Wiki\Access\WikiAbilities;
use LinkRobins\Wiki\WikiArticle;

/**
 * Searcher for wiki articles. Articles are public, so the only visibility rule
 * concerns soft-deleted rows: editors see them in the list (rendered with a
 * "deleted" treatment) so they can restore or permanently remove them, while
 * everyone else gets the default SoftDeletes scope that hides trashed rows.
 *
 * Mirrors WikiArticleResource::scope, which applies the same rule on Show.
 */
class ArticleSearcher extends AbstractSearcher
{
    public function getQuery(User $actor): Builder
    {
        $query = WikiArticle::query()
            ->select('linkrobins_wiki_articles.*')
            ->withCount('revisions as revision_count');

        if (WikiAbilities::isEditor($actor)) {
            $query->withTrashed();
        }

        return $query;
    }
}
