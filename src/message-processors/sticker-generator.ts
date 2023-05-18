import {Message} from "@open-wa/wa-automate/dist/api/model/message";
import {concatMap, delay, forkJoin, from, map, Observable, of, tap} from "rxjs";
import {Client, decryptMedia, MessageTypes} from "@open-wa/wa-automate";
import {StickerMetadata} from "@open-wa/wa-automate/dist/api/model/media";
const Jimp = require("jimp");
import {join} from "path";
import {Font} from "@jimp/plugin-print";

export function messageToSticker(waClient: Client, message: Message, enableQuotedMessage: boolean = true): Observable<any> | Observable<never> {
    if (enableQuotedMessage && message?.hasOwnProperty('quotedMsg')) {
        message = message.quotedMsg as Message;
    }

    const availableMessageTypes: MessageTypes[] = [MessageTypes.VIDEO, MessageTypes.IMAGE];
    if (availableMessageTypes.includes(message.type) === false) {
        return of('')
            .pipe(
                tap(() => {
                    console.error({error: 'not valid message type'})
                }),
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
                        stickerNoBg: from(waClient.sendImageAsSticker(chatToSend, imageBase64, {
                            ...stickerMetadata,
                            removebg: true
                        })),
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

export function messageToStickerWithText(waClient: Client, message: Message, enableQuotedMessage: boolean = true): Observable<any> | Observable<never> {
    if (enableQuotedMessage && message?.hasOwnProperty('quotedMsg')) {
        message = message.quotedMsg as Message;
    }

    const availableMessageTypes: MessageTypes[] = [MessageTypes.IMAGE];
    if (availableMessageTypes.includes(message.type) === false) {
        return of('')
            .pipe(
                tap(() => {
                    console.error({error: 'not valid message type'})
                }),
            );
    }

    return (forkJoin({
        font: from(Jimp.loadFont(join(__dirname, '../assets/fonts/font.fnt'))) as Observable<Font>,
        // @ts-ignore
        img: from(decryptMedia(message))
    })).pipe(
        concatMap(obj => {
            return from(Jimp.read(obj['img'])).pipe(map(
                (image: any) => {
                    const maxWidth = 250;
                    const text = "shaushauhshusha"; // text to be printed
                    return image
                        .resize(maxWidth, Jimp.AUTO)
                        // print the text with a smaller font size and a lighter color on top of the first print
                        .print(
                            obj['font'],
                            0, // x
                            image.getHeight() - Jimp.measureTextHeight(obj['font'], text, maxWidth), // y
                            {
                                text,
                                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
                            },
                            maxWidth
                        )
                        .write(join(__dirname, `../assets/images/test2.jpeg`));
                }
            ))
        })
    )
}
