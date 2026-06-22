<?php

namespace LinkRobins\Wiki;

use Flarum\Database\AbstractModel;
use Flarum\Formatter\Formattable;
use Flarum\Formatter\HasFormattedContent;
use Flarum\User\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WikiArticle extends AbstractModel implements Formattable
{
    use HasFormattedContent;
    use SoftDeletes;

    protected $table = 'linkrobins_wiki_articles';

    public $timestamps = true;

    // user_id (the author) and last_edited_by_user_id are set by the resource
    // controller, never by mass assignment. title and content are the only
    // attributes the client controls directly.
    protected $fillable = [
        'title',
        'content',
    ];

    protected $casts = [
        'last_edited_at' => 'datetime',
    ];

    protected $dates = [
        'deleted_at',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(WikiCategory::class, 'category_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function lastEditedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_edited_by_user_id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(WikiRevision::class, 'article_id');
    }
}
