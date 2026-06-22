<x-mail::html.notification>
    <x-slot:body>
        <p>
            {{ $translator->trans('linkrobins-wiki.email.new_ticket_body', [
                'type' => $blueprint->ticket->isAppeal()
                    ? $translator->trans('linkrobins-wiki.email.ticket_type_appeal')
                    : $translator->trans('linkrobins-wiki.email.ticket_type_general'),
                'name' => $blueprint->getFromUser()?->display_name ?? $translator->trans('linkrobins-wiki.email.from_a_user'),
            ]) }}
        </p>
        <p><strong>{{ $blueprint->ticket->subject }}</strong></p>
        <p><a href="{{ $url->to('forum')->base() . '/wiki/' . $blueprint->ticket->id }}">{{ $translator->trans('linkrobins-wiki.email.open_ticket') }}</a></p>
    </x-slot:body>

    <x-slot:preview>
        {{ $blueprint->ticket->subject }}
    </x-slot:preview>
</x-mail::html.notification>
