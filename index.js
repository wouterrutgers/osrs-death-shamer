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
        
        const image = sharp(tempPath);
        const { width, height } = await image.metadata();
        
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const cropSize = 150;
        
        const croppedImagePath = path.join(__dirname, 'cropped_temp.png');
        
        await image
            .extract({
                left: centerX - cropSize / 2,
                top: centerY - cropSize / 2,
                width: cropSize,
                height: cropSize
            })
            .png()
            .toFile(croppedImagePath);
        
        const imageBase64 = fs.readFileSync(croppedImagePath, { encoding: 'base64' });
        
        const response = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Sum all integers inside red or green boxes with white text (hitsplats) in the image. Ignore everything else. If none, return 0. Output only the sum as an integer with no extra text."
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
        await message.reply(`-${mockResponse}`);
        
        console.log(`Sent mock response: ${mockResponse}`);
        
        fs.unlinkSync(tempPath);
        fs.unlinkSync(croppedImagePath);
    } catch (error) {
        console.error('Error processing image:', error);
        await message.reply("Couldn't roast you this time, my brain is lagging 🤖");
    }
}

client.login(process.env.DISCORD_TOKEN);
