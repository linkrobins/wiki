<x-mail::html.notification>
    <x-slot:body>
        <p>{{ $translator->trans('linkrobins-wiki.email.new_reply_body', ['name' => $blueprint->getFromUser()?->display_name ?? $translator->trans('linkrobins-wiki.email.from_wiki')]) }}</p>
        <p><strong>{{ $blueprint->reply->ticket?->subject }}</strong></p>
        @if($blueprint->reply->ticket)
            <p><a href="{{ $url->to('forum')->base() . '/wiki/' . $blueprint->reply->ticket->id }}">{{ $translator->trans('linkrobins-wiki.email.view_ticket') }}</a></p>
        @endif
    </x-slot:body>

    <x-slot:preview>
        {!! $blueprint->reply->formatContent() !!}
    </x-slot:preview>
</x-mail::html.notification>
