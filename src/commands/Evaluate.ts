import { inspect } from 'util'

import discord, { Message, Collection } from 'discord.js'

import { Args, Category, Client, Command, Elevation, Embed } from '../model'

export default new (class Evaluate extends Command {
  public name = 'eval'
  public aliases: string[] = [
    'evaluate',
    'expr',
    'expression',
    'code',
    'execute',
    'exec'
  ]

  public category: Category = Category.BOT

  public elevation: Elevation = Elevation.GLOBAL_ADMINISTRATOR | Elevation.NONE

  public description = 'Evaluate an expression'
  public usage = 'eval [...expression]'

  public options = []

  public async run(
    client: Client,
    message: Message,
    args: Args,
    settings: Client.Guild
  ): Promise<void> {
    if (args._.length < 1) {
      return this.args(message)
    }

    const { guild, author } = message

    // Prevent transpile removal (for eval)

    /* eslint-disable no-unused-expressions */
    guild
    author
    discord
    Collection
    settings
    /* eslint-enable no-unused-expressions */

    try {
      await message.channel.send(
        '```js\n' + (await this.clean(client, eval(args._.join(' ')))) + '\n```' // eslint-disable-line no-eval
      )
    } catch (e) {
      await message.channel.send(Embed.error(e.toString(), author))
    }
  }

  private async clean(client: Client, data: any): Promise<string> {
    if (data && data.constructor.name === 'Promise') {
      data = await data
    }

    if (typeof data !== 'string') {
      data = inspect(data, { depth: 0 })
    }

    return data
      .replace(/`/g, '`' + String.fromCharCode(8203))
      .replace(/@/g, '@' + String.fromCharCode(8203))
      .replace(client.token, '[*TOKEN*]')
  }
})()
