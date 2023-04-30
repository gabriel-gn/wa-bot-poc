import {Client} from "@open-wa/wa-automate";
import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {concatMap, from, Observable, of} from "rxjs";

export function passeiDiretoUrlDownload(waClient: Client, message: Message, url: string, enableQuotedMessage: boolean = false): Observable<any> | Observable<never> {
    if (enableQuotedMessage && message?.hasOwnProperty('quotedMsg')) {
        message = message.quotedMsg as Message;
    }

    return from(waClient.reply(message.chatId, `Passei Direto ${url}`, message.id, true));
}