<?php

use Flarum\Extend;
use Flarum\Search\Database\DatabaseSearchDriver;
use Flarum\User\Search\UserSearcher;
use Flarum\User\User;
use LinkRobins\Wiki\Access;
use LinkRobins\Wiki\Api\Resource\WikiCategoryResource;
use LinkRobins\Wiki\Api\Resource\WikiReplyResource;
use LinkRobins\Wiki\Api\Resource\WikiTicketResource;
use LinkRobins\Wiki\Notification\NewWikiReplyBlueprint;
use LinkRobins\Wiki\Notification\NewWikiTicketBlueprint;
use LinkRobins\Wiki\Search\Filter as Filters;
use LinkRobins\Wiki\Search\ReplySearcher;
use LinkRobins\Wiki\Search\TicketSearcher;
use LinkRobins\Wiki\WikiCategory;
use LinkRobins\Wiki\WikiReply;
use LinkRobins\Wiki\WikiServiceProvider;
use LinkRobins\Wiki\WikiTicket;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less')
        ->route('/wiki',                       'linkrobins-wiki.index')
        ->route('/wiki/new',                   'linkrobins-wiki.compose')
        ->route('/wiki/status/{status}',       'linkrobins-wiki.filtered')
        ->route('/wiki/{id}',                  'linkrobins-wiki.show'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),

    new Extend\Locales(__DIR__ . '/locale'),

    (new Extend\ApiResource(WikiCategoryResource::class)),
    (new Extend\ApiResource(WikiTicketResource::class)),
    (new Extend\ApiResource(WikiReplyResource::class)),

    (new Extend\Policy())
        ->modelPolicy(WikiTicket::class,   Access\WikiTicketPolicy::class)
        ->modelPolicy(WikiReply::class,    Access\WikiReplyPolicy::class)
        ->modelPolicy(WikiCategory::class, Access\WikiCategoryPolicy::class)
        ->globalPolicy(Access\GlobalPolicy::class),

    (new Extend\ServiceProvider())
        ->register(WikiServiceProvider::class),

    (new Extend\SearchDriver(DatabaseSearchDriver::class))
        ->addSearcher(WikiTicket::class, TicketSearcher::class)
        ->addFilter(TicketSearcher::class, Filters\StatusFilter::class)
        ->addFilter(TicketSearcher::class, Filters\CategoryIdFilter::class)
        ->addFilter(TicketSearcher::class, Filters\MineFilter::class)
        ->addSearcher(WikiReply::class, ReplySearcher::class)
        ->addFilter(ReplySearcher::class, Filters\TicketIdFilter::class)
        // Enables filter[wikiAppealBanned]=1 on the core user list (powers
        // the read-only admin appeal-bans list). Without this the filter was
        // ignored and every user was returned.
        ->addFilter(UserSearcher::class, Filters\AppealBannedFilter::class),

    (new Extend\Notification())
        ->type(NewWikiReplyBlueprint::class,  ['alert', 'email'])
        ->type(NewWikiTicketBlueprint::class, ['alert', 'email']),

    (new Extend\View())
        ->namespace('linkrobins-wiki', __DIR__ . '/views'),

    (new Extend\ApiResource(\Flarum\Api\Resource\UserResource::class))
        ->fields(fn () => [
            \Flarum\Api\Schema\Boolean::make('wikiAppealBanned')
                ->property('wiki_appeal_banned')
                ->writable(function ($model, \Flarum\Api\Context $context) {
                    // Moderators with the permission (and admins, who have all
                    // permissions) can toggle a user's appeal-ban from the
                    // user's profile controls.
                    return $context->getActor()->hasPermission('linkrobins-wiki.manage_appeal_bans');
                })
                ->visible(function ($model, \Flarum\Api\Context $context) {
                    $actor = $context->getActor();
                    if ($actor->isGuest()) return false;
                    return $actor->hasPermission('linkrobins-wiki.manage_appeal_bans')
                        || (int) $actor->id === (int) $model->id;
                }),
        ]),

    (new Extend\ApiResource(\Flarum\Api\Resource\ForumResource::class))
        ->fields(fn () => [
            // Whether the current user may toggle appeal-bans (shown as a
            // control in the user's profile dropdown). Admins always pass.
            \Flarum\Api\Schema\Boolean::make('canManageWikiAppealBans')
                ->get(fn ($model, \Flarum\Api\Context $context) =>
                    ! $context->getActor()->isGuest()
                    && $context->getActor()->hasPermission('linkrobins-wiki.manage_appeal_bans')),

            \Flarum\Api\Schema\Boolean::make('canCreateWikiTicket')
                ->get(function ($model, \Flarum\Api\Context $context) {
                    $actor = $context->getActor();
                    if ($actor->isGuest()) {
                        return false;
                    }
                    // A policy can() shouldn't throw under normal operation;
                    // if it somehow does, degrade to false rather than 500 the
                    // forum boot payload (this field ships on every forum
                    // response). Mirrors the wikiAppealBanned/wikiSuspended
                    // probes below -- no logger resolve() in the field closure.
                    try {
                        return $actor->can('createTicket');
                    } catch (\Throwable $e) {
                        return false;
                    }
                }),

            \Flarum\Api\Schema\Boolean::make('canHandleWikiTickets')
                ->get(function ($model, \Flarum\Api\Context $context) {
                    $actor = $context->getActor();
                    if ($actor->isGuest()) {
                        return false;
                    }
                    try {
                        return $actor->can('handleTickets');
                    } catch (\Throwable $e) {
                        return false;
                    }
                }),

            \Flarum\Api\Schema\Boolean::make('wikiAppealBanned')
                ->get(function ($model, \Flarum\Api\Context $context) {
                    $actor = $context->getActor();
                    if ($actor->isGuest()) {
                        return false;
                    }
                    try {
                        return (bool) $actor->getAttribute('wiki_appeal_banned');
                    } catch (\Throwable $e) {
                        return false;
                    }
                }),

            \Flarum\Api\Schema\Boolean::make('wikiSuspended')
                ->get(function ($model, \Flarum\Api\Context $context) {
                    $actor = $context->getActor();
                    if ($actor->isGuest()) {
                        return false;
                    }
                    try {
                        return \LinkRobins\Wiki\UserState::isSuspended($actor);
                    } catch (\Throwable $e) {
                        return false;
                    }
                }),
        ]),

    (new Extend\Settings())
        ->default('linkrobins-wiki.appeal_limit_per_window',    '3')
        ->default('linkrobins-wiki.appeal_window_days',         '30')
        ->default('linkrobins-wiki.appeal_max_concurrent_open', '1')
        ->default('linkrobins-wiki.general_limit_per_window',   '10')
        ->default('linkrobins-wiki.general_window_hours',       '24'),
        // Note: these settings are consumed server-side by RateLimiter; they
        // are intentionally NOT serialized to the forum frontend (the JS never
        // reads them).
];
