const HELP_TEXT = `🤖 <b>LeetBot</b> — LeetCode accountability for your study group

<b>Getting started</b>
/register &lt;leetcode_username&gt; — start tracking your solves in this group
/presets — see ready-made question lists (Blind 75, NeetCode 150, Grind 75, Top Interview 150)
/usepreset &lt;name&gt; — (admin) load one of those lists instantly

<b>Building a custom roadmap</b> (admin only)
/addmodule &lt;name&gt; — add a new section
/addquestion &lt;module#&gt; &lt;title&gt; | &lt;leetcode_url&gt; — add a question to a section

<b>Checking progress</b>
/roadmap — overview of modules + today's target
/roadmap &lt;module#&gt; — full question list for one module
/status — who's done / pending on today's target
/leaderboard — streaks and totals
/whoami — your registration + stats

<b>Other</b>
/unregister — stop tracking me in this group
/skip, /setactive &lt;m#&gt; &lt;q#&gt; — (admin) manual pointer overrides

Every morning the bot posts the day's target question; every night it calls out who hasn't finished it yet. No pasting code here — just solve on leetcode.com and the bot notices automatically.`;

function registerStartCommand(bot) {
  bot.start(async (ctx) => {
    await ctx.reply(HELP_TEXT, { parse_mode: 'HTML' });
  });

  bot.help(async (ctx) => {
    await ctx.reply(HELP_TEXT, { parse_mode: 'HTML' });
  });
}

module.exports = { registerStartCommand };
