<!--
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2021-12-18 19:40:04
 * @LastEditors: cejay
 * @LastEditTime: 2021-12-19 18:20:33
-->
发布：
npm publish --registry https://registry.npmjs.org




import {DiscordEventType, Guild,GuildMsg,DiscordLogin} from 'discord_message_subscribe';
async function main() {
    let a = DiscordEventType.MESSAGE_CREATE;
    console.log(a);
    (await DiscordLogin('user@mail.com', 'xxxxxxxx')).subscribe(
        (msg: { type: DiscordEventType; data: Guild[] | GuildMsg; }) => {
            if (msg.type === DiscordEventType.READY) {
                /**
                 * 关注的频道刷新事件
                 */
                const guild_list = msg.data as Guild[];
                console.log("================= 关注的频道刷新 =================");
                for (const guild of guild_list) {
                    console.log(`名字：${guild.name}，唯一ID:${guild.id}，成员数量:${guild.member_count}`);
                }
            } else if (msg.type === DiscordEventType.MESSAGE_CREATE) {
                /**
                 * 收到了消息
                 */
                const msg_data = msg.data as GuildMsg;
                console.log(`收到消息[频道ID:${msg_data.id}]：${msg_data.msg}`);
            }
        }
    );
}

main();
