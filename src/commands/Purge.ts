import { Collection, Message, TextChannel } from 'discord.js'

import {
  Args,
  Category,
  Client,
  Command,
  Elevation,
  Embed,
  flag,
  string
} from '../model'

export default new (class Purge extends Command {
  public name = 'purge'
  public aliases: string[] = ['prune']
  public category: Category = Category.MODERATION

  public elevation: Elevation =
    Elevation.GLOBAL_ADMINISTRATOR | Elevation.MODERATOR

  public description = 'Purge messages from chat'
  public usage = 'purge <amount> [reason]'

  public options = [
    {
      ...string,
      name: 'user',
      description: 'Purge messages of only one user',
      alias: 'u',
      default: 'none'
    },
    {
      ...flag,
      name: 'alternative',
      description:
        'Use an alternative resolution method; slower, but without 2 week limit',
      alias: 'a'
    },
    {
      ...flag,
      name: 'everything',
      description:
        "Clear an entire channel (or all of a user's messages within a channel)"
    }
  ]

  public async run(
    client: Client,
    message: Message,
    args: Args,
    settings: Client.Guild
  ): Promise<void> {
    if (!args.everything && args._.length !== 1 && args._.length !== 2) {
      await this.args(message)
      return
    }

    const { author, channel, guild } = message

    if (!guild.member(client.user).hasPermission('MANAGE_MESSAGES')) {
      await message.channel.send({
        embed: Embed.error(
          'I must have permission [MANAGE_MESSAGES] to do this!'
        )
      })

      return
    }

    let amount = parseInt(args._[0])

    if (!args.everything && !isNaN(amount)) {
      return this.args(message)
    }

    if (channel.type !== 'text') {
      await channel.send({
        embed: Embed.error('We must be in a text channel!', author)
      })

      return
    }

    const reason = args.everything
      ? args._.join(' ') || 'None'
      : args._.splice(1).join(' ') || 'None'
    await message.delete()

    const filter =
      args.user !== 'none'
        ? (m: Message): boolean =>
            m.guild.member(m.author).displayName === args.user ||
            m.author.id === args.user
        : (): boolean => true

    try {
      if (channel.type !== 'text') {
        throw new Error('We must be in a server text channel!')
      }

      if (args.everything) {
        amount = await this.everything(channel as TextChannel, filter)
      } else if (args.alternative) {
        await this.alternative(channel as TextChannel, amount, filter)
      } else {
        await this.bulk(channel as TextChannel, amount, filter)
      }

      const embed = Embed.warn(author)
        .setTitle('Purge')
        .addField('Messages', amount)
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

      await ((await channel.send({ embed: embed })) as Message).delete(5000)
    } catch (err) {
      await channel.send({
        embed: Embed.error(`Encountered error during purge:\n${err}`, author)
      })
    }
  }

  private async bulk(
    channel: TextChannel,
    amount: number,
    filter: (
      message: Message,
      key: string,
      collection: Collection<string, Message>
    ) => boolean
  ): Promise<void> {
    if (amount < 1) {
      throw new Error('Number of messages to delete must be greater than 0.')
    }

    while (amount > 100) {
      await channel
        .bulkDelete(
          (await channel.fetchMessages({ limit: 100 })).filter(filter)
        )
        .catch(() => {})
      amount -= 100
    }

    await channel
      .bulkDelete(
        (await channel.fetchMessages({ limit: amount })).filter(filter)
      )
      .catch(() => {})
  }

  private async alternative(
    channel: TextChannel,
    amount: number,
    filter: (
      message: Message,
      key: string,
      collection: Collection<string, Message>
    ) => boolean
  ): Promise<void> {
    if (amount < 1) {
      throw new Error('Number of messages to delete must be greater than 0.')
    }

    while (amount > 100) {
      const messages = (await channel.fetchMessages({ limit: 100 })).filter(
        filter
      )

      await Promise.all(
        messages.map(m => m.delete(1000).catch(() => {}))
      ).catch(() => {})

      amount -= 100
    }

    await Promise.all(
      (await channel.fetchMessages({ limit: amount }))
        .filter(filter)
        .map(m => m.delete(1000).catch(() => {}))
    ).catch(() => {})
  }

  private async everything(
    channel: TextChannel,
    filter: (
      message: Message,
      key: string,
      collection: Collection<string, Message>
    ) => boolean
  ): Promise<number> {
    let amount = 0

    while (true) {
      const messages = (await channel.fetchMessages({ limit: 100 })).filter(
        filter
      )

      if (messages.size < 1) {
        return amount
      }

      amount += messages.size

      await Promise.all(
        messages.map(m => m.delete(1000).catch(() => {}))
      ).catch(() => {})
    }
  }
})()
