<?php

namespace LinkRobins\Wiki\Search\Filter;

use Flarum\Search\Database\DatabaseSearchState;
use Flarum\Search\Filter\FilterInterface;
use Flarum\Search\SearchState;
use Flarum\Search\ValidateFilterTrait;

/**
 * `filter[articleId]=N` narrows a revision listing to a single article. The
 * article history view always sends this; without it the revision list would
 * return every revision across all articles.
 *
 * @implements FilterInterface<DatabaseSearchState>
 */
class ArticleIdFilter implements FilterInterface
{
    use ValidateFilterTrait;

    public function getFilterKey(): string
    {
        return 'articleId';
    }

    public function filter(SearchState $state, string|array $value, bool $negate): void
    {
        $ids = $this->asIntArray($value);
        if (empty($ids)) {
            return;
        }
        $state->getQuery()->whereIn(
            'linkrobins_wiki_revisions.article_id',
            $ids,
            'and',
            $negate
        );
    }
}
