<?php

namespace LinkRobins\Wiki\Job;

use Flarum\Queue\AbstractJob;
use LinkRobins\Wiki\WikiNotifier;
use LinkRobins\Wiki\WikiReply;

/**
 * Queued: sends the new-reply notification off the request thread (the
 * staff-recipient lookup used to run synchronously on every reply post).
 */
class NotifyNewReply extends AbstractJob
{
    public function __construct(public readonly int $replyId)
    {
    }

    public function handle(WikiNotifier $notifier): void
    {
        $reply = WikiReply::query()->find($this->replyId);

        if ($reply) {
            $notifier->notifyNewReply($reply);
        }
    }
}
