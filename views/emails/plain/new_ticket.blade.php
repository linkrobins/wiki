<x-mail::plain.notification>
<x-slot:body>
{{ $translator->trans('linkrobins-wiki.email.new_ticket_body', ['type' => $blueprint->ticket->isAppeal() ? $translator->trans('linkrobins-wiki.email.ticket_type_appeal') : $translator->trans('linkrobins-wiki.email.ticket_type_general'), 'name' => $blueprint->getFromUser()?->display_name ?? $translator->trans('linkrobins-wiki.email.from_a_user')]) }}

  {{ $blueprint->ticket->subject }}

{{ $translator->trans('linkrobins-wiki.email.open_ticket') }}: {{ $url->to('forum')->base() . '/wiki/' . $blueprint->ticket->id }}
</x-slot:body>
</x-mail::plain.notification>
