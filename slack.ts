import fetch from "node-fetch";

export async function sendChatToBot(text: string) {
    const urlBot = 'https://hooks.slack.com/services/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';
    const body = {
        "type": "modal",
        "title": {
            "type": "plain_text",
            "text": "My App",
            "emoji": true
        },
        "blocks": [
            {
                "type": "context",
                "elements": [
                    {
                        "type": "image",
                        "image_url": "https://pbs.twimg.com/profile_images/625633822235693056/lNGUneLX_400x400.jpg",
                        "alt_text": "cute cat"
                    },
                    {
                        "type": "plain_text",
                        "text": text
                    }
                ]
            }
        ]
    };
    await fetch(urlBot,
        {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        })
}