const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function testImage() {
    const imagePath = path.join(__dirname, 'img.png');
    
    if (!fs.existsSync(imagePath)) {
        console.error('Image file not found:', imagePath);
        process.exit(1);
    }

    const image = sharp(imagePath);
    const { width, height } = await image.metadata();
    
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const cropSize = 150;
    
    const croppedImagePath = path.join(__dirname, 'test.png');
    
    await image
        .extract({
            left: centerX - cropSize / 2,
            top: centerY - cropSize / 2,
            width: cropSize,
            height: cropSize
        })
        .png()
        .toFile(croppedImagePath);
    
    console.log(`Cropped center 150x150 portion saved as test.png`);
    
    const imageBase64 = fs.readFileSync(croppedImagePath, { encoding: 'base64' });
    
    try {
        console.log('Testing image with OpenAI API...');
        
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

        const result = response.choices[0].message.content;
        console.log('API Response:', result);
        
    } catch (error) {
        console.error('Error processing image:', error);
    }
}

testImage();
