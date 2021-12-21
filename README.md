# 监听discord的消息

### 打包发布

`
tsc
npm publish --registry https://registry.npmjs.org
`



安装：

`npm install --save discord_message`

如果提示 Error: Could not find expected browser (chrome) locally

`node ./node_modules/puppeteer/install.js`



###运行示例源码：

`import { DiscordEventType, Guild, GuildMsg, DiscordLogin } from './index';`

`async function main() {`

​    `(await DiscordLogin('u@mail.com', 'xxxxxxx')).subscribe(`

​        `(msg: { type: DiscordEventType; data: Guild[] | GuildMsg; }) => {`

​            `if (msg.type === DiscordEventType.READY) {`

​                `/**`

​                 `\* 关注的频道刷新事件`

​                 `*/`

​                `const guild_list = msg.data as Guild[];`

​                `console.log("================= 关注的频道刷新 =================");`

​                `for (const guild of guild_list) {`

​                    `console.log(频道名称：${guild.name}，频道ID:${guild.id}，成员数量:${guild.member_count});`

​                `}`

​            `} else if (msg.type === DiscordEventType.MESSAGE_CREATE) {`

​                `/**`

​                 `\* 收到了消息`

​                 `*/`

​                `const msg_data = msg.data as GuildMsg;`

​                `console.log([频道ID:${msg_data.id}] 来自用户${msg_data.username}[ID:${msg_data.userid}]消息：${msg_data.msg});`

​            `}`

​        `}`

​    `);`

`}`



`main();`

