import {Client} from "@open-wa/wa-automate";
import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {from, Observable} from "rxjs";
import {exec} from 'shelljs';

export function passeiDiretoUrlDownload(waClient: Client, message: Message, url: string, enableQuotedMessage: boolean = false): Observable<any> | Observable<never> {
    if (enableQuotedMessage && message?.hasOwnProperty('quotedMsg')) {
        message = message.quotedMsg as Message;
    }

    console.log('Iniciando conversão passei direto');
    const filepath = `./${url.substring(url.lastIndexOf('/') + 1, url.length)}.pdf`;
    const filename = filepath.substring(filepath.lastIndexOf('/') + 1, filepath.length)
    exec(`/Users/ggn/Documents/GitHub/passeidireto-cli/venv/bin/python3 /Users/ggn/Documents/GitHub/passeidireto-cli/src/main.py -u ${url} -o sla.pdf`)
    return from(waClient.sendFile(message.chatId, filepath, filename, `${filename} do passei direto`, message.id))
        // .pipe(delay(10000));
}
