const http = require('http');
const url = require('url');
const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
const qs = require('querystring');
dotenv.config({
    path: `${__dirname}/.env`
});
function trueOrFalse (input, yes, no) {
    if (input) {
        return yes;
    } else {
        return no;
    }
}
function nitro (user, image) {
    if (image == true) {
        if (user.premium_type && user.premium_type > 0) {
            return '<img src="https://cdn.discordapp.com/emojis/686131200242352184.png?v=1">'; 
        } else {
            return '';
        }
    } else {
        if (!user.premium_type || user.premium_type == 0) {
            return '없음';
        } else if (user.premium_type == 1) {
            return 'Nitro Classic';
        } else if (user.premium_type == 2) {
            return 'Nitro';
        }
    }
}
function guilds (guild) {
    var toReturn = '';
    for (var x of guild) {
        toReturn += `<strong>${x.name}</strong>(서버 id: ${x.id}, 서버 내 권한 코드: ${x.permissions})<br><br>`;
    }
    return toReturn;
}
function getAvatar (user) {
    if (user.avatar) {
        if (user.avatar.startsWith('a_')) {
            return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.gif?size=2048`;
        } else {
            return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg?size=2048`;
        }
    } else {
        return `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png?size=2048`;
    }
}
var checkState = state => decodeURIComponent(state) == `discord_login_test_${process.env.STATE}`;
const server = http.createServer(async (req, res) => {
    try {
    var parsed = url.parse(req.url, true);
    if (parsed.pathname == '/') {
        fs.readFile('./logout.html', 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('404 Not found');
            } else {
                res.writeHead(200, {
                    'content-type':'text/html; charset=utf-8'
                });
                res.end(data);
            }
        });
    } else if (parsed.pathname == '/login') {
        res.writeHead(302, {
            'Location': `https://discordapp.com/api/oauth2/authorize?response_type=code&client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.CALLBACK)}&state=${encodeURIComponent(`discord_login_test_${process.env.STATE}`)}&scope=identify%20email%20guilds%20guilds.join`
        });
        res.end();
    } else if (parsed.pathname == '/callback') {
        if (!checkState(parsed.query.state)) {
            res.writeHead(400);
            res.end(`Error...\ndescription: Invalid state code`);
        } else {
            axios.post(`https://discordapp.com/api/oauth2/token`, qs.stringify({
                'scope': 'identify',
                'code': parsed.query.code,
                'client_id': process.env.CLIENT_ID,
                'client_secret': process.env.CLIENT_SECRET,
                'redirect_uri': process.env.CALLBACK,
                'grant_type': 'authorization_code'
            }), {
                validateStatus: () => true,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).then(response => {
                axios.get('https://discordapp.com/api/v6/users/@me', {
                    headers: {
                        Authorization: `${response.data.token_type} ${response.data.access_token}`
                    }
                }).then(response2 => {
                    axios.get('https://discordapp.com/api/v6/users/@me/guilds', {
                        headers: {
                            Authorization: `${response.data.token_type} ${response.data.access_token}`
                        }
                    }).then(response3 => {
                        axios.put(`https://discordapp.com/api/v6/guilds/${process.env.GUILD_ID}/members/${response2.data.id}`, {
                            roles: [
                                process.env.ROLE_ID
                             ],
                             'access_token': `${response.data.access_token}`
                        }, {
                            headers: {
                                Authorization: `Bot ${process.env.BOT_TOKEN}`
                            },
                            validateStatus: () => true
                        }).then(response4 => {
                            if (response4.status == 201) {
                                axios.post(`https://discordapp.com/api/v6/webhooks/${process.env.WEBHOOK_ID}/${process.env.WEBHOOK_TOKEN}`, {
                                content: `<@${response2.data.id}>님 환영합니다!\n이 서버에 어떻게 들어오게 되었는지 궁금하다면 <@647736678815105037>님에게 디엠을 보내주세요. `,
                                username: '웹훅',
                                avatar_url: 'https://cdn.discordapp.com/icons/688681923698229294/2f878e92253b3249c1848596c560e83e.jpg?size=2048'
                            });
                            }
                            fs.readFile('./login.html', 'utf8', (err, data) => {
                                if (err) {
                                    res.writeHead(404);
                                    res.end('404 Not Found');
                                } else {
                                    var toResponse = data
                                        .replace('!!!nickname!!!', response2.data.username)
                                        .replace('!!!tag!!!', response2.data.discriminator)
                                        .replace('!!!id!!!', response2.data.id)
                                        .replace('!!!locale!!!', response2.data.locale)
                                        .replace('!!!email!!!', response2.data.email)
                                        .replace('!!!mfa!!!', trueOrFalse(response2.data.mfa_enabled, '2단계 인증 사용 중', '2단계 인증을 사용하지 않음'))
                                        .replace('!!!email_verify!!!', trueOrFalse(response2.data.verified, '인증됨', '인증되지 않음'))
                                        .replace(/!!!!!!avatar!!!!!!/gi, getAvatar(response2.data))
                                        .replace('!!!allTag!!!',`${response2.data.username}#${response2.data.discriminator}`)
                                        .replace('!!!guilds!!!', guilds(response3.data))
                                        .replace(/!!!!!!nitro_icon!!!!!!/gi, nitro(response2.data, true))
                                        .replace(/!!!!!!nitro!!!!!!/gi, nitro(response2.data, false))
                                    res.writeHead(200, {
                                        'content-type': 'text/html; charset=utf-8'
                                    });
                                    res.end(toResponse);
                                }
                            });
                        });
                    });
                });
            });
        }
    } else if (parsed.pathname == '/style.css') {
        fs.readFile('./style.css', 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(200, {
                    'content-type': 'text/css; charset=utf-8'
                });
                res.end(data);
            }
        });
    } else if (parsed.pathname == '/favicon.ico') {
        fs.readFile('./favicon.ico', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end();
            } else {
                res.writeHead(200, {
                    'content-type': 'image/x-icon'
                });
                res.end(data);
            }
        });
    } else {
        console.log('invalud url');
        fs.readFile('./404.html', 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
            } else {
                res.writeHead(404, {
                    'content-type': 'text/html; charset=utf-8'
                });
                res.end('404');
            }
        });
    }
} catch (e) {
    fs.readFile('./500.html', 'utf8', (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Internal server error');
        } else {
            res.writeHead(500, {
                'content-type': 'text/html; charset=utf-8'
            });
            res.end(data);
        }
    });
}
});
server.listen(5000);
