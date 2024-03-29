import {Client, create, NotificationLanguage} from '@open-wa/wa-automate';
import {ConfigObject} from "@open-wa/wa-automate/dist/api/model";
import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {ChatId} from "@open-wa/wa-automate/dist/api/model/aliases";
import {findAllUrlsInString} from "./utils/urls-utils";
import {getChatMessage, proccessMessage} from "./utils/message-utils";
import {msgProcessors} from "./message.routing";
import config from "./config";

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

function checkLatestSelfChatMessage(enabled: boolean = true, once: boolean = false): void {
    const execution = () => {
        const lastMsgObs$ = getChatMessage(waClient, `${config.botPhoneNumber}@c.us` as ChatId, 0);
        // const lastMsgObs$ = from(waClient.getMyLastMessage()) as Observable<Message>;
        lastMsgObs$.subscribe((message: Message) => {
            // if (message?.mId && message?.mId !== currentMessageId) {
            // console.log('Result:', message);
            console.log('Message:', message?.mId, message?.text);
            currentMessageId = message?.mId;
            messageProccessing(message);
            // }
        });
    }

    if (enabled === false) {
        return;
    } else if (once) {
        execution();
    } else {
        setInterval(() => {
            execution();
        }, 7500);
    }
}

function messageProccessing(message: Message) {
    const urlsInString = findAllUrlsInString(`${message?.text}`);
    const messageText = `${message?.text}`;
    const lowerCaseText = messageText.toLowerCase();

    if (urlsInString.length > 0) {
        const processors = msgProcessors.filter(p => p.hasOwnProperty('urlIncludes'));

        processors.forEach(p => {
            // caso a mensagem com url não possua o trecho "textIncludes", a url não é processada por esse processador
            // if (!!(p?.textIncludes && lowerCaseText.includes(p.textIncludes) === true) === false) {
            //     return;
            // }

            urlsInString.forEach((url: string) => {
                if (url.includes(`${p?.urlIncludes}`)) {
                    proccessMessage(waClient, message, p.msgFunc, [url]);
                }
            })
        })
    } else if (message?.text) {
        const processors = msgProcessors.filter(p => p.hasOwnProperty('textEquals'));
        processors.forEach(p => {
            if (p?.textEquals && lowerCaseText === p.textEquals) {
                proccessMessage(waClient, message, p.msgFunc);
            } else if (p?.textIncludes && lowerCaseText.includes(p.textIncludes) === true) {
                proccessMessage(waClient, message, p.msgFunc);
            }
        })
    }
}

function start() {
    checkLatestSelfChatMessage(true, true);
    waClient.onMessage(async (message: Message) => {
        messageProccessing(message);
    });
}

create(launchConfig).then((client: Client) => {
    waClient = client;
    start();
});
