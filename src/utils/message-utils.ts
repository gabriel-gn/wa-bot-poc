import {catchError, concatMap, from, isObservable, map, Observable, of} from "rxjs";
import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {Client} from "@open-wa/wa-automate";
import {ChatId, ContactId} from "@open-wa/wa-automate/dist/api/model/aliases";
import * as _ from "lodash";

export function proccessMessage(
    waClient: Client,
    message$: Observable<Message> | Message,
    messageFunction: (...args: any[]) => Observable<any>,
    aditionalArgs: any[] = []
): void {
    if (isObservable(message$) === false) {
        message$ = of(message$) as Observable<Message>;
    }

    (message$ as Observable<Message>).pipe(
        concatMap((message: Message) => {
            return of('').pipe(
                concatMap(() => from(waClient.react(message?.id, "🔄"))),
                concatMap(() => messageFunction(waClient, message, ...aditionalArgs)),
                concatMap(() => from(waClient.react(message?.id, "✅"))),
                catchError(error => { return from(waClient.react(message.id, "❌")); }),
            )
        }),
    ).subscribe();
}

export function getChatMessage(waClient: Client, chatId: ChatId, messageIndex: number = 0): Observable<Message> {
    return of('').pipe(
        concatMap(() => {
            // return from(waClient.loadEarlierMessagesTillDate(chatId as ContactId, Math.floor(+(new Date()) / 1000) - (60 * 60 * 24 * 30)))
            return from(waClient.loadAllEarlierMessages(chatId as ContactId))
                .pipe(
                    concatMap(() => {
                        return from(waClient.getAllMessagesInChat(chatId, true, true))
                    }),
                );
        }),
        map(chatMessages => {
            let messageToGet;
            try {
                messageToGet = _.reverse(chatMessages)[messageIndex];
            } catch (e) {
                console.error('Lista de mensagens vazia!')
            }
            return messageToGet;
        }),
    ) as unknown as Observable<Message>;
}
