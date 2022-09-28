import { ActivityTypes, Bot, BotWithCache, config, EventHandlers, Interaction, Member, Message, User } from "@deps"
import { commandHandler, refreshCommand } from "@classes/command.ts"
import { debug, main } from "@utils/log.ts";
import { ghostPingD, ghostPingU, Payload, autoCreateChannel, bumpReminder, nicknameOnJoin, autorole, autoPublish, ree, selfping, autopost, sentence, sudo, autoRenameChannel } from "@plugins/mod.ts";
import { EventEmitter } from "https://deno.land/x/eventemitter@1.2.4/mod.ts";
import { IResultDB, warning } from "@classes/database.ts";
import { JollyEmbed } from "@classes/embed.ts";
import { avatarURL } from "@utils/avatarURL.ts";
import { send } from "@utils/send.ts";
import { recentWarnings } from "@utils/recentWarnings.ts";

export const warnEvent = new EventEmitter<{
    warnTrigger(bot: BotWithCache<Bot>, data: IResultDB, user?: User): void
}>()

export let BotUptime: number;

warnEvent.on("warnTrigger", async (client: BotWithCache<Bot>, data: IResultDB, user?: User) => {
    const e = new JollyEmbed()
    if (user) {
        e.setAuthor(`${user.username}#${user.discriminator}`, await avatarURL(client, user))
    }
    const member = client.members.get(data.userid) || await client.helpers.getMember(config.guildID, data.userid)
    // deno-lint-ignore no-empty
    if (!member) { }
    else {
        sentence(client, member, recentWarnings(warning.getByUser(member.id)).length)
    }

    const channel = client.channels.get(BigInt(config.warnLog.channelID)) || await client.helpers.getChannel(config.warnLog.channelID)
    if (!channel) return main.error("Cannot find channel ID to send warning logs!")

    return send(client, channel.id, e.warn(data))

})

export const JollyEvent = {
    ready(bot: BotWithCache<Bot>) {
        BotUptime = Date.now()
        main.info("I'm ready!");
        bot.helpers.editBotStatus({
            activities: [
                {
                    name: !config.playingStatus ? `${config.prefixes[0]}help` : config.playingStatus,
                    type: ActivityTypes.Watching,
                    createdAt: Date.now()
                }
            ],
            status: "dnd"
        })
        refreshCommand();
        autopost(bot)
        autoRenameChannel(bot)
    },

    async messageCreate(bot: BotWithCache<Bot>, message: Message): Promise<void> {
        bumpReminder(bot, message);
        autoPublish(bot, message, true, config.plugins.autoPublish.botOnlyChannelID)
        autoPublish(bot, message, false, config.plugins.autoPublish.channelID)
        if (message.isFromBot)
            return;
        const success = await commandHandler(bot, message);
        if (!success) {
            sudo(bot, message)
            ree(bot, message)
            selfping(bot, message)
            autoCreateChannel(bot, message)
        }
    },

    messageDelete(client: BotWithCache<Bot>, payload: Payload, message: Message) {
        ghostPingD(client, payload, message)
    },

    messageUpdate(client: BotWithCache<Bot>, message: Message, oldMessage?: Message) {
        ghostPingU(client, message, oldMessage)
    },

    debug(info: string): void {
        if (Deno.env.get("DEV")) {
            debug.info(info);
        }
    },

    interactionCreate(client: BotWithCache<Bot>, i: Interaction): void {
        if (i.type == 3 && i.data?.customId == "delete") {
            client.helpers.deleteMessage(i.channelId as bigint, i.message?.id as bigint)
        }
    },

    guildMemberUpdate(client: BotWithCache<Bot>, member: Member, user: User) {
        nicknameOnJoin(client, member, user)
        // for who has passed the membership screening 
        autorole(client, member, user)
    },

    guildMemberAdd(client: BotWithCache<Bot>, member: Member, user: User) {
        nicknameOnJoin(client, member, user)
        autorole(client, member, user)
    }
} as unknown as Partial<EventHandlers>
