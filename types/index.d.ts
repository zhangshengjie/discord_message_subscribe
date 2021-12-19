/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2021-12-18 21:38:38
 * @LastEditors: cejay
 * @LastEditTime: 2021-12-19 18:17:14
 */
import { Observable } from "rxjs";

declare const enum DiscordEventType {
    /**
     * 汇报频道概要
     */
    READY,
    /**
     * 收到新消息
     */
    MESSAGE_CREATE,
}
declare interface Guild {
    /**
     * 频道成员数量
     */
    member_count: number;
    /**
     * 频道唯一ID
     */
    id: string;
    /**
     * 频道名称
     */
    name: string;
}
declare interface GuildMsg {
    /**
     * 消息ID
     */
    id: string;
    /**
     * 消息发送者ID
     */
    name: string;
}

declare interface GuildMsg {
    /**
     * 消息唯一ID
     */
    id: string;
    /**
     * 消息内容
     */
    msg: string;
}


declare interface DiscordEvent {
    type: DiscordEventType;
    data: Guild[] | GuildMsg;
}

/**
 * 登录并且监听Discord消息
 * @param username 用户名
 * @param password 密码
 * @param showLog 是否显示日志
 * @param headless 是否显示界面
 * @returns Observable<DiscordEvent>
 */
export function DiscordLogin(username: string, password: string, showLog?: boolean, headless?: boolean): Promise<Observable<DiscordEvent>>;

interface DiscordWatchType {
    DiscordEventType: DiscordEventType,
    Guild: Guild,
    GuildMsg: GuildMsg
}

export const discordWatchType: DiscordWatchType;