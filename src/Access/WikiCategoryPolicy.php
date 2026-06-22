<?php

namespace LinkRobins\Wiki\Access;

use Flarum\User\Access\AbstractPolicy;
use Flarum\User\User;
use LinkRobins\Wiki\WikiCategory;

class WikiCategoryPolicy extends AbstractPolicy
{
    public function view(User $actor, WikiCategory $category): bool
    {
        return true;
    }

    public function edit(User $actor, WikiCategory $category): bool
    {
        return $actor->isAdmin();
    }

    public function delete(User $actor, WikiCategory $category): bool
    {
        return $actor->isAdmin();
    }
}
