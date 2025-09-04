const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');

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
        const response = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "You are a witty Old School RuneScape expert who roasts players for their deaths. Analyze this death screenshot and create a unique, savage response (1-2 sentences). Vary your approach: reference specific OSRS mechanics, monsters, locations, or player mistakes you see. Be creative with your insults - use OSRS slang, compare them to noobs, mention their gear/stats, or reference the specific way they died."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl
                            }
                        }
                    ]
                }
            ],
        });

        const mockResponse = response.choices[0].message.content;
        await message.reply(mockResponse);
        
        console.log(`Sent mock response: ${mockResponse}`);
    } catch (error) {
        console.error('Error processing image:', error);
        await message.reply("Couldn't roast you this time, my brain is lagging 🤖");
    }
}

client.login(process.env.DISCORD_TOKEN);
