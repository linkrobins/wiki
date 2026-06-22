<?php

namespace LinkRobins\Wiki;

use Flarum\Database\AbstractModel;
use Flarum\Formatter\Formattable;
use Flarum\Formatter\HasFormattedContent;
use Flarum\User\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An immutable snapshot of an article's title and body, written each time the
 * article is edited. Revisions are never updated or deleted directly; they are
 * created by the article save hook and removed only when their article is.
 *
 * The trait gives us formatContent() so the history view can render an old
 * version's HTML the same way the live article is rendered.
 */
class WikiRevision extends AbstractModel implements Formattable
{
    use HasFormattedContent;

    protected $table = 'linkrobins_wiki_revisions';

    public $timestamps = true;

    public function article(): BelongsTo
    {
        return $this->belongsTo(WikiArticle::class, 'article_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
