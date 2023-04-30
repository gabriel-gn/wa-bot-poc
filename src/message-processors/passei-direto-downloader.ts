import {Client} from "@open-wa/wa-automate";
import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {delay, from, Observable} from "rxjs";

export function passeiDiretoUrlDownload(waClient: Client, message: Message, url: string, enableQuotedMessage: boolean = false): Observable<any> | Observable<never> {
    if (enableQuotedMessage && message?.hasOwnProperty('quotedMsg')) {
        message = message.quotedMsg as Message;
    }

    return from(waClient.reply(message.chatId, `Passei Direto ${url.substr(url.lastIndexOf('/') + 1)}`, message.id, true))
        // .pipe(delay(10000));
}