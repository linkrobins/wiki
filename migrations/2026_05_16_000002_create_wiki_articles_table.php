<?php

use Flarum\Database\Migration;
use Illuminate\Database\Schema\Blueprint;

return Migration::createTableIfNotExists('linkrobins_wiki_articles', function (Blueprint $table) {
    $table->increments('id');
    $table->integer('category_id')->unsigned()->nullable();
    $table->integer('user_id')->unsigned()->nullable();
    $table->integer('last_edited_by_user_id')->unsigned()->nullable();
    $table->string('title');
    // Current article body, stored as the formatter's parsed-source
    // representation. Rendered HTML is produced on demand at serialize
    // time, so format extensions (mentions, emoji) apply retroactively.
    $table->mediumText('content');
    // Bumped whenever the title or body changes, so the index can sort by
    // recent activity without joining the revisions table.
    $table->timestamp('last_edited_at')->nullable();
    $table->timestamp('deleted_at')->nullable();
    $table->timestamps();

    $table->index('user_id');
    $table->index('category_id');
    $table->index('last_edited_at');
    $table->index('deleted_at');

    $table->foreign('category_id')
        ->references('id')->on('linkrobins_wiki_categories')
        ->nullOnDelete();
    $table->foreign('user_id')
        ->references('id')->on('users')
        ->nullOnDelete();
    $table->foreign('last_edited_by_user_id')
        ->references('id')->on('users')
        ->nullOnDelete();
});
