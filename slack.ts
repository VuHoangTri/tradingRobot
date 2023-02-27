import fetch from "node-fetch";

export async function sendChatToBot(icon: string, text: string) {
    // console.log(text);
    let imageUrl = '';
    if (icon === 'bull') {
        imageUrl = 'https://pbs.twimg.com/profile_images/1511962457392050181/Kf0qPySN_400x400.jpg';
    }
    else {
        imageUrl = 'https://logopond.com/logos/9b4155eff794a19dd788f56b42844e78.png';
    }
    const urlBot = 'https://hooks.slack.com/services/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';
    const body =
    {
        "blocks": [
            {
                "type": "section",
                "accessory": {
                    "type": "image",
                    "image_url": imageUrl,
                    "alt_text": icon
                },
                "text": {
                    "type": "mrkdwn",
                    "text": text
                }
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