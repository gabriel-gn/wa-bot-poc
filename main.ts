import {create, Client, decryptMedia, ev, NotificationLanguage, MessageId} from '@open-wa/wa-automate';
import {ConfigObject} from "@open-wa/wa-automate/dist/api/model";
import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {Chat} from "@open-wa/wa-automate/dist/api/model/chat";
import {
    catchError,
    concatMap,
    delay,
    first,
    from,
    isObservable,
    map,
    tap,
    Observable,
    of,
    take,
    throwError,
    combineLatest, forkJoin, combineAll
} from "rxjs";
import {StickerMetadata} from "@open-wa/wa-automate/dist/api/model/media";

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

function messageToFig(client: Client, message: Message): Observable<any> | null {
    const availableMessageTypes = ['video', 'image'];
    if (availableMessageTypes.includes(`${message.type}`.toLowerCase()) === false) { return null }

    const selfChatId = '<my_number>@c.us';
    let selfChat: Chat;
    return of('')
        .pipe(
            // concatMap(() => {
            //     return from(client.getAllChats(false));
            // }),
            // concatMap((allChats: Chat[]) => {
            //     selfChat = allChats.find(chat => chat.id === selfChatId) as Chat;
            //     return from(client.getAllMessagesInChat(selfChatId, true, false));
            // }),
            // tap(selfMessages => { message = selfMessages[0]; }),
            concatMap(() => {
                return from(client.react(message.id, "🔄"));
            }),
            concatMap(async () => {
                const stickerMetadata: StickerMetadata = {
                    author: `${message.from.substring(0, message.from.indexOf('@'))}`,
                    pack: `GGN Sticker Bot`,
                    removebg: false,
                };
                if (`${message.type}`.toLowerCase() === 'video') {
                    const mediaData = await decryptMedia(message);
                    const videoBase64 = `data:${message.mimetype};base64,${mediaData.toString('base64')}`;
                    return from(client.sendMp4AsSticker(message.from, videoBase64, {}, stickerMetadata));
                } else if (`${message.type}`.toLowerCase() === 'image') {
                    const mediaData = await decryptMedia(message);
                    const imageBase64 = `data:${message.mimetype};base64,${mediaData.toString('base64')}`;
                    return forkJoin({
                        sticker: from(client.sendImageAsSticker(message.from, imageBase64, stickerMetadata)),
                        stickerNoBg: from(client.sendImageAsSticker(message.from, imageBase64, {...stickerMetadata, removebg: true})),
                    });
                } else {
                     return of('');
                }
            }),
            concatMap(selfMessages => {
                return from(client.react(message.id, "✅"));
            }),
            // concatMap(selfMessages => {
            //     return from(client.reply(selfChat.id, 'Aopaaa', latestMessage.id, true));
            // }),
            catchError(error => {
                return from(client.react(message.id, "❌"));
            })
        );
}

function proccessMessage(messageObservable: any): void {
    if (isObservable(messageObservable)) {
        messageObservable.pipe(take(1)).subscribe();
    }
}

function start(client: Client) {
    // proccessMessage(messageToFig(client, 'message' as unknown as Message));
    client.onMessage(async (message: Message) => {
        if (`${message.caption}`.toLowerCase() === 'fig') {
            const msgObs = messageToFig(client, message);
            proccessMessage(msgObs);
        }
    });
}

create(launchConfig).then((client: Client) => start(client));

