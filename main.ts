import {Client, create, decryptMedia, MessageId, MessageTypes, NotificationLanguage} from '@open-wa/wa-automate';
import {ConfigObject} from "@open-wa/wa-automate/dist/api/model";
import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {
    catchError, concat,
    concatMap, delay, first,
    forkJoin,
    from, interval,
    isObservable,
    map,
    NEVER,
    Observable,
    of,
    take,
    tap,
    throwError, toArray
} from "rxjs";
import {StickerMetadata} from "@open-wa/wa-automate/dist/api/model/media";
import {ChatId, ContactId} from "@open-wa/wa-automate/dist/api/model/aliases";
import * as _ from 'lodash'

const botPhoneNumber = 'CCAAXXXXXXXXX'
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

function getChatMessage(chatId: ChatId, messageIndex: number = 0): Observable<Message> {
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
            const messageToGet = _.reverse(chatMessages)[messageIndex];
            return messageToGet;
        }),
    ) as unknown as Observable<Message>;
}

function messageToFig(message: Message, enableQuotedMessage: boolean = true): Observable<any> | Observable<never> {
    if (enableQuotedMessage && message?.hasOwnProperty('quotedMsg')) {
        message = message.quotedMsg as Message;
    }

    const availableMessageTypes = [MessageTypes.VIDEO, MessageTypes.IMAGE];
    if (availableMessageTypes.includes(message.type) === false) {
        return of('')
            .pipe(
                tap(() => {console.error({error: 'not valid message type'})}),
            );
    }

    return of('')
        .pipe(
            concatMap(async () => {
                const stickerMetadata: StickerMetadata = {
                    // author: `${message.from.substring(0, message.from.indexOf('@'))}`,
                    author: `GGN`,
                    pack: `GGN Sticker Bot`,
                    removebg: false,
                };
                const chatToSend = message.chatId;
                if (message.type === MessageTypes.VIDEO) {
                    // @ts-ignore
                    const mediaData = await decryptMedia(message);
                    const videoBase64 = `data:${message.mimetype};base64,${mediaData.toString('base64')}`;
                    return from(waClient.sendMp4AsSticker(chatToSend, videoBase64, {}, stickerMetadata));
                } else if (message.type === MessageTypes.IMAGE) {
                    // @ts-ignore
                    const mediaData = await decryptMedia(message);
                    const imageBase64 = `data:${message.mimetype};base64,${mediaData.toString('base64')}`;
                    return forkJoin({
                        sticker: from(waClient.sendImageAsSticker(chatToSend, imageBase64, stickerMetadata)),
                        stickerNoBg: from(waClient.sendImageAsSticker(chatToSend, imageBase64, {...stickerMetadata, removebg: true})),
                    });
                } else {
                    return of('');
                }
            }),
            // concatMap(selfMessages => {
            //     return from(waClient.reply(selfChat.id, 'Aopaaa', latestMessage.id, true));
            // }),
        );
}

function proccessMessage(
    message$: Observable<Message> | Message,
    messageFunction: (messageObj: Message) => Observable<any>
): void {
    if (isObservable(message$) === false) {
        message$ = of(message$) as Observable<Message>;
    }

    (message$ as Observable<Message>).pipe(
        concatMap((message: Message) => {
            return of('').pipe(
                concatMap(() => from(waClient.react(message?.id, "🔄"))),
                concatMap(() => messageFunction(message)),
                concatMap(() => from(waClient.react(message?.id, "✅"))),
                catchError(error => { return from(waClient.react(message.id, "❌")); }),
            )
        }),
    ).subscribe();
}

let currentMessageId: any;
function checkLatestSelfChatMessage(): void {
    setInterval(() => {
        const lastMsgObs$ = getChatMessage(`${botPhoneNumber}@c.us` as ChatId, 0);
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

function findAllUrlsInString(str: string): string[] {
    const regex = /(https?:\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?)/gi;
    const urls = str.match(regex) ?? [];
    return urls;
}

function messageProccessing(message: Message) {
    const urlsInString = findAllUrlsInString(`${message?.text}`);

    if (urlsInString.length > 0) {
        const msgFunc = (m: Message) => of(m).pipe(
            concatMap(() => { return from(waClient.reply(m.chatId, `suas urls: ${urlsInString}`, m.id, true)) })
        )
        proccessMessage(message, m => msgFunc(m));
        console.log(urlsInString);
    } else if (`${message?.text}`.toLowerCase() === 'fig') {
        proccessMessage(message, m => messageToFig(m));
    }
}

function start() {
    checkLatestSelfChatMessage();
    waClient.onMessage(async (message: Message) => {
        messageProccessing(message);
    });
}

create(launchConfig).then((client: Client) => {
    waClient = client;
    start();
});