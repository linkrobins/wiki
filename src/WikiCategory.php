<?php

namespace LinkRobins\Wiki;

use Flarum\Database\AbstractModel;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WikiCategory extends AbstractModel
{
    protected $table = 'linkrobins_wiki_categories';

    public $timestamps = true;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'color',
        'icon',
        'position',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    public function articles(): HasMany
    {
        return $this->hasMany(WikiArticle::class, 'category_id');
    }
}
