import keys from './keys.js';

import { Low, JSONFile } from 'lowdb';
import { Client, Intents } from 'discord.js';

const adapter = new JSONFile('db.json');
const db = new Low(adapter);

await db.read();

db.data ||= { users: {}, used: 0, badges: {} };

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.on('ready', () => {
    client.api.applications(client.user.id).commands.post({
        data: {
            name: 'store',
            description: 'Store a value',
            options: [{
                type: 3,
                name: 'key',
                description: 'Key to store value under',
                required: true
            },{
                type: 3,
                name: 'value',
                description: 'Value to be stored',
                required: true
            }]
        }
    });

    client.api.applications(client.user.id).commands.post({
        data: {
            name: 'setbadges',
            description: 'Set badges for a user (Overwrites all current badges)',
            options: [{
                type: 6,
                name: 'user',
                description: 'User',
                required: true
            },{
                type: 3,
                name: 'badges',
                description: 'Badges',
                required: true
            }]
        }
    });

    client.api.applications(client.user.id).commands.post({
        data: {
            name: 'addbadges',
            description: 'Adds badges for a user',
            options: [{
                type: 6,
                name: 'user',
                description: 'User',
                required: true
            },{
                type: 3,
                name: 'badges',
                description: 'Badges to add',
                required: true
            }]
        }
    });

    client.api.applications(client.user.id).commands.post({
        data: {
            name: 'retrieve',
            description: 'Retrieve value for a user',
            options: [{
                type: 6,
                name: 'user',
                description: 'User',
                required: true
            },{
                type: 3,
                name: 'value',
                description: 'Value to be retrieved',
                required: true
            }]
        }
    });

    client.api.applications(client.user.id).commands.post({
        data: {
            name: 'badges',
            description: 'Shows badges',
            options: [{
                type: 6,
                name: 'user',
                description: 'User',
                required: true
            }]
        }
    });

    client.api.applications(client.user.id).commands.post({
        data: {
            name: 'usage',
            description: 'Print usage statistics',
            options: []
        }
    });

    client.ws.on('INTERACTION_CREATE', async (interaction) => {
        const commandId = interaction.data.id;
        const commandName = interaction.data.name;
        
        if (commandName == 'setbadges' || commandName == 'addbadges' ) {
            try {
                let roleId;
                try {
                    roleId = client.guilds.cache.get(interaction.guild_id).roles.cache.find(r => r.name === "badge").id;
                } catch (err) {
                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: { content: 'Server does not appear to have badge role' }
                        }
                    });
                    // console.error(err);
                    return;
                }
                if (!interaction.member.roles.includes(roleId)) {
                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: { content: 'Must have the badge role to set badges' }
                        }
                    });
                    db.data.used++;
                    await db.write();
                    return;
                }
                if (commandName == 'setbadges' || !db.data.badges.hasOwnProperty(interaction.data.options[0].value)) {
                    db.data.badges[interaction.data.options[0].value] = interaction.data.options[1].value;
                    db.data.used++;
                    await db.write();
                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: { content: 'Badges set' }
                        }
                    });
                } else {
                    db.data.badges[interaction.data.options[0].value] += interaction.data.options[1].value;
                    db.data.used++;
                    await db.write();
                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: { content: 'Badges updated' }
                        }
                    });
                }
            } catch (err) {
                console.error(err);
            }
        } else if (commandName == 'badges') {
            try {
                if ((() => {
                    const uid = interaction.data.options[0].value;
                    if (!db.data.badges.hasOwnProperty(uid)) return true;
                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: { content: `${db.data.badges[uid]}` }
                        }
                    });
                    return false;
                })()) {
                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: { content: 'User has no badges' }
                        }
                    });
                }
            } catch (err) {
                console.error(err);
            }
            try {
                db.data.used++;
                await db.write();
            } catch (err) {
                console.error(err);
            }
        } else if (commandName == 'store') {
            try {
                const uid = interaction.member.user.id;
                if (!db.data.users.hasOwnProperty(uid)) db.data.users[uid] = {};
                db.data.users[uid][interaction.data.options[0].value] = interaction.data.options[1].value;
                db.data.used++;
                await db.write();
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: { content: 'Value stored' }
                    }
                });
            } catch (err) {
                console.error(err);
            }
            try {
                db.data.used++;
                await db.write();
            } catch (err) {
                console.error(err);
            }
        } else if (commandName == 'retrieve') {
            try {
                if ((() => {
                    const uid = interaction.data.options[0].value;
                    if (!db.data.users.hasOwnProperty(uid)) return true;
                    if (!db.data.users[uid].hasOwnProperty(interaction.data.options[1].value)) return true;
                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: { content: `${db.data.users[uid][interaction.data.options[1].value]}` }
                        }
                    });
                    return false;
                })()) {
                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: { content: 'Key did not exist for the given user' }
                        }
                    });
                }
            } catch (err) {
                console.error(err);
            }
            try {
                db.data.used++;
                await db.write();
            } catch (err) {
                console.error(err);
            }
        } else if (commandName == 'usage') {
            try {
                let totalValues = 0;
                let userCount = 0;
                Object.values(db.data.users).forEach(u => {
                    totalValues += Object.keys(u).length;
                    userCount++;
                });
                const content = `Used ${db.data.used} times. Storing ${totalValues} values in total for ${userCount} users`;
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: { content }
                    }
                });
            } catch (err) {
                console.error(err);
            }
        }
    });
});

client.login(keys.discord);