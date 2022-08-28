import { Bot, BotWithCache, Message, User } from "@deps";
import { addCommand, JollyCommand } from "@classes/command.ts";
import { send } from "@utils/send.ts";
import { warning } from "@classes/database.ts";
import { findUser } from "@utils/find.ts";
import { JollyEmbed } from "@classes/embed.ts";
import { avatarURL } from "@utils/avatarURL.ts";
import { recentWarnings } from "../../utils/recentWarnings.ts";

class Warnings extends JollyCommand {
    constructor() {
        super("warnings", "moderation")
    }

    override async run(message: Message, args: string[], client: BotWithCache<Bot>) {
        if (!args[0]) return await send(client, message.channelId, "Missing arguments")
        const mentionUser = message.mentionedUserIds
        let user: User | undefined
        if (mentionUser.length >= 1) {
            user = await findUser(client, mentionUser[0].toString())
        } else {
            user = await findUser(client, args[0])
        }
        if (!user) return await send(client, message.channelId, "That user is not found")
        const warnings = warning.getByUser(user.id)
        if (warnings.length < 1) return await send(client, message.channelId, `**${user.username}#${user.discriminator}** doesn't have any warnings!`)
        const e = new JollyEmbed()
            .setAuthor(`${user.username}#${user.discriminator}`, await avatarURL(client, user))
            .setTitle(`${warnings.length} warnings for this user | ID: ${user.id}`)
            .setDesc(`Total: **${warnings.length}** | Last 6 months: **${recentWarnings(warnings).length}**`)
        for (const d of warnings.slice(0, 24)) {
            e.addField(`ID: \`${d.case}\` | Moderator: ${d.moderator_name} (${d.moderator})`,
                `${d.reason} | ${new Date(d.data).toDateString()}`)
        }
        return await send(client, message.channelId, e.build())
    }
}

addCommand(new Warnings())