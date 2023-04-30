import {Observable} from "rxjs";
import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {messageToFig} from "./message-processors/sticker-generator";
import {passeiDiretoUrlDownload} from "./message-processors/passei-direto-downloader";
import {Client} from "@open-wa/wa-automate";

export const urlProcessors: {
    msgFunc: (...args: any[]) => Observable<any>,
    textEquals?: string,
    urlIncludes?: string,
}[] = [
    {
        textEquals: 'fig',
        msgFunc: (waClient: Client, m: Message) => messageToFig(waClient, m),
    },
    {
        urlIncludes: 'www.passeidireto.com',
        msgFunc: (waClient: Client, m: Message, url: string) => passeiDiretoUrlDownload(waClient, m, url)
    },
]