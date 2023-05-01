import {Observable} from "rxjs";
import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {messageToFig} from "./message-processors/sticker-generator";
import {passeiDiretoUrlDownload} from "./message-processors/passei-direto-downloader";
import {Client} from "@open-wa/wa-automate";
import {helpMenu} from "./message-processors/help-menu";

export const msgProcessors: {
    msgFunc: (...args: any[]) => Observable<any>,
    description: string,
    textIncludes?: string,
    textEquals?: string,
    urlIncludes?: string,
}[] = [
    {
        textEquals: 'ajuda!',
        msgFunc: (waClient: Client, m: Message) => helpMenu(waClient, m),
        description: '⁉️ Ajuda: Envie "ajuda!" para exibir este menu'
    },
    {
        textEquals: 'fig',
        msgFunc: (waClient: Client, m: Message) => messageToFig(waClient, m),
        description: '🥸 Figurinhas: Envie ou Responda uma imagem ou gif com o texto "fig", e ela será transformada em figurinha'
    },
    {
        urlIncludes: 'www.passeidireto.com',
        msgFunc: (waClient: Client, m: Message, url: string) => passeiDiretoUrlDownload(waClient, m, url),
        description: '✏️ Passei Direto: Envie uma mensagem com links de documentos do PasseiDireto.com e eles serão baixados e enviados'
    },
]