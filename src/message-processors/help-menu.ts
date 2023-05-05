import {Client} from "@open-wa/wa-automate";
import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {from, Observable} from "rxjs";
import {msgProcessors} from "../message.routing";

export function helpMenu(waClient: Client, message: Message, enableQuotedMessage: boolean = false): Observable<any> | Observable<never> {
    if (enableQuotedMessage && message?.hasOwnProperty('quotedMsg')) {
        message = message.quotedMsg as Message;
    }

    let helpText = `Lista de utilitários: \n\n`;
    msgProcessors.forEach(p => {
        if (p?.description) {
            helpText += `${p.description} \n`
        }
    })
    return from(waClient.reply(message.chatId, `${helpText}`, message.id, true));
}
