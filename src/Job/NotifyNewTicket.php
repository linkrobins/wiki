<?php

namespace LinkRobins\Wiki\Job;

use Flarum\Queue\AbstractJob;
use LinkRobins\Wiki\WikiNotifier;
use LinkRobins\Wiki\WikiTicket;

/**
 * Queued: notifies staff of a new ticket off the request thread (the
 * staff-recipient lookup used to run synchronously on every ticket save).
 */
class NotifyNewTicket extends AbstractJob
{
    public function __construct(public readonly int $ticketId)
    {
    }

    public function handle(WikiNotifier $notifier): void
    {
        $ticket = WikiTicket::query()->find($this->ticketId);

        if ($ticket) {
            $notifier->notifyNewTicket($ticket);
        }
    }
}
