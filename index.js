const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const TARGET_CHANNEL_ID = process.env.CHANNEL_ID;

client.once('ready', () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (TARGET_CHANNEL_ID && message.channel.id !== TARGET_CHANNEL_ID) return;
    
    if (message.webhookId) {
        if (message.embeds.length > 0) {
            for (const embed of message.embeds) {
                if (embed.image && embed.image.url) {
                    console.log(`Embed image detected: ${embed.image.url}`);
                    await handleImage(message, embed.image.url);
                }
            }
        }
    }
});

async function handleImage(message, imageUrl) {
    try {
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        
        const tempPath = path.join(__dirname, 'temp_image.png');
        fs.writeFileSync(tempPath, Buffer.from(imageBuffer));
        
        const imageBufferPng = await sharp(tempPath).png().toBuffer();
        const imageBase64 = imageBufferPng.toString('base64');
        
        const response = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Look at the image and figure out what boss (or activity) the player died at. Reply with a short mocking line in this format: \"Hihi, you died at <boss>\". If you can't confidently identify the boss, use a best guess (e.g. \"some random goblin\") rather than asking questions. Output only that one line."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ],
        });

        const mockResponse = response.choices[0].message.content;
        await message.reply(mockResponse);
        
        console.log(`Sent mock response: ${mockResponse}`);
        
        fs.unlinkSync(tempPath);
    } catch (error) {
        console.error('Error processing image:', error);
        await message.reply("Couldn't roast you this time, my brain is lagging 🤖");
    }
}

client.login(process.env.DISCORD_TOKEN);
