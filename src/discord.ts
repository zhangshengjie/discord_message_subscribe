/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2021-12-15 21:29:14
 * @LastEditors: cejay
 * @LastEditTime: 2021-12-19 18:20:01
 */

import puppeteer from 'puppeteer';
const zlib = require('zlib-sync'); // 同步压缩
import { Subject } from 'rxjs';

export class Discord {

    private static UA: string = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36";
    private static viewport_width = 1440;
    private static viewport_height = 723;
    private browser: puppeteer.Browser;

    /**
     * 键为guild id，值为频道信息
     */
    private guildMap = new Map<string, Guild>();
    /**
     * 键为 channels-> guild_id,值为 guild id，空间冗余 方便查找用
     */
    private guildPam = new Map<string, string>();

    // https://discordapi.com/topics/gateway#gateway-opcodespayloads
    private OPCodes = {
        HEARTBEAT: 1,
        IDENTIFY: 2,
        HELLO: 10,
        HEARTBEAT_ACK: 11,
    };

    private showLog = false;

    private log(message?: any, ...optionalParams: any[]) {
        if (this.showLog) {
            console.log(message, ...optionalParams);
        }
    }

    private constructor(browser: puppeteer.Browser, showLog = false) {
        if (!browser) {
            throw new Error('browser is null');
        }
        this.browser = browser;
        this.showLog = showLog;
    }

    public static async Init(showLog = false, headless = true) {
        let args = [
            '-–disable-gpu', // GPU硬件加速
            '-–disable-dev-shm-usage', // 创建临时文件共享内存
            '--disable-setuid-sandbox',// uid沙盒 
            '--no-sandbox',
            '--ignore-certificate-errors',
            '--disable-web-security',/*去掉同源策略 一遍修改请求的返回内容*/
            `--window-size=${Discord.viewport_width},${Discord.viewport_height}`,
            '--lang=zh-CN,zh'
        ];
        const browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: headless,
            args: args
        });
        return new Discord(browser, showLog);
    }


    public async Login(username: string, password: string) {
        let subject = new Subject<DiscordEvent>();

        // zlib inflate context for zlib-stream
        let inflate: any = null;
        let page = await this._newPage();
        let cDPSession = await page.target().createCDPSession();
        // 打开网络跟踪，允许网络事件通知到浏览器
        await cDPSession.send('Network.enable')
        cDPSession.on('Network.webSocketCreated',
            (params) => {
                this.log(`创建 WebSocket 连接：${params.url}`);
                inflate = new zlib.Inflate({
                    chunkSize: 65535,
                    flush: zlib.Z_SYNC_FLUSH,
                });
            }
        );
        cDPSession.on('Network.webSocketFrameReceived', (params) => {
            if (inflate !== null && this.OPCodes.IDENTIFY === params.response.opcode) {
                try {
                    let data = params.response.payloadData;
                    let buf = Buffer.from(data, 'base64');
                    const l = buf.length;
                    const flush = l >= 4 &&
                        buf[l - 4] === 0x00 &&
                        buf[l - 3] === 0x00 &&
                        buf[l - 2] === 0xFF &&
                        buf[l - 1] === 0xFF;
                    inflate.push(buf, flush && zlib.Z_SYNC_FLUSH);
                    if (!flush) return;
                    if (!inflate.result) return;
                    let jsonStr = inflate.result.toString('utf8');
                    this.WsMsg(subject, jsonStr);
                } catch (error) {
                    console.log(error);
                }
            }
        }
        );

        page.on('load', async () => {
            this.log(`页面加载完成`);
            try {
                const email_txt = await page.waitForSelector('input[name="email"]', {
                    timeout: 1000 * 10
                });
                const pwd_txt = await page.waitForSelector('input[name="password"]', {
                    timeout: 3000
                });
                const submit_btn = await page.waitForSelector('button[type="submit"]', {
                    timeout: 3000
                });

                if (email_txt && pwd_txt && submit_btn) {
                    await email_txt.focus();
                    await page.keyboard.type(username);
                    await pwd_txt.focus();
                    await page.keyboard.type(password);
                    await submit_btn.click();
                }
            } catch (error) {

            }

        });

        await page.goto('https://discord.com/app', {
            waitUntil: 'networkidle2'
        });

        setInterval(async () => {
            this.log(`刷新页面`);
            await page.reload();
        }, 1000 * 60 * 10);

        return subject;

    }

    private WsMsg(subject: Subject<DiscordEvent>, msg: string) {
        if (!msg) {
            return;
        }
        const json = JSON.parse(msg);
        const base = json as WsBaseCls;
        if (!base || !base.t) {
            return;
        }
        if (base.t === 'READY') {
            /**
             * 初始化加入的频道信息 以及频道的人数
             */
            const data = json as Ws_READY;
            if (!data.d || !data.d.guilds) {
                return;
            }

            /**
             * 清空以前的数据
             */
            this.guildMap = new Map<string, Guild>();
            this.guildPam = new Map<string, string>();

            for (const guild of data.d.guilds) {
                if (guild.id && guild.name && guild.channels && guild.member_count) {
                    this.guildMap.set(guild.id, new Guild(guild.id, guild.name, guild.member_count));
                    this.guildPam.set(guild.id, guild.id);
                    for (const channel of guild.channels) {
                        if (channel.guild_id) {
                            this.guildPam.set(channel.guild_id, guild.id);
                        }
                    }
                }
            }

            const guilds = Array.from(this.guildMap.values());

            subject.next(new DiscordEvent(DiscordEventType.READY, guilds));

        } else if (base.t === 'MESSAGE_CREATE') {
            /**
             * 收到消息
             */
            const data = json as Ws_MESSAGE_CREATE;
            if (!data.d || !data.d.guild_id) {
                return;
            }
            let guild_id = this.guildPam.get(data.d.guild_id);
            if (guild_id) {
                const guild = this.guildMap.get(guild_id);
                if (guild) {
                    this.log(`${guild.name} => ${data.d.content}`);
                    let content = data.d.content || '';
                    subject.next(new DiscordEvent(DiscordEventType.MESSAGE_CREATE, new GuildMsg(guild_id, content)));
                }
            } else {
                this.log('发现未知频道');
            }

        }
    }

    private async _newPage() {
        const page = await this.browser.newPage();
        await Promise.all([
            page.setExtraHTTPHeaders({
                'Accept-Language': 'zh'
            }),
            page.setRequestInterception(false),
            page.setCacheEnabled(true),
            page.setUserAgent(Discord.UA),
            // 允许运行js
            page.setJavaScriptEnabled(true),
            // 设置页面视口的大小
            page.setViewport({ width: Discord.viewport_width, height: Discord.viewport_height }),

        ]);
        return page;
    }

    sleep(time = 0) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(true);
            }, time);
        });
    }





}

