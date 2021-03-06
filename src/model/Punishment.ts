import { GuildMember, Message, TextChannel } from 'discord.js'

import { Args, Client, Category, Command, Elevation, Embed } from '.'

export abstract class Punishment extends Command {
  protected abstract type: Client.Punishment.Type

  public category: Category = Category.MODERATION
  public elevation: Elevation =
    Elevation.GLOBAL_ADMINISTRATOR | Elevation.MODERATOR

  public async run(
    client: Client,
    message: Message,
    args: Args,
    settings: Client.Guild
  ): Promise<void> {
    const { author, guild } = message

    if (args._.length < 1 || message.mentions.users.size < 1) {
      await this.args(message)
      return
    }

    const target = client.userify(args._[0], guild)

    if (!target) {
      await message.channel.send({
        embed: Embed.error(`Could not find the target user!`)
      })
      return
    }

    const user = guild.member(target)
    const reason = args._.slice(1).join(' ') || 'None'

    if (user.id === author.id) {
      message.channel.send({
        embed: Embed.error(`Cannot ${this.name} yourself!`, author)
      })
      return
    }

    if (
      !this.verify(client, user, settings) ||
      Client.allowed(
        await client.elevation(user.user, guild),
        Elevation.MODERATOR | Elevation.GLOBAL_ADMINISTRATOR
      )
    ) {
      message.channel.send({
        embed: Embed.error(`I am unable to ${this.name} that user!`, author)
      })
      return
    }

    if (
      this.type !== Client.Punishment.Type.PARDON &&
      this.type !== Client.Punishment.Type.UNMUTE
    ) {
      ;(await user.createDM())
        .send({
          embed: Embed.warn(author)
            .addField(
              this.name.replace(/^\w/g, (t: string) => t.toUpperCase()),
              'You have been punished!'
            )
            .addField('Moderator', `<@${author.id}>`)
            .addField('Reason', reason)
        })
        .catch()
    }

    try {
      await this.punish(user, `${reason}\n\n[${user.id}]`, args, settings)
    } catch (e) {
      message.channel.send({ embed: Embed.error(e.toString(), author) })

      return
    }

    settings.punishments.push({
      user: user.id,
      moderator: author.id,
      type: this.type,
      reason: reason
    })

    const embed = Embed.warn(author)
      .setTitle(this.name.replace(/^\w/g, (t: string) => t.toUpperCase()))
      .addField('User', user.user.tag)
      .addField('Moderator', `<@${author.id}>`)
      .addField('Reason', reason)

    const log = guild.channels.find(
      c =>
        c.type === 'text' &&
        (c.name === settings.settings.logs.moderation ||
          c.id === settings.settings.logs.moderation)
    ) as TextChannel

    if (log) {
      await log.send({ embed })
    }

    await message.channel.send({ embed })
  }

  public abstract verify(
    client: Client,
    user: GuildMember,
    guild: Client.Guild
  ): boolean

  public abstract async punish(
    user: GuildMember,
    reason: string,
    args: Args,
    guild: Client.Guild
  ): Promise<void>
}
