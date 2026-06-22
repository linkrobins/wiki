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
        'is_appeal',
    ];

    protected $casts = [
        'position'  => 'integer',
        'is_appeal' => 'boolean',
    ];

    public function tickets(): HasMany
    {
        return $this->hasMany(WikiTicket::class, 'category_id');
    }
}