export class DiscordEvent {
    constructor(_type: DiscordEventType, _data: any) {
        this.type = _type;
        this.data = _data;
    }
    type: DiscordEventType;
    data: Guild[] | GuildMsg;
}
export enum DiscordEventType {
    READY,
    MESSAGE_CREATE,
}

export class GuildMsg {
    constructor(_id: string, _msg: string) {
        this.id = _id;
        this.msg = _msg;
    }
    id: string;
    msg: string;
}

export class Guild {
    member_count: number;
    id: string;
    name: string;
    constructor(id: string, name: string, member_count: number) {
        this.id = id;
        this.name = name;
        this.member_count = member_count;
    }
}

export class WsBaseCls {
    t?: string;// 'READY' 'MESSAGE_CREATE' 'CHANNEL_UPDATE'
    s?: number;
    op?: number;
}

export class Ws_READY extends WsBaseCls {
    d?: Ws_READY_D;
}
export class Ws_MESSAGE_CREATE extends WsBaseCls {
    d?: Ws_MESSAGE_CREATE_D;
}
export class Ws_CHANNEL_UPDATE extends WsBaseCls {
    d?: Ws_CHANNEL_UPDATE_D;
}


/*Permission_overwrites*/
export class Permission_overwrites {
    type?: number;
    id?: string;
    deny?: string;
    allow?: string;
}

/*Channels*/
export class Channels {
    type?: number;
    topic?: string;
    permission_overwrites?: Permission_overwrites[];
    parent_id?: string;
    nsfw?: boolean;
    name?: string;
    last_message_id?: string;
    id?: string;
    guild_id?: string;
}

/*Guilds*/
export class Guilds {
    name?: string;
    description?: string;
    channels?: Channels[];
    public_updates_channel_id?: string;
    system_channel_id?: string;
    vanity_url_code?: string;
    rules_channel_id?: string;
    member_count?: number;
    id?: string;
}

export class Ws_READY_D {
    guilds?: Guilds[];
}

export class Ws_MESSAGE_CREATE_D {
    type?: number;
    tts?: boolean;
    timestamp?: string;
    id?: string;
    content?: string;
    channel_id?: string;
    guild_id?: string;
}


export class Ws_CHANNEL_UPDATE_D {
    type?: number;
    permission_overwrites?: Permission_overwrites[];
    parent_id?: string;
    name?: string;
    id?: string;
    guild_id?: string;
}




