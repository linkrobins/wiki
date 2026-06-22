<?php

namespace LinkRobins\Wiki\Notification;

use Flarum\Database\AbstractModel;
use Flarum\Locale\TranslatorInterface;
use Flarum\Notification\AlertableInterface;
use Flarum\Notification\Blueprint\BlueprintInterface;
use Flarum\Notification\MailableInterface;
use Flarum\User\User;
use LinkRobins\Wiki\WikiTicket;

/**
 * Notification fired when a new ticket is opened. Goes out to all
 * staff (admins + users with `linkrobins-wiki.handle_tickets`).
 * Staff can opt out per-driver in their notification preferences.
 *
 * Self-notification: if a staff member opens a ticket themselves
 * (rare but possible for testing or for them to track their own
 * issues), the dispatcher excludes them from the recipient list.
 */
class NewWikiTicketBlueprint implements BlueprintInterface, AlertableInterface, MailableInterface
{
    public function __construct(
        public WikiTicket $ticket
    ) {
    }

    public function getFromUser(): ?User
    {
        return $this->ticket->user;
    }

    public function getSubject(): ?AbstractModel
    {
        return $this->ticket;
    }

    public function getData(): array
    {
        return [
            'ticketId' => (int) $this->ticket->id,
            'isAppeal' => $this->ticket->isAppeal(),
        ];
    }

    public function getEmailViews(): array
    {
        return [
            'text' => 'linkrobins-wiki::emails.plain.new_ticket',
            'html' => 'linkrobins-wiki::emails.html.new_ticket',
        ];
    }

    public function getEmailSubject(TranslatorInterface $translator): string
    {
        $key = $this->ticket->isAppeal()
            ? 'linkrobins-wiki.email.new_appeal_subject'
            : 'linkrobins-wiki.email.new_ticket_subject';
        return $translator->trans($key, ['subject' => $this->ticket->subject]);
    }

    public static function getType(): string
    {
        return 'linkrobinsWikiNewTicket';
    }

    public static function getSubjectModel(): string
    {
        return WikiTicket::class;
    }
}
