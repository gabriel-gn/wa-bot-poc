import {Client, create, NotificationLanguage} from '@open-wa/wa-automate';
import {ConfigObject} from "@open-wa/wa-automate/dist/api/model";
import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {ChatId} from "@open-wa/wa-automate/dist/api/model/aliases";
import {messageToFig} from "./message-processors/sticker-generator";
import {findAllUrlsInString} from "./utils/urls-utils";
import {getChatMessage, proccessMessage} from "./utils/message-utils";
import {passeiDiretoUrlDownload} from "./message-processors/passei-direto-downloader";
import {Observable} from "rxjs";

const botPhoneNumber = 'CCDDXXXXXXXXX';
let waClient: Client;

const launchConfig: ConfigObject = {
    // https://openwa.dev/docs/api/interfaces/api_model_config.ConfigObject
    sessionId: "COVID_HELPER", // This is the name of the session. You have to make sure that this is unique for every session.
    multiDevice: true, //required to enable multiDevice support
    authTimeout: 60, //wait only 60 seconds to get a connection with the host account device
    blockCrashLogs: true, // Setting this to true will block any network calls to crash log servers. This should keep anything you do under the radar.
    disableSpins: true, // Setting this to true will simplify logs for use within docker containers by disabling spins (will still print raw messages).
    headless: true, // By default, all instances of @open-wa/wa-automate are headless (i.e you don't see a chrome window open), you can set this to false to show the chrome/chromium window.
    hostNotificationLang: NotificationLanguage.PTBR,
    logConsole: false, // If true, this will log any console messages from the browser.
    popup: true, // If true, the process will open a browser window where you will see basic event logs and QR codes to authenticate the session. Usually it will open on port 3000. It can also be set to a preferred port.
    qrTimeout: 0, // This determines how long the process should wait for a QR code to be scanned before killing the process entirely. To have the system wait continuously, set this to 0.
};

let currentMessageId: any;

function checkLatestSelfChatMessage(): void {
    setInterval(() => {
        const lastMsgObs$ = getChatMessage(waClient, `${botPhoneNumber}@c.us` as ChatId, 0);
        // const lastMsgObs$ = from(waClient.getMyLastMessage()) as Observable<Message>;
        lastMsgObs$.subscribe((message: Message) => {
            // if (message?.mId && message?.mId !== currentMessageId) {
            // console.log('Result:', message);
            console.log('Message:', message?.mId, message?.text);
            currentMessageId = message?.mId;
            messageProccessing(message);
            // }
        });
    }, 7500);
}

const urlProcessors: {
        msgFunc: (...args: any[]) => Observable<any>,
        textEquals?: string,
        urlIncludes?: string,
    }[] = [
    {
        textEquals: 'fig',
        msgFunc: (m: Message) => messageToFig(waClient, m),
    },
    {
        urlIncludes: 'www.passeidireto.com',
        msgFunc: (m: Message, url: string) => passeiDiretoUrlDownload(waClient, m, url)
    },
]

function messageProccessing(message: Message) {
    const urlsInString = findAllUrlsInString(`${message?.text}`);
    const messageText = `${message?.text}`;

    if (urlsInString.length > 0) {
        const processors = urlProcessors.filter(p => p.hasOwnProperty('urlIncludes'));

        processors.forEach(p => {
            urlsInString.forEach((url: string) => {
                if (url.includes(`${p?.urlIncludes}`)) {
                    proccessMessage(waClient, message, p.msgFunc, [url]);
                }
            })
        })
    } else if (message?.text) {
        const processors = urlProcessors.filter(p => p.hasOwnProperty('textEquals'));
        const text = messageText.toLowerCase();
        processors.forEach(p => {
            if (text === p.textEquals) {
               proccessMessage(waClient, message, p.msgFunc);
            }
        })
    }
}

function start() {
    // checkLatestSelfChatMessage();

    waClient.onMessage(async (message: Message) => {
        messageProccessing(message);
    });
}

create(launchConfig).then((client: Client) => {
    waClient = client;
    start();
});