import { Message } from 'discord.js'

import { Args, Category, Client, Command, Elevation, Embed } from '../model'

export default new (class End extends Command {
  public name = 'end'
  public aliases: string[] = ['stop', 'exit']
  public category: Category = Category.BOT

  public elevation: Elevation = Elevation.GLOBAL_AUTHOR | Elevation.NONE

  public description = 'process.exit();'
  public usage = 'end <code> [reason]'

  public options = []

  public async run(
    client: Client,
    message: Message,
    args: Args
  ): Promise<void> {
    if (args._.length !== 1 && args._.length !== 2) {
      return this.args(message)
    }

    const code = parseInt(args._.shift() || '0')

    if (isNaN(code)) {
      return this.args(message)
    }

    const reason = args._.length > 0 ? args._.join(' ') : 'None'

    const embed = Embed.warn(message.author)
      .addField('Exit Code', code)
      .addField('Reason', `*${reason}*`)

    await message.channel.send({ embed })

    client.logger.info(`Ending process... Reason: ${reason}`)

    process.exit(code)
  }
})()
