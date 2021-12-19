/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2021-12-15 18:39:21
 * @LastEditors: cejay
 * @LastEditTime: 2021-12-19 18:15:39
 */

import { Discord, DiscordEventType, Guild, GuildMsg } from './discord';

/**
 * 登录并且监听Discord消息
 * @param username 用户名
 * @param password 密码
 * @param showLog 是否显示日志
 * @param headless 是否显示界面
 * @returns Observable<DiscordEvent>
 */
async function DiscordLogin(username: string, password: string,showLog = false, headless = true) {
    return (await (await Discord.Init(showLog,headless)).Login(username, password)).asObservable();
}

export { DiscordLogin, DiscordEventType, Guild, GuildMsg };
