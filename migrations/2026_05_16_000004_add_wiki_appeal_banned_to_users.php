<?php

use Flarum\Database\Migration;

// A plain boolean column with no index or foreign key, so the columns-only
// addColumns/dropColumns helpers fit cleanly. (No ->after(): column placement
// is MySQL-only syntax and ordering is irrelevant, so this stays portable.)
return Migration::addColumns('users', [
    'wiki_appeal_banned' => ['boolean', 'default' => false],
]);
