<?php

use Flarum\Database\Migration;
use Illuminate\Database\Schema\Blueprint;

// One row per saved version of an article. Revisions are immutable history:
// a new row is written each time the title or body changes, capturing the
// snapshot as it stood after that edit.
return Migration::createTableIfNotExists('linkrobins_wiki_revisions', function (Blueprint $table) {
    $table->increments('id');
    $table->integer('article_id')->unsigned();
    $table->integer('user_id')->unsigned()->nullable();
    $table->string('title');
    $table->mediumText('content');
    // Optional one-line note describing what changed in this edit.
    $table->string('summary')->nullable();
    $table->timestamps();

    $table->index('article_id');
    $table->index('user_id');

    $table->foreign('article_id')
        ->references('id')->on('linkrobins_wiki_articles')
        ->cascadeOnDelete();
    $table->foreign('user_id')
        ->references('id')->on('users')
        ->nullOnDelete();
});
