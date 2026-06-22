<?php

namespace LinkRobins\Wiki\Notification;

use Flarum\Database\AbstractModel;
use Flarum\Locale\TranslatorInterface;
use Flarum\Notification\AlertableInterface;
use Flarum\Notification\Blueprint\BlueprintInterface;
use Flarum\Notification\MailableInterface;
use Flarum\User\User;
use LinkRobins\Wiki\WikiReply;
use LinkRobins\Wiki\WikiTicket;

/**
 * Notification fired when a reply is posted on a ticket. The
 * recipient depends on who posted:
 *
 *   - Staff replies to a user-owned ticket  → notify the ticket owner
 *   - User replies to their own ticket      → notify all staff
 *
 * The blueprint itself is direction-agnostic; the dispatching code
 * (WikiReply::created hook) chooses recipients.
 *
 * Internal notes are NEVER turned into notifications. The owner
 * isn't supposed to know they exist, and staff already see them in
 * the staff list. The dispatcher filters internal notes out before
 * constructing this blueprint.
 */
class NewWikiReplyBlueprint implements BlueprintInterface, AlertableInterface, MailableInterface
{
    public function __construct(
        public WikiReply $reply
    ) {
    }

    public function getFromUser(): ?User
    {
        return $this->reply->user;
    }

    public function getSubject(): ?AbstractModel
    {
        return $this->reply->ticket;
    }

    public function getData(): array
    {
        return [
            'replyId' => (int) $this->reply->id,
        ];
    }

    public function getEmailViews(): array
    {
        return [
            'text' => 'linkrobins-wiki::emails.plain.new_reply',
            'html' => 'linkrobins-wiki::emails.html.new_reply',
        ];
    }

    public function getEmailSubject(TranslatorInterface $translator): string
    {
        $ticket = $this->reply->ticket;
        $subject = $ticket ? $ticket->subject : $translator->trans('linkrobins-wiki.email.fallback_ticket');
        return $translator->trans('linkrobins-wiki.email.new_reply_subject', ['subject' => $subject]);
    }

    public static function getType(): string
    {
        return 'linkrobinsWikiNewReply';
    }

    public static function getSubjectModel(): string
    {
        return WikiTicket::class;
    }
}
