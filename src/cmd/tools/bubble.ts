import { Bot, BotWithCache, createCanvas, Image, loadImage, Message, MessageTypes } from "@deps";
import { addCommand, JollyCommand } from "@classes/command.ts";
import { send } from "@utils/send.ts";

class Bubble extends JollyCommand {
    constructor() {
        super("bubble", "tools", {
            description: "Convert from image or gif to chat bubble\nNo animated GIF support for now",
            usage: "<url or image>"
        })
    }

    override async run(message: Message, args: string[], client: BotWithCache<Bot>) {
        let url: string | null = null
        // valid image url
        const matcher = /(http(s)?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/gi
        if (message.attachments.length) {
            url = message.attachments[0].url
        } else if (args.length) {
            const matched = args[0].match(matcher)
            if (!matched?.length) {
                return await send(client, message.channelId, "You need to put the link to image or upload your image to convert")
            }
            url = matched[0]
        } else if (message.type == MessageTypes.Reply) {
            const ref = message.messageReference!
            const targetMsg = client.messages.get(ref.messageId!) || await client.helpers.getMessage(ref.channelId!, ref.messageId!)
            const matched = targetMsg.content.match(matcher)
            if (!matched?.length) {
                if (!targetMsg.attachments.length) {
                    return await send(client, message.channelId, "There's no image content found in the message you replied")
                } else {
                    url = targetMsg.attachments[0].url
                }
            } else {
                url = matched[0]
            }
        } else {
            return send(client, message.channelId, "Missing arguments???")
        }
        let img: Image
        try {
            img = await loadImage(url)
        } catch {
            return await send(client, message.channelId, "Invalid image")
        }
        const imgMask = await loadImage("./assets/bubble.png")
        const ne = createCanvas(img.width(), img.height())
        const ctx = ne.getContext("2d")

        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, ne.width, ne.height)
        ctx.drawImage(img, 0, 0)
        // no support for animated gif for now
        ctx.drawImage(imgMask, 0, 0, img.width(), img.height() / 5)

        const blob = await (await fetch(ne.toDataURL('image/gif'))).blob()

        await send(client, message.channelId, {
            content: "Press ⭐ in top right gif to save the result!",
            file: {
                name: "bubble.gif",
                blob: blob
            }
        })
    }
}

addCommand(new Bubble())