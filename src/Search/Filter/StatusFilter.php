<?php

namespace LinkRobins\Wiki\Search\Filter;

use Flarum\Search\Database\DatabaseSearchState;
use Flarum\Search\Filter\FilterInterface;
use Flarum\Search\SearchState;
use Flarum\Search\ValidateFilterTrait;
use LinkRobins\Wiki\WikiTicket;

/**
 * @implements FilterInterface<DatabaseSearchState>
 */
class StatusFilter implements FilterInterface
{
    use ValidateFilterTrait;

    public function getFilterKey(): string
    {
        return 'status';
    }

    public function filter(SearchState $state, string|array $value, bool $negate): void
    {
        $values = $this->asStringArray($value);
        $valid  = array_values(array_intersect($values, WikiTicket::ALL_STATUSES));
        if (empty($valid)) {
            return;
        }
        $state->getQuery()->whereIn(
            'linkrobins_wiki_tickets.status',
            $valid,
            'and',
            $negate
        );
    }
}
