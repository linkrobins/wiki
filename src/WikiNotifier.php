<?php

namespace LinkRobins\Wiki;

use Flarum\Group\Group;
use Flarum\Notification\NotificationSyncer;
use Flarum\User\User;
use LinkRobins\Wiki\Access\WikiAbilities;
use LinkRobins\Wiki\Notification\NewWikiReplyBlueprint;
use LinkRobins\Wiki\Notification\NewWikiTicketBlueprint;
use Psr\Log\LoggerInterface;

/**
 * Builds recipient lists and sends wiki notifications.
 *
 * Instance-based with its dependencies injected (no static methods, no
 * resolve()). Invoked from queued jobs (NotifyNewReply / NotifyNewTicket)
 * so the staff lookup never runs synchronously on the request that saved
 * the ticket or reply.
 */
class WikiNotifier
{
    public function __construct(
        protected NotificationSyncer $syncer,
        protected LoggerInterface $log,
    ) {
    }

    /**
     * New-reply notification (user-facing replies only):
     *   - staff reply on a user's ticket  → notify the owner
     *   - user reply on their own ticket   → notify all staff
     *   - staff reply on their own ticket  → notify other staff (admin testing)
     */
    public function notifyNewReply(WikiReply $reply): void
    {
        $ticket = $reply->ticket;
        if (! $ticket || $reply->is_internal_note) {
            return;
        }

        $authorIsStaff = $this->isStaff($reply->user);

        if (! $authorIsStaff) {
            $recipients = $this->staffRecipients($reply->user_id);
        } elseif ($ticket->user) {
            $recipients = ((int) $ticket->user_id === (int) $reply->user_id)
                ? $this->staffRecipients($reply->user_id)
                : [$ticket->user];
        } else {
            $recipients = $this->staffRecipients($reply->user_id);
        }

        if (! empty($recipients)) {
            $this->trySync(new NewWikiReplyBlueprint($reply), $recipients, 'reply');
        }
    }

    /** New-ticket notification to all staff, excluding the submitter. */
    public function notifyNewTicket(WikiTicket $ticket): void
    {
        $recipients = $this->staffRecipients($ticket->user_id);
        if (! empty($recipients)) {
            $this->trySync(new NewWikiTicketBlueprint($ticket), $recipients, 'ticket');
        }
    }

    /**
     * Sync with isolated error handling: alerts are written before emails
     * are sent, so an email-send failure still leaves the bell-icon alert.
     * We distinguish mailer failures from genuine sync bugs in the log.
     */
    protected function trySync($blueprint, array $recipients, string $kind): void
    {
        // Respect each recipient's notification preference. Flarum's alert
        // driver creates the bell-icon alert for EVERY recipient passed to
        // sync() (only the email driver filters, by shouldEmail), so we must
        // drop users here who have switched this notification off in their
        // /settings -- otherwise it can't be suppressed.
        $type = $blueprint::getType();
        $recipients = array_values(array_filter(
            $recipients,
            fn ($user) => $user->shouldAlert($type) || $user->shouldEmail($type)
        ));

        if (empty($recipients)) {
            return;
        }

        try {
            $this->syncer->sync($blueprint, $recipients);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            $isMailerError = stripos($msg, 'sendmail') !== false
                || stripos($msg, 'smtp') !== false
                || stripos($msg, 'mailer') !== false
                || stripos($msg, 'mail server') !== false;

            $this->log->warning($isMailerError
                ? "[linkrobins/wiki] {$kind} notification stored, but email send failed: {$msg}"
                : "[linkrobins/wiki] {$kind} notification sync failed: {$msg}");
        }
    }

    /**
     * Staff = admin-group members + users holding the handle_tickets
     * permission via any group.
     *
     * @return User[]
     */
    protected function staffRecipients(?int $exceptId = null): array
    {
        try {
            $query = User::query()->where(function ($q) {
                $q->whereHas('groups', function ($q) {
                    $q->where('groups.id', Group::ADMINISTRATOR_ID);
                })->orWhereHas('groups', function ($q) {
                    $q->whereIn('groups.id', function ($sub) {
                        $sub->select('group_id')
                            ->from('group_permission')
                            ->where('permission', WikiAbilities::HANDLE_TICKETS);
                    });
                });
            });

            if ($exceptId !== null) {
                $query->where('id', '!=', $exceptId);
            }

            return $query->distinct()->get()->all();
        } catch (\Throwable $e) {
            $this->log->warning('[linkrobins/wiki] staffRecipients failed', ['exception' => $e]);

            return [];
        }
    }

    protected function isStaff(?User $user): bool
    {
        return $user !== null && WikiAbilities::isStaff($user);
    }
}
